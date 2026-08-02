import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "../../lib/dbConnect";
import Place from "../../models/Place";
import { serializeDocuments } from "../../utils/serialize";
import { logger } from "../../lib/logger";
import { PAGE_SIZE } from "../../config/constants";
import { rateLimit, getClientKey } from "../../lib/rateLimit";

/**
 * Per-IP budget for the public search endpoint.
 *
 * Generous relative to real use — a debounced search is one request, and infinite scroll
 * adds one per page — but it caps the one endpoint an anonymous caller can drive. With
 * coordinates present the query is an unindexed aggregation that scans every place and
 * sorts in memory, so unbounded concurrency is the realistic availability risk here.
 *
 * Same caveat as lib/rateLimit.ts: this is per-instance and best-effort on serverless.
 */
const SEARCH_LIMIT = 60;
const SEARCH_WINDOW_MS = 60_000;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const clientKey = getClientKey(req);
  const limited = rateLimit(`search:${clientKey}`, SEARCH_LIMIT, SEARCH_WINDOW_MS);
  if (!limited.allowed) {
    logger.warn("Rate limit exceeded on search API", "searchAPI", { ip: clientKey });
    res.setHeader("Retry-After", String(limited.retryAfterSeconds));
    return res.status(429).json({ message: "Too many requests" });
  }

  const { q, veg, page, limit, lat, lng } = req.query;
  const isVegOnly = veg === "true";
  
  let pageNum = parseInt(page as string) || 1;
  let limitNum = parseInt(limit as string) || PAGE_SIZE;

  // Parse coordinates without treating a legitimate 0 as "absent".
  const latNum = typeof lat === "string" ? parseFloat(lat) : NaN;
  const lngNum = typeof lng === "string" ? parseFloat(lng) : NaN;
  const hasCoords =
    Number.isFinite(latNum) &&
    Number.isFinite(lngNum) &&
    Math.abs(latNum) <= 90 &&
    Math.abs(lngNum) <= 180;

  // Security: Bound parameters to prevent DoS
  if (pageNum < 1) pageNum = 1;
  if (limitNum < 1) limitNum = PAGE_SIZE;
  if (limitNum > 50) limitNum = 50;
  
  const skip = (pageNum - 1) * limitNum;

  logger.debug("Search query received", "searchAPI", { q, veg, page, limit, lat, lng });

  try {
    await dbConnect();

    const fields = {
      _id: 1,
      place_id: 1,
      name: 1,
      slug: 1,
      geometry: 1,
      hasVeg: 1,
      thumbnail: 1,
      allThumbnails: 1,
      formatted_address: 1,
      rating: 1,
      url: 1,
      photoUrl: 1,
      photoUpdatedAt: 1,
      photoAttribution: 1
    };

    if (q && typeof q === "string") {
      // ... existing search logic ...
      const must: Record<string, unknown>[] = [
        {
          text: {
            query: q,
            path: ["name", "formatted_address", "searchContent"],
            fuzzy: { maxEdits: 1, prefixLength: 2 },
          },
        },
      ];

      const compound: Record<string, unknown> = { must };

      if (isVegOnly) {
        compound.filter = [
          {
            equals: {
              value: true,
              path: "hasVeg",
            },
          },
        ];
      }

      const results = await Place.aggregate([
        {
          $search: {
            index: "default",
            compound,
          },
        },
        { $skip: skip },
        { $limit: limitNum },
        {
          $project: {
            _id: 1,
            place_id: 1,
            name: 1,
            slug: 1,
            geometry: 1,
            hasVeg: 1,
            thumbnail: 1,
            allThumbnails: 1,
            formatted_address: 1,
            rating: 1,
            url: 1,
            photoUrl: 1,
            photoUpdatedAt: 1,
            photoAttribution: 1,
            score: { $meta: "searchScore" },
          },
        },
      ]);

      return res.status(200).json(serializeDocuments(results));
    } else {
      // General listing with optional veg filter
      const filter: Record<string, unknown> = {};
      if (isVegOnly) filter.hasVeg = true;

      let results;
      if (hasCoords) {
        // Approximate planar distance, good enough for ranking nearby results.
        //
        // A degree of longitude is shorter than a degree of latitude by cos(latitude), so
        // comparing raw degree deltas overweights longitude (~3% at Bengaluru's latitude)
        // and can rank results differently from the Haversine distance the client shows.
        // Scaling by cos(latitude) keeps server ordering consistent with the displayed km.
        //
        // The proper fix is a `2dsphere` index on `geometry.location` plus a `$geoNear`
        // stage, which would also make this indexed rather than a collection scan. That
        // requires creating the index on the cluster first — see README.
        const lngScale = Math.cos((latNum * Math.PI) / 180);

        results = await Place.aggregate([
          { $match: filter },
          {
            $addFields: {
              displacement: {
                $sqrt: {
                  $add: [
                    { $pow: [{ $subtract: ["$geometry.location.lat", latNum] }, 2] },
                    {
                      $pow: [
                        {
                          $multiply: [
                            { $subtract: ["$geometry.location.lng", lngNum] },
                            lngScale
                          ]
                        },
                        2
                      ]
                    }
                  ]
                }
              }
            }
          },
          { $sort: { displacement: 1 } },
          { $skip: skip },
          { $limit: limitNum },
          { $project: fields }
        ]);
      } else {
        results = await Place.find(filter, fields)
          .sort({ name: 1 })
          .skip(skip)
          .limit(limitNum)
          .lean();
      }

      return res.status(200).json(serializeDocuments(results));
    }
  } catch (error) {
    // Log the detail; never return driver/internal messages to the caller.
    logger.error("Search API error", "searchAPI", error);
    return res.status(500).json({ message: "Search failed" });
  }
}
