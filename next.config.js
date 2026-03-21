/** @type {import('next').NextConfig} */
const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  // Only cache app shell - don't cache API routes
  runtimeCaching: [],
});

const nextConfig = {
  reactStrictMode: true,
  // Required for Docker standalone image (Dockerfile uses this)
  output: process.env.DOCKER_BUILD === "true" ? "standalone" : undefined,
  // Uncomment for pure static export to Cloudflare Pages (disables API routes)
  // output: 'export',
};

module.exports = withPWA(nextConfig);
