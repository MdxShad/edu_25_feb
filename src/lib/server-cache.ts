type CacheEntry = {
  value: unknown;
  expiresAt: number;
};

const globalCache = globalThis as unknown as {
  __educonnectServerCache?: Map<string, CacheEntry>;
};

function getCacheStore(): Map<string, CacheEntry> {
  if (!globalCache.__educonnectServerCache) {
    globalCache.__educonnectServerCache = new Map<string, CacheEntry>();
  }
  return globalCache.__educonnectServerCache;
}

export async function getOrSetServerCache<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const store = getCacheStore();
  const current = store.get(key);
  if (current && current.expiresAt > now) {
    return current.value as T;
  }

  const value = await loader();
  store.set(key, { value, expiresAt: now + ttlMs });
  return value;
}

export function invalidateServerCacheByPrefix(prefix: string): void {
  const store = getCacheStore();
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
}

export function invalidateServerCacheKeys(keys: string[]): void {
  const store = getCacheStore();
  for (const key of keys) {
    store.delete(key);
  }
}

