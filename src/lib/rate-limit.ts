// Minimal in-memory fixed-window rate limiter (single Railway instance).
// Keys are never logged. Old buckets are pruned opportunistically.
const buckets = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()) {
  if (buckets.size > 10000) {
    for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k)
  }
  const b = buckets.get(key)
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, retryAfter: 0 }
  }
  if (b.count >= limit) return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) }
  b.count++
  return { ok: true, retryAfter: 0 }
}

export function clientIp(headers: { get(name: string): string | null }): string {
  const xff = headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim() || 'unknown'
  return headers.get('x-real-ip') || 'unknown'
}

export function _resetRateLimits() { buckets.clear() }
