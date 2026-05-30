const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const CACHE_TTL = parseInt(process.env.REDIS_CACHE_TTL || "86400", 10);

interface RedisClient {
  get(key: string): Promise<string | null>;
  setex(key: string, seconds: number, value: string): Promise<unknown>;
  on(event: string, handler: (...args: unknown[]) => void): void;
}

let client: RedisClient | null = null;

async function getClient() {
  if (client) return client;
  if (typeof window !== "undefined") return null;
  try {
    const { default: Redis } = await import("ioredis");
    client = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times: number) {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });
    client.on("error", () => {});
    return client;
  } catch {
    return null;
  }
}

async function redisGet<T>(key: string): Promise<T | null> {
  try {
    const r = await getClient();
    if (!r) return null;
    const val = await r.get(key);
    if (val === null) return null;
    return JSON.parse(val) as T;
  } catch {
    return null;
  }
}

async function redisSet(key: string, value: unknown, ttl = CACHE_TTL): Promise<void> {
  try {
    const r = await getClient();
    if (!r) return;
    await r.setex(key, ttl, JSON.stringify(value));
  } catch {
    // silent
  }
}

const TTL = CACHE_TTL * 1000;
const local = new Map<string, { data: unknown; ts: number }>();

export async function withRedisCache<T>(key: string, fetcher: () => Promise<T>, ttlSeconds = CACHE_TTL): Promise<T> {
  const fromRedis = await redisGet<T>(key);
  if (fromRedis !== null) return fromRedis;

  const entry = local.get(key);
  if (entry && Date.now() - entry.ts < TTL) return entry.data as T;

  const data = await fetcher();
  await redisSet(key, data, ttlSeconds);
  local.set(key, { data, ts: Date.now() });
  return data;
}
