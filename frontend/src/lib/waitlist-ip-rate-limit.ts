import { createClient } from "redis"

const DEFAULT_WINDOW_SEC = 86_400
const DEFAULT_MAX_REQUESTS = 3
const DEFAULT_KEY_PREFIX = "waitlist:ip:"

type MemEntry = { count: number; resetAt: number }
const memoryBuckets = new Map<string, MemEntry>()

type RedisCli = ReturnType<typeof createClient>

let redisClient: RedisCli | null = null
let redisConnectPromise: Promise<RedisCli | null> | null = null

function redisUrl(): string | undefined {
  const u = process.env.WAITLIST_REDIS_URL?.trim() || process.env.REDIS_URL?.trim()
  return u || undefined
}

async function getRedisClient(): Promise<RedisCli | null> {
  const url = redisUrl()
  if (!url) return null

  if (redisClient?.isReady) return redisClient

  if (!redisConnectPromise) {
    redisConnectPromise = (async () => {
      try {
        const client = createClient({ url })
        client.on("error", (err) => console.error("[waitlist-ip-limit] Redis:", err))
        await client.connect()
        redisClient = client
        return client
      } catch (e) {
        console.error("[waitlist-ip-limit] Redis connect failed, using in-memory fallback:", e)
        redisClient = null
        return null
      } finally {
        redisConnectPromise = null
      }
    })()
  }

  return redisConnectPromise
}

function checkMemory(key: string, windowSec: number, maxRequests: number): boolean {
  const now = Date.now()
  const entry = memoryBuckets.get(key)
  if (!entry || now > entry.resetAt) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowSec * 1000 })
    return true
  }
  if (entry.count >= maxRequests) return false
  entry.count++
  return true
}

type RateLimitOptions = {
  windowSec: number
  maxRequests: number
  keyPrefix: string
}

async function checkIpRateLimit(ip: string, opts: RateLimitOptions): Promise<boolean> {
  const client = await getRedisClient()
  const key = opts.keyPrefix + ip

  if (client?.isReady) {
    const count = await client.incr(key)
    if (count === 1) await client.expire(key, opts.windowSec)
    return count <= opts.maxRequests
  }

  return checkMemory(key, opts.windowSec, opts.maxRequests)
}

/** Returns false when IP exceeded DEFAULT_MAX_REQUESTS signups in DEFAULT_WINDOW_SEC. */
export async function checkWaitlistIpRateLimit(ip: string): Promise<boolean> {
  return checkIpRateLimit(ip, {
    windowSec: DEFAULT_WINDOW_SEC,
    maxRequests: DEFAULT_MAX_REQUESTS,
    keyPrefix: DEFAULT_KEY_PREFIX,
  })
}

/** Higher-volume limiter used for non-critical endpoints (e.g. email existence checks). */
export async function checkWaitlistCheckIpRateLimit(ip: string): Promise<boolean> {
  return checkIpRateLimit(ip, {
    windowSec: DEFAULT_WINDOW_SEC,
    maxRequests: 60,
    keyPrefix: "waitlist:check:ip:",
  })
}
