// Simple in-memory cache with TTL
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class TTLCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();

  constructor(private ttlMs: number) {}

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > this.ttlMs;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

// Cache TTLs based on data update frequency
export const CACHE_TTLS = {
  FRED: 60 * 60 * 1000,        // 1 hour (FRED updates daily/monthly)
  FEAR_GREED: 30 * 60 * 1000,  // 30 minutes (updates throughout day)
  VIX: 5 * 60 * 1000,          // 5 minutes (market hours)
  REDDIT: 10 * 60 * 1000,      // 10 minutes (continuous discussion)
  QUOTES: 30 * 1000,           // 30 seconds (live prices)
  NEWS: 5 * 60 * 1000,         // 5 minutes
} as const;

export function createCache<T>(ttlMs: number) {
  return new TTLCache<T>(ttlMs);
}
