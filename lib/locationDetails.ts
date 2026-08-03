import getUrls from "get-urls";
import tracer from "trace-redirect";
import { Client, PlaceData, PlaceInputType, PlaceDetailsRequest } from "@googlemaps/google-maps-services-js";
import { syncConfig } from "../config/syncConfig";
import { env } from "./env";
import { logger } from "./logger";

const googleMapsClient = new Client({});

const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const fetchLocationDetails = async (description: string) => {
  const allLocationDetails: Partial<PlaceData>[] = [];
  
  const googleMapsKey = env.GOOGLE_MAPS_API_KEY;

  const urls = Array.from(getUrls(String(description)));
  const fields = [
    "business_status",
    "formatted_address",
    "name",
    "geometry",
    "international_phone_number",
    "place_id",
    "rating",
    // Same Atmosphere billing tier as `rating`, which is already requested, so this costs
    // nothing extra. Needed to emit a valid schema.org AggregateRating.
    "user_ratings_total",
    "url",
    "opening_hours",
    "photos",
  ];
  
  for (let url of urls) {
    if (isValidUrl(url)) {
      // 1. Extract target URL from YouTube redirects
      if (url.includes("youtube.com/redirect")) {
        try {
          const parsedUrl = new URL(url);
          const q = parsedUrl.searchParams.get("q");
          if (q && isValidUrl(q)) {
            logger.debug(`Extracting target from YouTube redirect: ${q}`, "locationDetails");
            url = q;
          }
        } catch {
          logger.warn(`Failed to parse YouTube redirect URL: ${url}`, "locationDetails");
        }
      }

      const replaceLinks = syncConfig.replaceLinks as Record<string, string>;
      if (Object.prototype.hasOwnProperty.call(replaceLinks, url)) {
        url = replaceLinks[url];
      }

      // Check for various Google Maps and Search link patterns
      if (/(maps|g\.page|g\.co|goo\.gl|google\.com\/search)/.test(url)) {
        try {
          logger.debug(`Tracing URL: ${url}`, "locationDetails");
          const tracerResult = await tracer(url);
          logger.debug(`Resolved to: ${tracerResult}`, "locationDetails");
          
          let locationURLParams: { ftid?: string; cid?: string; place_id?: string } | null = null;

          const parsedTracerUrl = new URL(tracerResult);

          // 1. Try to extract FTID (0x...:0x...)
          // Prefer FTID that follows !1s marker (primary feature ID)
          const preferredFtidMatch = tracerResult.match(/!1s(0x[0-9a-f]+:0x[0-9a-f]+)/i);
          const anyFtidMatch = tracerResult.match(/0x[0-9a-f]+:0x[0-9a-f]+/i);
          
          if (preferredFtidMatch) {
            locationURLParams = { ftid: preferredFtidMatch[1] };
          } else if (anyFtidMatch) {
            locationURLParams = { ftid: anyFtidMatch[0] };
          }
          // 2. Try to extract CID (ludocid or cid)
          else {
            const cid = parsedTracerUrl.searchParams.get("ludocid") || parsedTracerUrl.searchParams.get("cid");
            if (cid && /^[0-9]+$/.test(cid)) {
              locationURLParams = { cid };
            }
          }

          // 3. Pick the text to fall back on if the id-based lookup yields nothing.
          //
          // `q` wins over `kgmid` deliberately. `q` is a human search string (a name, an
          // address, or coordinates), which is what findPlaceFromText actually takes. A
          // `kgmid` is a Knowledge Graph id (`/g/11abc…`), a poor text query and only worth
          // trying when there is nothing better. The precedence used to fall out of the
          // order of two separate assignments rather than being stated.
          const qParam = parsedTracerUrl.searchParams.get("q");
          const kgmid = locationURLParams ? null : parsedTracerUrl.searchParams.get("kgmid");
          const searchFallback = qParam || kgmid;

          let resolvedPlace: Partial<PlaceData> | null = null;

          if (locationURLParams) {
            logger.debug(`Calling Place Details with params`, "locationDetails", { locationURLParams });
            const response = await googleMapsClient.placeDetails({
              params: {
                ...locationURLParams,
                fields,
                key: googleMapsKey,
              } as PlaceDetailsRequest["params"] & { ftid?: string; cid?: string },
            });
            
            const result = response.data.result;
            if (result && result.name && result.name !== "0") {
              resolvedPlace = result;
            } else {
              logger.warn(`Place Details returned invalid result (name: ${result?.name}). Trying fallback.`, "locationDetails");
            }
          } 
          
          // 4. Fallback: Search by name or coordinates
          if (!resolvedPlace) {
            let searchInput = searchFallback;
            
            // If no q param, try to extract name from path /maps/place/Name
            if (!searchInput && tracerResult.includes("/maps/place/")) {
              const nameMatch = tracerResult.match(/\/maps\/place\/([^/]+)/);
              if (nameMatch) {
                searchInput = decodeURIComponent(nameMatch[1].replace(/\+/g, " "));
              }
            }

            if (searchInput) {
              logger.debug(`Falling back to search by text: ${searchInput}`, "locationDetails");
              const findResponse = await googleMapsClient.findPlaceFromText({
                params: {
                  input: searchInput,
                  inputtype: PlaceInputType.textQuery,
                  fields: ["place_id"],
                  key: googleMapsKey,
                }
              });
              
              const placeId = findResponse.data.candidates?.[0]?.place_id;
              if (placeId) {
                const detailResponse = await googleMapsClient.placeDetails({
                  params: {
                    place_id: placeId,
                    fields,
                    key: googleMapsKey,
                  }
                });
                if (detailResponse.data.result) {
                  resolvedPlace = detailResponse.data.result;
                }
              }
            }
          }

          if (resolvedPlace) {
            allLocationDetails.push(resolvedPlace);
          } else {
            logger.warn(`Could not resolve location from URL: ${tracerResult}`, "locationDetails");
          }
        } catch (e: unknown) {
          logger.error(`Error processing Google Maps URL ${url}`, "locationDetails", e);
          
          // Type-safe way to check for specific error status codes from the Google Maps client/axios
          if (typeof e === 'object' && e !== null && 'response' in e) {
            const response = (e as { response: { status: number } }).response;
            if (response && (response.status === 429 || response.status === 403)) {
              throw e;
            }
          }
        }
      }
    }
  }

  return allLocationDetails;
};
