import type { NextConfig } from "next"
import { resolve } from "path"

/**
 * Load the root .env for local docker-compose dev where BACKEND_URL lives
 * in the monorepo root. On Vercel env vars come from the dashboard, so
 * this is a no-op in production (the file simply won't exist).
 */
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const dotenv = require("dotenv")
  dotenv.config({ path: resolve(process.cwd(), "..", ".env") })
} catch {
  // dotenv is a devDependency — unavailable in production builds is fine
}

/**
 * Proxy Django backend routes through Next.js so the browser never calls
 * the backend directly — this eliminates CORS issues and keeps the
 * backend URL private (never exposed to the client bundle).
 *
 * IMPORTANT: Only `/api/v1/*` and `/health/*` are proxied. The frontend
 * has its own Next.js API routes under `/api/judge`, `/api/waitlist`,
 * `/api/twitter-analyze`, `/api/og`, and `/api/observability` — those
 * must NOT be intercepted by these rewrites.
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
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return {
      beforeFiles: [
        // Only proxy /api/v1/* to Django — leave frontend API routes untouched
        {
          source: "/api/v1/:path(.*)",
          destination: `${BACKEND_URL}/api/v1/:path`,
        },
        {
          source: "/health/:path(.*)",
          destination: `${BACKEND_URL}/health/:path`,
        },
        {
          source: "/health",
          destination: `${BACKEND_URL}/health/`,
        },
      ],
      afterFiles: [],
      fallback: [],
    }
  },
}

export default nextConfig
