import getUrls from "get-urls";
import tracer from "trace-redirect";
import { Client, PlaceData, PlaceInputType, PlaceDetailsRequest } from "@googlemaps/google-maps-services-js";
import { syncConfig } from "../config/syncConfig";

const googleMapsClient = new Client({});

const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
};

export const fetchLocationDetails = async (description: string) => {
  const allLocationDetails: Partial<PlaceData>[] = [];
  
  const googleMapsKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!googleMapsKey) {
    console.error("GOOGLE_MAPS_API_KEY is not defined");
    return [];
  }

  const urls = Array.from(getUrls(String(description)));
  const fields = [
    "business_status",
    "formatted_address",
    "name",
    "geometry",
    "international_phone_number",
    "place_id",
    "rating",
    "url",
    "opening_hours",
  ];
  
  for (let url of urls) {
    if (isValidUrl(url)) {
      // 1. Extract target URL from YouTube redirects
      if (url.includes("youtube.com/redirect")) {
        try {
          const parsedUrl = new URL(url);
          const q = parsedUrl.searchParams.get("q");
          if (q && isValidUrl(q)) {
            console.log(`[Sync] Extracting target from YouTube redirect: ${q}`);
            url = q;
          }
        } catch (e) {
          console.warn(`[Sync] Failed to parse YouTube redirect URL: ${url}`);
        }
      }

      const replaceLinks = syncConfig.replaceLinks as Record<string, string>;
      if (Object.prototype.hasOwnProperty.call(replaceLinks, url)) {
        url = replaceLinks[url];
      }

      // Check for various Google Maps link patterns
      if (/(maps|g\.page|g\.co|goo\.gl)/.test(url)) {
        try {
          console.log(`[Sync] Tracing URL: ${url}`);
          const tracerResult = await tracer(url);
          console.log(`[Sync] Resolved to: ${tracerResult}`);
          
          let locationURLParams: { ftid?: string; cid?: string } | null = null;

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
            const cidMatch = tracerResult.match(/(?:ludocid|cid)=([0-9]+)/);
            if (cidMatch) {
              locationURLParams = { cid: cidMatch[1] };
            }
          }

          let resolvedPlace: Partial<PlaceData> | null = null;

          if (locationURLParams) {
            console.log(`[Sync] Calling Place Details with params:`, locationURLParams);
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
              console.warn(`[Sync] Place Details returned invalid result (name: ${result?.name}). Trying fallback.`);
            }
          } 
          
          // 3. Fallback: Search by name if FTID/CID failed or returned invalid data
          if (!resolvedPlace && tracerResult.includes("/maps/place/")) {
            const nameMatch = tracerResult.match(/\/maps\/place\/([^/]+)/);
            if (nameMatch) {
              const decodedName = decodeURIComponent(nameMatch[1].replace(/\+/g, " "));
              console.log(`[Sync] Falling back to search by name: ${decodedName}`);
              const findResponse = await googleMapsClient.findPlaceFromText({
                params: {
                  input: decodedName,
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
            console.warn(`[Sync] Could not resolve location from URL: ${tracerResult}`);
          }
        } catch (e) {
          console.error(`Error processing Google Maps URL ${url}:`, e);
        }
      }
    }
  }

  return allLocationDetails;
};
