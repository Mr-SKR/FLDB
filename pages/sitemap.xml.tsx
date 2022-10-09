import type { NextApiResponse } from "next";

import { getAllVideoIds } from "../utils/video";

const Sitemap = () => {
  return null;
  //   return <></>;
};

export const getServerSideProps = async ({ res }: { res: NextApiResponse }) => {
  const BASE_URL = process.env.HOST;

  const staticPaths = ["", "about"].map((staticPagePath) => {
    return `${BASE_URL}/${staticPagePath}`;
  });

  const products = await getAllVideoIds();

  const dynamicPaths = products.map((singleProduct) => {
    return `${BASE_URL}/fldb/${singleProduct}`;
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
