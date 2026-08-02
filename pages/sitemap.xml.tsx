import type { NextApiResponse } from "next";
import { getAllPlaceSlugs } from "../services/placeService";
import { SITE_URL } from "../config/constants";

const Sitemap = () => {
  return null;
};

/**
 * Slugs are already stripped of non-word characters, so this is belt-and-braces — but an
 * unescaped `&` anywhere in a URL makes the whole sitemap invalid XML, and a sitemap that
 * fails to parse is silently dropped in its entirety rather than partially accepted.
 */
const escapeXml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export const getServerSideProps = async ({ res }: { res: NextApiResponse }) => {
  const BASE_URL = process.env.HOST || SITE_URL;

  const places = await getAllPlaceSlugs();

  /**
   * The home page's freshness genuinely tracks the newest place data, so it reports the
   * most recent place update. `/about` is hand-written prose that changes only when the
   * copy does, so it reports nothing at all.
   *
   * Neither previously did: both sent `new Date()` on every request, telling crawlers the
   * pages had just changed every single time they were fetched. A `lastmod` that is always
   * "now" is not a freshness signal, it is noise, and Google discounts the field entirely
   * once it proves unreliable.
   */
  const latestPlaceUpdate = places.reduce<string | undefined>(
    (latest, place) => (!latest || place.updatedAt > latest ? place.updatedAt : latest),
    undefined
  );

  const staticPaths = [
    {
      url: `${BASE_URL}/`,
      priority: "1.0",
      changefreq: "daily",
      lastmod: latestPlaceUpdate,
    },
    {
      url: `${BASE_URL}/about`,
      priority: "0.3",
      changefreq: "yearly",
      lastmod: undefined,
    },
  ];

  // Place pages are the substance of the site, but priority is *relative* within a
  // sitemap — marking all 600+ of them 1.0 alongside the home page said nothing at all.
  const dynamicPaths = places.map(({ slug, updatedAt }) => {
    return {
      url: `${BASE_URL}/place/${slug}`,
      priority: "0.8",
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
              <loc>${escapeXml(url)}</loc>${lastmod ? `
              <lastmod>${lastmod}</lastmod>` : ""}
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
