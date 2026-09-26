export type TtlCacheEntry<T> = { value: T; expiresAt: number };

export function readTtlCache<T>(entry: TtlCacheEntry<T> | null, now = Date.now()): T | null {
  if (!entry || entry.expiresAt <= now) return null;
  return entry.value;
}

export function writeTtlCache<T>(value: T, ttlMs: number, now = Date.now()): TtlCacheEntry<T> {
  return { value, expiresAt: now + ttlMs };
}
