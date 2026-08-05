import React, { useState } from "react";
import { Button, Snackbar } from "@mui/material";
import { IosShare as IosShareIcon } from "@mui/icons-material";
import { logger } from "../../lib/logger";

interface ShareButtonProps {
  title: string;
  text: string;
  /** Canonical URL, so a shared link never carries this visitor's query string. */
  url: string;
}

/**
 * Shares the place, or copies its link where sharing is unavailable.
 *
 * A place page is the one page here anyone would send to someone else ("this is the one
 * from the video"), and there was no way to do it beyond copying out of the address bar,
 * which on a phone means leaving the page.
 *
 * The Web Share API only exists on some browsers and only in a secure context, so the icon
 * and label are resolved on click rather than at render: branching on `navigator.share`
 * during render would produce different markup on the server and the client.
 */
export const ShareButton: React.FC<ShareButtonProps> = ({ title, text, url }) => {
  const [toast, setToast] = useState<string | null>(null);

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (error) {
        // A cancelled share rejects with AbortError, which is not a failure and must not
        // fall through to the clipboard: copying a link the reader just declined to share
        // would be a surprising thing to do on their behalf.
        if ((error as DOMException)?.name === "AbortError") return;
        logger.warn("Web Share failed; falling back to clipboard", "ShareButton", error);
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setToast("Link copied");
    } catch (error) {
      logger.error("Could not copy link", "ShareButton", error);
      setToast("Could not copy the link");
    }
  };

  return (
    <>
      <Button
        onClick={handleShare}
        variant="outlined"
        size="small"
        startIcon={<IosShareIcon />}
        sx={{
          borderRadius: "12px",
          borderColor: "divider",
          color: "text.secondary",
          flexShrink: 0,
          "&:hover": { borderColor: "primary.main", color: "primary.main" },
        }}
      >
        Share
      </Button>
      <Snackbar
        open={toast !== null}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        message={toast}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </>
  );
};
