import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

// Builds are a static export served by FastAPI. `next dev` proxies /api to the backend on port 8000.
const nextConfig = (phase: string): NextConfig =>
  phase === PHASE_DEVELOPMENT_SERVER
    ? {
        rewrites: async () => [
          { source: "/api/:path*", destination: "http://localhost:8000/api/:path*" },
        ],
      }
    : { output: "export" };

export default nextConfig;
