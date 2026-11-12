import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Next.js 15 defaults dynamic Router Cache to 0, so every menu click and
    // back/forward re-fetches from the server. Keep dynamic pages for 30s and
    // static ones for 3min so navigation feels instant while staying fresh.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
  serverExternalPackages: [
    "@prisma/client",
    "bcryptjs",
    "cors",
    "express",
    "multer",
    "nodemailer",
  ],
  images: {
    // Some hosts (e.g. the production server) cannot reach upstream image
    // origins, so the built-in optimizer returns 400 "upstream response is
    // invalid" and product images disappear. Serving the original files
    // directly keeps every image visible regardless of where it is hosted.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "gadgetlagbe.online" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  async headers() {
    return [{ source: "/(.*)", headers: [
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
    ] }];
  },
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
};

export default withBundleAnalyzer(nextConfig);
