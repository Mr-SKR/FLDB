import React, { useEffect, useRef, useState } from "react";
import { Box, Button, Paper, Typography } from "@mui/material";
import { ChatBubbleOutline as ChatBubbleOutlineIcon } from "@mui/icons-material";
import dynamic from "next/dynamic";

/**
 * Disqus is loaded on demand, and only in the browser.
 *
 * It is by a wide margin the heaviest thing on a place page: a third-party bundle that then
 * fetches its own scripts, iframes and fonts. It sits below the videos and the nearby links,
 * so most visits paid for all of that and never scrolled to it.
 *
 * `ssr: false` because the embed renders nothing meaningful server-side anyway, and the
 * import only happens once `mounted` flips, so the chunk is not even requested until the
 * reader approaches the section.
 */
const DiscussionEmbed = dynamic(
  () => import("disqus-react").then((mod) => mod.DiscussionEmbed),
  { ssr: false }
);

interface CommentsSectionProps {
  /** Canonical URL of the page, which is what identifies the thread. */
  url: string;
  identifier: string;
  title: string;
}

/** Load when the section comes within this distance of the viewport. */
const ROOT_MARGIN = "300px";

export const CommentsSection: React.FC<CommentsSectionProps> = ({ url, identifier, title }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const shortname = process.env.NEXT_PUBLIC_DISQUS_SHORTNAME;

  useEffect(() => {
    if (shouldLoad) return;

    const target = containerRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: ROOT_MARGIN }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [shouldLoad]);

  return (
    <Box component="section" sx={{ mt: { xs: 2, sm: 4 } }} ref={containerRef}>
      <Typography
        variant="h5"
        component="h2"
        fontWeight="800"
        gutterBottom
        sx={{ mb: 3, letterSpacing: -0.5 }}
      >
        Comments & discussion
      </Typography>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: "20px",
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
          // Reserves roughly the height the embed settles at, so the nearby links and the
          // footer below do not jump when it finally loads.
          minHeight: 220,
        }}
      >
        {/* An unconfigured shortname used to fall back to the literal string
            "disqus-shortname", which loads a stranger's thread list into the page. Saying
            nothing is the correct behaviour for a missing integration. */}
        {!shortname ? (
          <Typography variant="body2" color="text.secondary">
            Comments are not configured for this deployment.
          </Typography>
        ) : shouldLoad ? (
          <DiscussionEmbed
            shortname={shortname}
            config={{
              // The canonical URL, not `router.asPath`: the latter carries any query string,
              // so arriving with a `?utm_source=…` tag would open a separate Disqus thread
              // for the same restaurant.
              url,
              identifier,
              title,
            }}
          />
        ) : (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 1.5,
              py: 4,
            }}
          >
            <ChatBubbleOutlineIcon sx={{ fontSize: 32, color: "text.disabled" }} />
            <Typography variant="body2" color="text.secondary">
              Comments load when you scroll here.
            </Typography>
            {/* A manual escape hatch, for anyone who jumped straight to the anchor or is
                using a browser where the observer never fires. */}
            <Button size="small" onClick={() => setShouldLoad(true)}>
              Load comments now
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
};
