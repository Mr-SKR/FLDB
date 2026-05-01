import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "../../lib/dbConnect";
import Place from "../../models/Place";
import { serializeDocuments } from "../../utils/serialize";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { q, veg, page, limit } = req.query;
  const isVegOnly = veg === "true";
  const pageNum = parseInt(page as string) || 1;
  const limitNum = parseInt(limit as string) || 10;
  const skip = (pageNum - 1) * limitNum;

  try {
    await dbConnect();

    const fields = "_id place_id name slug geometry hasVeg thumbnail formatted_address rating url";

    if (q && typeof q === "string") {
      const searchStage: any = {
        $search: {
          index: "default",
          compound: {
            must: [
              {
                text: {
                  query: q,
                  path: ["name", "formatted_address", "searchContent"],
                  fuzzy: { maxEdits: 1, prefixLength: 2 },
                },
              },
            ],
          },
        },
      };

      if (isVegOnly) {
        searchStage.$search.compound.filter = [
          {
            equals: {
              value: true,
              path: "hasVeg",
            },
          },
        ];
      }

      const results = await Place.aggregate([
        searchStage,
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
      const filter: any = {};
      if (isVegOnly) filter.hasVeg = true;

      const results = await Place.find(filter, fields)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

      return res.status(200).json(serializeDocuments(results));
    }
  } catch (error) {
    console.error("Search API error:", error);
    return res.status(500).json({ message: "Search failed", error: (error as Error).message });
  }
}
