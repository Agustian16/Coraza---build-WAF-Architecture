import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output → minimal runtime image for the frontend container,
  // kept separate from the Go control-plane and ClickHouse images.
  output: "standalone",
};

export default nextConfig;
