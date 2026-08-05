import React from "react";
import { MessagePage } from "../components/ui/MessagePage";
import { Seo } from "../components/seo/Seo";
import { absoluteUrl, getSiteUrl } from "../lib/seo";
import { SITE_SHORT_NAME } from "../config/constants";

interface NotFoundProps {
  canonical: string;
}

/**
 * The page a dead link lands on.
 *
 * `noindex`, because a 404 that search engines index is a 404 that keeps being visited. The
 * canonical still points at this URL rather than the home page: telling a crawler that a
 * missing restaurant *is* the home page would consolidate signals onto the wrong document.
 */
const NotFound: React.FC<NotFoundProps> = ({ canonical }) => (
  <>
    <Seo
      title={`Page not found | ${SITE_SHORT_NAME}`}
      description="This page does not exist, or the restaurant it described has been removed."
      canonical={canonical}
      noindex
    />
    <MessagePage
      code="404"
      title="We could not find that"
      message={
        "The page has moved, or the restaurant it described has closed and been removed " +
        "from the catalogue. There are plenty of others."
      }
    />
  </>
);

export const getStaticProps = async () => ({
  props: { canonical: absoluteUrl(getSiteUrl(), "/404") },
});

export default NotFound;
