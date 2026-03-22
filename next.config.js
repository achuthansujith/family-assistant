/** @type {import("next").NextConfig} */
// We manage our own /public/sw.js — no next-pwa SW generation needed
// next-pwa is kept only for the PWA manifest injection
const withPWA = require("next-pwa")({
  dest: "public",
  disable: true,          // disable next-pwa SW generation — we use our own sw.js
  register: false,        // we register manually in the app
  skipWaiting: true,
});

const nextConfig = {
  reactStrictMode: true,
  output: process.env.DOCKER_BUILD === "true" ? "standalone" : undefined,
};

module.exports = withPWA(nextConfig);