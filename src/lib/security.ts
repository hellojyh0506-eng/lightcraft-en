import { db } from './db'

// Security utilities — brute-force protection & sign-up rate limiting (based on OWASP authentication standards)

// Login failure threshold: locked after 5 failures within 15 minutes
const LOGIN_MAX_FAILURES = 5
const LOGIN_WINDOW_MS = 15 * 60 * 1000

// Sign-up rate limiting: max 3 per IP per hour
const REGISTER_MAX_PER_IP = 3
const REGISTER_WINDOW_MS = 60 * 60 * 1000

/**
 * Extract client's real IP from request headers (compatible with Nginx/CDN forwarding)
 */
export function getClientIp(req: Request): string {
  // X-Real-IP is set by a trusted reverse proxy (nginx) to the real TCP peer — most reliable, use first
  const real = req.headers.get('x-real-ip')
  if (real) return real.trim()
  // X-Forwarded-For leftmost value can be spoofed by client; trusted proxy uses $proxy_add_x_forwarded_for to append real IP rightmost
  // Therefore take the rightmost hop (not leftmost) to avoid spoofed XFF bypassing rate limits
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    const parts = xff.split(',').map((s) => s.trim()).filter(Boolean)
    if (parts.length) return parts[parts.length - 1]
  }
  return 'unknown'
}

// Request body size early rejection — intercept oversized body by Content-Length before req.json() reads the entire stream into memory,
// preventing unauthenticated endpoints from being DoS'd by oversized request bodies blowing up single-process memory.
// When Content-Length is missing, allow through (defer to reverse proxy client_max_body_size as fallback).
export function bodyTooLarge(req: Request, maxBytes: number): boolean {
  const len = Number(req.headers.get('content-length') || 0)
  return len > maxBytes
}

/**
 * Check if an account is temporarily locked due to too many failed login attempts.
 * Returns { locked, remainingMinutes }.
 * Note: only temporary lock, avoids permanent lock being exploited for DoS (OWASP recommendation).
 */
export async function checkLoginLockout(
  email: string
): Promise<{ locked: boolean; remainingMinutes: number }> {
  const since = new Date(Date.now() - LOGIN_WINDOW_MS)
  const failures = await db.loginAttempt.count({
    where: { email, success: false, createdAt: { gte: since } },
  })

  if (failures >= LOGIN_MAX_FAILURES) {
    return { locked: true, remainingMinutes: 15 }
  }
  return { locked: false, remainingMinutes: 0 }
}

/**
 * Record a login attempt (success or failure).
 * On successful login, clears historical failure records for that email.
 */
export async function recordLoginAttempt(
  email: string,
  success: boolean,
  ip?: string
): Promise<void> {
  await db.loginAttempt.create({
    data: { email, success, ip },
  })
  // Clear failure records after successful login, resetting the counter
  if (success) {
    await db.loginAttempt.deleteMany({
      where: { email, success: false },
    })
  }
}

/**
 * Check if sign-up rate limit has been exceeded for a given IP.
 * Returns true if exceeded — should reject.
 */
export async function checkRegisterRateLimit(ip: string): Promise<boolean> {
  if (ip === 'unknown') return false // Cannot identify IP — do not block (avoid false positives)
  const since = new Date(Date.now() - REGISTER_WINDOW_MS)
  const count = await db.user.count({
    where: { registerIp: ip, createdAt: { gte: since } },
  })
  return count >= REGISTER_MAX_PER_IP
}
