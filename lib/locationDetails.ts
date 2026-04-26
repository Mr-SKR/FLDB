import getUrls from "get-urls";
import tracer from "trace-redirect";
import { Client } from "@googlemaps/google-maps-services-js";
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
  let locationDetails: any = {};
  let locationURLParams: any = {};
  let hasValidLocationParams = false;
  
  const googleMapsKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!googleMapsKey) {
    console.error("GOOGLE_MAPS_API_KEY is not defined");
    return {};
  }

  const urls = Array.from(getUrls(String(description)));
  
  for (let url of urls) {
    if (isValidUrl(url)) {
      let tracerResult = "",
        matches;

      if (Object.prototype.hasOwnProperty.call(syncConfig.replaceLinks, url)) {
        url = (syncConfig.replaceLinks as any)[url];
      }

      if (url.includes("maps")) {
        try {
          tracerResult = await tracer(url);
          matches = Array.from(tracerResult.matchAll(new RegExp("0[xX][0-9a-fA-F]+", "g")));
          const hexLattitude = matches[0]?.[0];
          const hexLongitude = matches[1]?.[0];
          
          if (hexLattitude && hexLongitude) {
            locationURLParams = {
              ftid: `${hexLattitude}:${hexLongitude}`,
              fields: [
                "business_status",
                "formatted_address",
                "name",
                "geometry",
                "international_phone_number",
                "place_id",
                "rating",
                "url",
                "opening_hours",
              ],
              key: googleMapsKey,
            };
            hasValidLocationParams = true;
            break;
          }
        } catch (e) {
          console.error(`Error tracing redirect for ${url}:`, e);
        }
      } else if (url.includes("g.page")) {
        try {
          tracerResult = await tracer(url);
          if (tracerResult.includes("ludocid")) {
            const ludocidMatch = tracerResult.match(/ludocid=([0-9]+)/);
            if (ludocidMatch && ludocidMatch[1]) {
              const cid = ludocidMatch[1];
              locationURLParams = {
                cid: cid,
                fields: [
                  "business_status",
                  "formatted_address",
                  "name",
                  "geometry",
                  "international_phone_number",
                  "place_id",
                  "rating",
                  "url",
                  "opening_hours",
                ],
                key: googleMapsKey,
              };
              hasValidLocationParams = true;
              break;
            }
          }
        } catch (e) {
          console.error(`Error tracing redirect for ${url}:`, e);
        }
      }
    }
  }

  if (hasValidLocationParams) {
    try {
      const response = await googleMapsClient.placeDetails({
        params: {
          ...locationURLParams,
        },
      });
      locationDetails = response.data.result;
    } catch (err: any) {
      if (err.response?.data?.error_message) {
        console.error("Google Maps API Error:", err.response.data.status, "-", err.response.data.error_message);
      } else {
        console.error("Error fetching place details from Google Maps API:", err.message);
      }
    }
  }

  return locationDetails;
};
