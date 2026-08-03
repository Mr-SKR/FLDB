import React from "react";

/**
 * Renders a schema.org JSON-LD block.
 *
 * `<` is escaped to its unicode form. A JSON-LD payload is script *content*, not an
 * attribute, so any `</script` appearing inside a value (a restaurant name or a video
 * description pulled from YouTube, say) would otherwise close the tag early and turn
 * third-party text into executable markup.
 */
export const JsonLd: React.FC<{ data: Record<string, unknown> }> = ({ data }) => (
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{
      __html: JSON.stringify(data).replace(/</g, "\\u003c"),
    }}
  />
);
