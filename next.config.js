/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  /**
   * Stops `next dev` writing AGENTS.md and CLAUDE.md into the repo root.
   *
   * Next 16.3 generates both on every dev start and re-adds them if deleted, so removing
   * the files alone does not hold: they come back on the next `yarn dev` and show up as
   * untracked noise in every subsequent commit. This flag is the only thing that actually
   * stops it. `.gitignore` carries a matching entry as a backstop, in case the option is
   * ever renamed.
   */
  agentRules: false,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.ytimg.com",
      },
      {
        // Vercel Blob store. Routing place photos through next/image puts Vercel's
        // image cache in front of the blob, so repeat views are served from that cache
        // rather than drawing on the Blob transfer allowance.
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
  experimental: {
    optimizePackageImports: ["@mui/material", "@mui/icons-material"],
  },

  /**
   * Baseline security headers.
   *
   * Deliberately no Content-Security-Policy: the site embeds Disqus and YouTube iframes and
   * MUI's emotion runtime injects styles at runtime, so a correct policy needs
   * `style-src 'unsafe-inline'` plus a non-trivial third-party allowlist. A wrong one breaks
   * comments or video playback silently in production, so it wants to be added deliberately
   * and verified against a real deployment rather than bundled into a cleanup pass.
   *
   * HSTS is omitted because Vercel already sets `Strict-Transport-Security` on every
   * response; declaring it here would only duplicate it.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            // Geolocation is the one powerful feature this site legitimately uses, and it
            // must stay enabled for same-origin or distance sorting stops working.
            key: "Permissions-Policy",
            value: "geolocation=(self), camera=(), microphone=(), payment=(), usb=()",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
