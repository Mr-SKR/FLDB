import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "../../lib/dbConnect";
import Place from "../../models/Place";
import { serializeDocuments } from "../../utils/serialize";
import { logger } from "../../lib/logger";
import {
  DEFAULT_SORT_MODE,
  isSortMode,
  PAGE_SIZE,
  SortMode,
} from "../../config/constants";
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

/**
 * Displacement assigned to a place with no stored coordinates, so it sorts last.
 *
 * Any value above the largest real result works: the pipeline measures in degrees, and the
 * furthest two points on Earth are under 500 of them. This is the server-side counterpart
 * to the `Infinity` the client uses in `hooks/usePlaceFilters.ts`, and it is a finite number
 * only because it has to survive BSON.
 */
const UNLOCATED_DISPLACEMENT = 1e9;

/**
 * Reads the requested ordering, defaulting anything unrecognised.
 *
 * `nearest` needs coordinates and silently degrades to `name` without them, which is what
 * the control in the UI says it does. Every ordering carries `_id` as a final tiebreaker:
 * none of these keys is unique, each page is a separate query, and without a deterministic
 * tie-break MongoDB may order equal values differently between page 1 and page 2, which
 * surfaces as a place appearing twice in the feed or being skipped entirely.
 */
const parseSort = (value: unknown): SortMode =>
  isSortMode(value) ? value : DEFAULT_SORT_MODE;

/**
 * Reads the number out of a `$count` result.
 *
 * The stage emits `[{ total: n }]`, and nothing at all when the pipeline matched nothing,
 * so an empty array means zero rather than unknown. `null` is reserved for "not asked for",
 * which the client uses to keep the total it already had rather than blanking the label
 * while paging.
 */
const countOf = (result: { total?: number }[] | null): number | null => {
  if (result === null) return null;
  return result[0]?.total ?? 0;
};

/**
 * Minimum rating, clamped to the range Google itself uses.
 *
 * Anything outside 0-5 is treated as no filter rather than rejected: this is a browsing
 * control, and an odd query string should show everything rather than an error.
 */
const parseMinRating = (value: unknown): number => {
  const parsed = typeof value === "string" ? parseFloat(value) : NaN;
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 5) return 0;
  return parsed;
};

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

  const { q, veg, page, limit, lat, lng, sort, minRating } = req.query;
  const isVegOnly = veg === "true";
  const sortMode = parseSort(sort);
  const minRatingValue = parseMinRating(minRating);

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

  logger.debug("Search query received", "searchAPI", {
    q,
    veg,
    page,
    limit,
    lat,
    lng,
    sort: sortMode,
    minRating: minRatingValue,
  });

  /** Post-`$search` and plain-find filters that are not the text query itself. */
  const attributeFilter: Record<string, unknown> = {};
  if (isVegOnly) attributeFilter.hasVeg = true;
  if (minRatingValue > 0) attributeFilter.rating = { $gte: minRatingValue };
  const hasAttributeFilter = Object.keys(attributeFilter).length > 0;

  /** Sort stage for everything except relevance ordering and distance ordering. */
  const sortStage: Record<string, 1 | -1> | null =
    sortMode === "rating"
      ? // Ties on the score are broken by how many people gave it: 4.5 from 900 people is a
        // stronger result than 4.5 from three, and showing the latter first reads as noise.
        { rating: -1, user_ratings_total: -1, _id: 1 }
      : sortMode === "name"
        ? { name: 1, _id: 1 }
        : null;

  /**
   * How many places match, as opposed to how many are on this page.
   *
   * Only counted for page 1. Every filter change refetches page 1, so that is exactly when
   * the number can have moved; paging appends to a result set whose size is already known,
   * and re-counting on every scroll would double the query load on the one endpoint an
   * anonymous caller can drive for nothing gained.
   */
  const wantsTotal = pageNum === 1;

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
      const searchStage = {
        $search: {
          index: "default",
          compound: { must },
        },
      };
      const filterStages = hasAttributeFilter ? [{ $match: attributeFilter }] : [];

      const [results, total] = await Promise.all([
        Place.aggregate([
          searchStage,
          ...filterStages,
          // Projected before any re-sort, for the same memory reason spelled out in the
          // distance branch below: `$sort` is blocking, and sorting whole documents drags
          // `searchContent` and any un-migrated `placePhotoBase64` through it.
          {
            $project: {
              ...LIST_PROJECTION,
              score: { $meta: "searchScore" },
            },
          },
          // No stage at all for the default ordering: `$search` already emits documents in
          // relevance order, which is the right answer to a text query and the one a sort
          // would throw away.
          ...(sortStage ? [{ $sort: sortStage }] : []),
          { $skip: skip },
          { $limit: limitNum },
        ]),
        // Counted through the same `$search` and `$match`, so it answers "how many match
        // this query" rather than "how many exist". No projection or sort: `$count`
        // consumes only the document stream's length.
        wantsTotal
          ? Place.aggregate([searchStage, ...filterStages, { $count: "total" }])
          : Promise.resolve(null),
      ]);

      return res.status(200).json({
        data: serializeDocuments(results),
        total: countOf(total),
      });
    } else {
      // General listing with the attribute filters applied directly.
      const filter = attributeFilter;

      let results;
      // `nearest` is the only ordering that needs the geo pipeline. Asking for top-rated or
      // A-to-Z while located should honour that request, not quietly re-sort by distance.
      if (hasCoords && sortMode === DEFAULT_SORT_MODE) {
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
              /*
                A place with no stored coordinates makes every arithmetic stage below
                resolve to null, and MongoDB sorts null *before* all numbers ascending. Such
                places therefore headed the nearest-first feed, taking page-one slots from
                the genuinely close ones. The client re-sorts what it has been given
                (`hooks/usePlaceFilters.ts` maps a missing position to `Infinity`), so the
                symptom was not a visibly wrong order but nearby restaurants silently
                displaced onto page two.

                Coerced to a sentinel rather than removed with a `$match`: the `total` below
                is a `countDocuments` over `filter` alone, so filtering here would report
                more matches than the pipeline can ever return and leave the feed paging
                towards results that do not exist.
              */
              displacement: {
                $ifNull: [
                  {
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
                  },
                  UNLOCATED_DISPLACEMENT
                ]
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
        // an ambiguous `name` ordering can repeat or drop rows. `nearest` lands here when
        // the caller sent no coordinates, and A-to-Z is the honest fallback for it.
        results = await Place.find(filter, LIST_PROJECTION)
          .sort(sortStage ?? { name: 1, _id: 1 })
          .skip(skip)
          .limit(limitNum)
          .lean();
      }

      // A plain `countDocuments` on the same filter. Both branches above narrow with
      // exactly this filter and differ only in ordering, so one count answers for both.
      const total = wantsTotal ? await Place.countDocuments(filter) : null;

      return res.status(200).json({ data: serializeDocuments(results), total });
    }
  } catch (error) {
    // Log the detail; never return driver/internal messages to the caller.
    logger.error("Search API error", "searchAPI", error);
    return res.status(500).json({ message: "Search failed" });
  }
}
