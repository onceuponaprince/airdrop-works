import type { NextConfig } from "next"
import { config as dotenvConfig } from "dotenv"
import { resolve } from "path"

dotenvConfig({ path: resolve(process.cwd(), "..", ".env") })

/**
 * Proxy /api/v1/* to the Django backend so the browser never calls
 * the backend directly — eliminates CORS and keeps the backend URL private.
 *
 * BACKEND_URL (server-side only):
 *   - local dev:   http://localhost:8000
 *   - production:  https://api.airdrop.works (or wherever Django is hosted)
 */
const BACKEND_URL = (
  process.env.BACKEND_URL || "http://localhost:8000"
).replace(/\/$/, "")

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: false,
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "pbs.twimg.com" },
      { protocol: "https", hostname: "unavatar.io" },
    ],
  },
  turbopack: {
    root: process.cwd(),
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${BACKEND_URL}/api/v1/:path*`,
      },
      {
        source: "/health",
        destination: `${BACKEND_URL}/health/`,
      },
    ]
  },
}

export default nextConfig
