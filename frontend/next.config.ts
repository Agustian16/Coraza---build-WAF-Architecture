import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output → minimal runtime image for the frontend container,
  // kept separate from the Go control-plane and ClickHouse images.
  output: "standalone",
  // API proxying is handled by src/app/api/v1/[...path]/route.ts (same-origin,
  // reliable POST body forwarding) — NOT by rewrites, which drop request
  // bodies to the Go backend (ECONNRESET).
};

export default nextConfig;
