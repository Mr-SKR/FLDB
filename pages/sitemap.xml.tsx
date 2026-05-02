import type { NextApiResponse } from "next";
import { getAllPlaceSlugs } from "../services/placeService";

const Sitemap = () => {
  return null;
};

export const getServerSideProps = async ({ res }: { res: NextApiResponse }) => {
  const BASE_URL = process.env.HOST || "https://foodloversdatabase.com";

  // Static pages get lower priority
  const staticPaths = ["", "about"].map((staticPagePath) => {
    return {
      url: `${BASE_URL}/${staticPagePath}`,
      priority: "0.5",
      changefreq: "monthly",
      lastmod: new Date().toISOString(),
    };
  });

  const places = await getAllPlaceSlugs();

  // Dynamic place pages get high priority (1.0)
  const dynamicPaths = places.map(({ slug, updatedAt }) => {
    return {
      url: `${BASE_URL}/place/${slug}`,
      priority: "1.0",
      changefreq: "weekly",
      lastmod: updatedAt,
    };
  });

  const allPaths = [...staticPaths, ...dynamicPaths];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${allPaths
        .map(({ url, priority, changefreq, lastmod }) => {
          return `
            <url>
              <loc>${url}</loc>
              <lastmod>${lastmod}</lastmod>
              <changefreq>${changefreq}</changefreq>
              <priority>${priority}</priority>
            </url>
          `;
        })
        .join("")}
    </urlset>`;

  // Edge caching for 24 hours (86400s), stale-while-revalidate for 12 hours (43200s)
  res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=43200");
  res.setHeader("Content-Type", "text/xml");
  res.write(sitemap);
  res.end();

  return {
    props: {},
  };
};

export default Sitemap;
