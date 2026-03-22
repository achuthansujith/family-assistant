/** @type {import("next").NextConfig} */
const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  customWorkerDir: "worker",
  runtimeCaching: [],
});

const nextConfig = {
  reactStrictMode: true,
  output: process.env.DOCKER_BUILD === "true" ? "standalone" : undefined,
};

module.exports = withPWA(nextConfig);