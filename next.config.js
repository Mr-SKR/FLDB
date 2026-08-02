/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
};

module.exports = nextConfig;
