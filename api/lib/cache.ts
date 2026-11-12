/**
 * Tiny in-process TTL cache with single-flight de-duplication.
 *
 * The whole app runs as a single long-lived Node process (see README), so a
 * plain in-memory map is the right shared cache — no external store required.
 * It is a pure performance layer: a missed or purged entry just recomputes, so
 * correctness never depends on cache state.
 */

type CacheEntry = { value: unknown; expiresAt: number };

const MAX_ENTRIES = Number(process.env.API_CACHE_MAX_ENTRIES || 1000);

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

/** Cache-Control for public, non-user-specific reads. Data may be up to ~30s stale. */
export const PUBLIC_CACHE_CONTROL = "public, max-age=30, s-maxage=60, stale-while-revalidate=300";

/** Headers that explicitly forbid caching (auth, admin, cart, orders, ...). */
export const PRIVATE_CACHE_CONTROL = "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";

function evictIfNeeded(): void {
  while (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

/**
 * Return the cached value for `key`, or run `loader` once and cache its result
 * for `ttlMs`. Concurrent calls for the same key share a single in-flight
 * promise, so a burst of visitors triggers one database query, not N.
 */
export function cached<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expiresAt > now) return Promise.resolve(hit.value as T);

  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;

  const promise = loader()
    .then((value) => {
      cache.set(key, { value, expiresAt: Date.now() + ttlMs });
      evictIfNeeded();
      return value;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}

/** Drop every key starting with `prefix`, or the whole cache when omitted. */
export function purgeCache(prefix?: string): void {
  if (!prefix) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}
