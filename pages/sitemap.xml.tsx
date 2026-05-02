import type { NextApiResponse } from "next";

import { getAllPlaceSlugs } from "../services/placeService";

const Sitemap = () => {
  return null;
};

export const getServerSideProps = async ({ res }: { res: NextApiResponse }) => {
  const BASE_URL = process.env.HOST || "https://foodloversdatabase.com";

  const staticPaths = ["", "about"].map((staticPagePath) => {
    return `${BASE_URL}/${staticPagePath}`;
  });

  const slugs = await getAllPlaceSlugs();

  const dynamicPaths = slugs.map((slug) => {
    return `${BASE_URL}/place/${slug}`;
  });

  const allPaths = [...staticPaths, ...dynamicPaths];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${allPaths
        .map((url) => {
          return `
            <url>
              <loc>${url}</loc>
              <lastmod>${new Date().toISOString()}</lastmod>
              <changefreq>monthly</changefreq>
              <priority>1.0</priority>
            </url>
          `;
        })
        .join("")}
    </urlset>`;

  res.setHeader("Content-Type", "text/xml");
  res.write(sitemap);
  res.end();

  return {
    props: {},
  };
};

export default Sitemap;
