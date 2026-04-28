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

  const { q, veg } = req.query;
  const isVegOnly = veg === "true";

  if (!q || typeof q !== "string") {
    return res.status(400).json({ message: "Query parameter 'q' is required" });
  }

  try {
    await dbConnect();

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
      { $limit: 20 },
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
          score: { $meta: "searchScore" },
        },
      },
    ]);

    return res.status(200).json(serializeDocuments(results));
  } catch (error) {
    console.error("Search API error:", error);
    return res.status(500).json({ message: "Search failed", error: (error as Error).message });
  }
}
