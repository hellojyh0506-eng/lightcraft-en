// Unified in-memory rate limiter factory
// Replaces 3 duplicate Map<string, number[]> + filter patterns from the original project

interface RateLimiterOptions {
  windowMs: number  // Time window (milliseconds)
  maxHits: number   // Max requests within the window
}

export function createRateLimiter({ windowMs, maxHits }: RateLimiterOptions) {
  const hits = new Map<string, number[]>()

  return {
    /** Check if rate limit is exceeded. Returns true = exceeded, should reject */
    check(key: string): boolean {
      const now = Date.now()
      const timestamps = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
      if (timestamps.length >= maxHits) {
        hits.set(key, timestamps)
        return true
      }
      timestamps.push(now)
      hits.set(key, timestamps)
      return false
    },

    /** Returns remaining available requests */
    remaining(key: string): number {
      const now = Date.now()
      const timestamps = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
      return Math.max(0, maxHits - timestamps.length)
    },
  }
}
