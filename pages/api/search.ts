import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "../../lib/dbConnect";
import Place from "../../models/Place";
import { serializeDocuments } from "../../utils/serialize";
import { logger } from "../../lib/logger";
import { PAGE_SIZE } from "../../config/constants";
import { LIST_PROJECTION } from "../../services/placeService";
import { rateLimit, getClientKey } from "../../lib/rateLimit";

/**
 * Per-IP budget for the public search endpoint.
 *
 * Generous relative to real use (a debounced search is one request, and infinite scroll
 * adds one per page), but it caps the one endpoint an anonymous caller can drive. With
 * coordinates present the query is an unindexed aggregation that scans every place and
 * sorts in memory, so unbounded concurrency is the realistic availability risk here.
 *
 * Same caveat as lib/rateLimit.ts: this is per-instance and best-effort on serverless.
 */
const SEARCH_LIMIT = 60;
const SEARCH_WINDOW_MS = 60_000;

/** Highest page a caller may request. See the bounding comment in the handler. */
const MAX_PAGE = 1000;

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
  //
  // `page` is capped as well as floored. A large `$skip` still requires the stages before
  // it to run in full, so an unbounded page number is a free way to make the caller pay
  // nothing and the database pay for a whole scan-and-sort. 1000 pages is far beyond any
  // reachable position in a feed of a few hundred places.
  if (pageNum < 1) pageNum = 1;
  if (pageNum > MAX_PAGE) pageNum = MAX_PAGE;
  if (limitNum < 1) limitNum = PAGE_SIZE;
  if (limitNum > 50) limitNum = 50;

  const skip = (pageNum - 1) * limitNum;

  logger.debug("Search query received", "searchAPI", { q, veg, page, limit, lat, lng });

  try {
    await dbConnect();

    if (q && typeof q === "string") {
      const must: Record<string, unknown>[] = [
        {
          text: {
            query: q,
            path: ["name", "formatted_address", "searchContent"],
            fuzzy: { maxEdits: 1, prefixLength: 2 },
          },
        },
      ];

      /**
       * The veg filter is applied as a `$match` after `$search`, not as a `compound.filter`
       * inside it.
       *
       * The in-search version used `equals` on `hasVeg`, which silently matched nothing:
       * `q=dosa` returns 50 places of which 48 are veg, while `q=dosa&veg=true` returned 0.
       * `equals` requires the path to be indexed with an explicit boolean type in the Atlas
       * Search index definition, which "default" does not do, and an unindexed path yields
       * no hits rather than an error. Filtering in the aggregation instead is correct
       * whatever the index mapping happens to be, and the collection is small enough that
       * post-filtering a relevance-ordered result set costs nothing noticeable.
       *
       * The no-query branch below was never affected: it filters with a plain `$match`.
       */
      const results = await Place.aggregate([
        {
          $search: {
            index: "default",
            compound: { must },
          },
        },
        ...(isVegOnly ? [{ $match: { hasVeg: true } }] : []),
        { $skip: skip },
        { $limit: limitNum },
        {
          $project: {
            ...LIST_PROJECTION,
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
        // requires creating the index on the cluster first; see README.
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
          // Project BEFORE sorting, not after.
          //
          // `$sort` is a blocking stage: it holds every matched document in memory, and
          // without `allowDiskUse` it fails outright past 100 MB. Sorting whole documents
          // meant carrying `searchContent` (10 KB each) and, for any place the blob
          // backfill has not reached, `placePhotoBase64` (~255 KB each) through the sort.
          // A few hundred unmigrated places is enough to blow the limit and take down the
          // one query every located visitor makes.
          { $project: { ...LIST_PROJECTION, displacement: 1 } },
          // `_id` breaks ties. `displacement` is not unique, and each page is a separate
          // query, so without a deterministic tiebreaker MongoDB may order equidistant
          // places differently between page 1 and page 2, which shows up as a place
          // appearing twice in the feed (and a duplicate React key) or being skipped.
          { $sort: { displacement: 1, _id: 1 } },
          { $skip: skip },
          { $limit: limitNum },
          // Drop the sort key now that the page is resolved, so the response shape matches
          // the other branches. Only `limitNum` documents reach this stage.
          { $project: LIST_PROJECTION }
        ]);
      } else {
        // `_id` breaks ties here too: restaurant names are not unique (chains), so paging
        // an ambiguous `name` ordering can repeat or drop rows.
        results = await Place.find(filter, LIST_PROJECTION)
          .sort({ name: 1, _id: 1 })
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
