import React from "react";
import { MessagePage } from "../components/ui/MessagePage";
import { Seo } from "../components/seo/Seo";
import { absoluteUrl, getSiteUrl } from "../lib/seo";
import { SITE_SHORT_NAME } from "../config/constants";

interface ServerErrorProps {
  canonical: string;
}

/**
 * The page a server-side failure lands on.
 *
 * A static `500.tsx` rather than a custom `_error.tsx`: this needs no request data, and
 * Next prerenders this file at build time, so it can still be served when the thing that
 * failed is the database connection every other page depends on. An `_error` page that
 * had to render on demand could fail for exactly the reason it was being shown.
 */
const ServerError: React.FC<ServerErrorProps> = ({ canonical }) => (
  <>
    <Seo
      title={`Something went wrong | ${SITE_SHORT_NAME}`}
      description="An unexpected error occurred while loading this page."
      canonical={canonical}
      noindex
    />
    <MessagePage
      title="Something went wrong"
      message={
        "That is on us, not you. The page failed to load. Trying again in a moment usually " +
        "sorts it out."
      }
    />
  </>
);

export const getStaticProps = async () => ({
  props: { canonical: absoluteUrl(getSiteUrl(), "/500") },
});

export default ServerError;
