import React from "react";
import Head from "next/head";
import { SITE_LOCALE, SITE_NAME } from "../../config/constants";

interface SeoProps {
  /** Full, already-composed <title>. */
  title: string;
  description: string;
  /** Absolute canonical URL for this page. */
  canonical: string;
  /** Absolute URL of the social preview image. */
  image?: string;
  imageAlt?: string;
  type?: "website" | "article";
  /** Keeps the page out of search results. Used for the admin sync screen. */
  noindex?: boolean;
}

/**
 * Page-level SEO tags.
 *
 * Every tag carries a `key` so that `next/head` de-duplicates against the site-wide
 * defaults in `_app.tsx` — without keys, a page-level description is appended alongside
 * the default rather than replacing it, and search engines see two competing values.
 *
 * The canonical tag is the reason this component exists at all: the site is reachable on
 * more than one origin (the production domain and the Vercel deployment URLs), and
 * previously no page declared which one was authoritative, so indexing could be split
 * across duplicates of every page.
 */
export const Seo: React.FC<SeoProps> = ({
  title,
  description,
  canonical,
  image,
  imageAlt,
  type = "website",
  noindex = false,
}) => (
  <Head>
    <title key="title">{title}</title>
    <meta name="description" content={description} key="description" />
    <link rel="canonical" href={canonical} key="canonical" />

    {noindex ? (
      <meta name="robots" content="noindex, nofollow" key="robots" />
    ) : (
      // `max-image-preview:large` is what allows a thumbnail next to the result, and
      // matters for a photo-led directory. The rest simply removes default limits on
      // snippet and video preview length.
      <meta
        name="robots"
        content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
        key="robots"
      />
    )}

    <meta property="og:title" content={title} key="og:title" />
    <meta property="og:description" content={description} key="og:description" />
    <meta property="og:url" content={canonical} key="og:url" />
    <meta property="og:type" content={type} key="og:type" />
    <meta property="og:site_name" content={SITE_NAME} key="og:site_name" />
    <meta property="og:locale" content={SITE_LOCALE} key="og:locale" />

    <meta
      name="twitter:card"
      content={image ? "summary_large_image" : "summary"}
      key="twitter:card"
    />
    <meta name="twitter:title" content={title} key="twitter:title" />
    <meta name="twitter:description" content={description} key="twitter:description" />

    {image && (
      <>
        <meta property="og:image" content={image} key="og:image" />
        <meta property="og:image:alt" content={imageAlt || title} key="og:image:alt" />
        <meta name="twitter:image" content={image} key="twitter:image" />
        <meta name="twitter:image:alt" content={imageAlt || title} key="twitter:image:alt" />
      </>
    )}
  </Head>
);
