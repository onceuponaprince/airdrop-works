import { createClient } from "redis"

const WINDOW_SEC = 86_400
const MAX_REQUESTS = 3
const KEY_PREFIX = "waitlist:ip:"

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

function checkMemory(ip: string): boolean {
  const now = Date.now()
  const entry = memoryBuckets.get(ip)
  if (!entry || now > entry.resetAt) {
    memoryBuckets.set(ip, { count: 1, resetAt: now + WINDOW_SEC * 1000 })
    return true
  }
  if (entry.count >= MAX_REQUESTS) return false
  entry.count++
  return true
}

/** Returns false when IP exceeded MAX_REQUESTS signups in WINDOW_SEC. */
export async function checkWaitlistIpRateLimit(ip: string): Promise<boolean> {
  const client = await getRedisClient()
  const key = KEY_PREFIX + ip

  if (client?.isReady) {
    const count = await client.incr(key)
    if (count === 1) await client.expire(key, WINDOW_SEC)
    return count <= MAX_REQUESTS
  }

  return checkMemory(ip)
}
