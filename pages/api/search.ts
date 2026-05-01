import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "../../lib/dbConnect";
import Place from "../../models/Place";
import { serializeDocuments } from "../../utils/serialize";
import { logger } from "../../lib/logger";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { q, veg, page, limit } = req.query;
  const isVegOnly = veg === "true";
  
  let pageNum = parseInt(page as string) || 1;
  let limitNum = parseInt(limit as string) || 10;
  
  // Security: Bound parameters to prevent DoS
  if (pageNum < 1) pageNum = 1;
  if (limitNum < 1) limitNum = 10;
  if (limitNum > 50) limitNum = 50;
  
  const skip = (pageNum - 1) * limitNum;

  logger.debug("Search query received", "searchAPI", { q, veg, page, limit });

  try {
    await dbConnect();

    const fields = "_id place_id name slug geometry hasVeg thumbnail formatted_address rating url";

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
            formatted_address: 1,
            rating: 1,
            url: 1,
            score: { $meta: "searchScore" },
          },
        },
      ]);

      return res.status(200).json(serializeDocuments(results));
    } else {
      // General listing with optional veg filter
      const filter: Record<string, unknown> = {};
      if (isVegOnly) filter.hasVeg = true;

      const results = await Place.find(filter, fields)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

      return res.status(200).json(serializeDocuments(results));
    }
  } catch (error) {
    logger.error("Search API error", "searchAPI", error);
    return res.status(500).json({ message: "Search failed", error: (error as Error).message });
  }
}
