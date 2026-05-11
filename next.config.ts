import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable static optimization for production
  output: "standalone",

  // Image optimization for production
  images: {
    unoptimized: true,
  },

  // Allowed origins for development (required for HMR in some environments)
  allowedDevOrigins: ["127.0.0.1", "localhost"],

  // Production build configuration
  distDir: ".next",

  // Performance optimizations
  experimental: {
    optimizeCss: false,
  },

  // Environment variables available at build time
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // Headers for security and CORS
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },

  // Disable x-powered-by header
  poweredByHeader: false,

  // Compression for production
  compress: true,

  // Trailing slash handling
  trailingSlash: false,
};

export default nextConfig;
