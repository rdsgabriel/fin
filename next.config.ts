import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O selo de dev flutuante fica por cima do dock e polui os screenshots.
  devIndicators: false,
  async headers() {
    return [
      {
        // O service worker precisa ser servido do root com escopo total.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
