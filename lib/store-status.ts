const CACHE_TTL_MS = 30_000;
const REQUEST_TIMEOUT_MS = 8_000;

export type StoreStatusConfig = { [key: string]: any };

export type StoreStatusResult = {
  onboarded: boolean;
  config: StoreStatusConfig | null;
};

const FALLBACK: StoreStatusResult = { onboarded: false, config: null };

let entry: { at: number; promise: Promise<StoreStatusResult> } | null = null;

function load(force: boolean): Promise<StoreStatusResult> {
  const now = Date.now();
  if (!force && entry && now - entry.at < CACHE_TTL_MS) {
    return entry.promise;
  }

  const promise = fetch("/api/store/status", {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
    .then((response) => (response.ok ? response.json() : Promise.reject(new Error(`store status ${response.status}`))))
    .then((data): StoreStatusResult => ({
      onboarded: Boolean(data?.onboarded),
      config: (data?.config ?? null) as StoreStatusConfig | null,
    }))
    .catch((): StoreStatusResult => {
      if (entry?.promise === promise) entry = null;
      return FALLBACK;
    });

  entry = { at: now, promise };
  return promise;
}

/**
 * Shared, de-duplicated store status loader.
 *
 * Every storefront surface (theme, header, bottom nav, home, shop, category)
 * calls this instead of hitting `/api/store/status` on its own, so a single
 * page load issues one in-flight request that all consumers share. Results are
 * reused for a short TTL so client-side navigation does not re-fetch either.
 */
export function getStoreStatus(): Promise<StoreStatusResult> {
  return load(false);
}

export function refreshStoreStatus(): Promise<StoreStatusResult> {
  return load(true);
}

export function invalidateStoreStatus(): void {
  entry = null;
}
