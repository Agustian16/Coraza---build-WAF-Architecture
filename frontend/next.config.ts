import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output → minimal runtime image for the frontend container,
  // kept separate from the Go control-plane and ClickHouse images.
  output: "standalone",
  async rewrites() {
    // Same-origin proxy: the browser calls /api/v1/* on the UI origin and the
    // Next server forwards to the control plane (inside the docker network).
    // This avoids CORS and the "localhost baked into the client" problem.
    const target = process.env.API_PROXY ?? "http://localhost:8080";
    return [
      {
        source: "/api/v1/:path*",
        destination: `${target}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
