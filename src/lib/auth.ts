import jwt from 'jsonwebtoken'
import { randomUUID } from 'crypto'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

const DEV_FALLBACK_SECRET = 'growva-dev-secret-change-in-production'
const IS_PROD = () => process.env.NODE_ENV === 'production'

// In production the signing secret MUST come from the AUTH_SECRET env var.
// The dev fallback is publicly known (it is in the repo), so using it in
// production would let anyone forge login/session tokens. Fail closed instead.
function getSecret(): string | null {
  const s = process.env.AUTH_SECRET
  if (s && s.length >= 16) return s
  if (IS_PROD()) {
    console.error('[auth] AUTH_SECRET is missing or too short in production — refusing to sign/verify tokens')
    return null
  }
  return DEV_FALLBACK_SECRET
}
const SESSION_COOKIE = 'growva_session'
const MAGIC_TOKEN_EXPIRY = '15m'
const SESSION_EXPIRY = '7d'
const SESSION_MAX_AGE = 7 * 24 * 60 * 60 // 7 days in seconds

// ─── Magic link token (short-lived, email only) ───────────────────────────────

// Each token carries a unique id (jti) so it can be burned after first use
// (see /api/auth/verify). jwt.verify checks the HMAC signature with a
// constant-time comparison and enforces the 15 minute expiry.
export function createMagicToken(email: string): string {
  const secret = getSecret()
  if (!secret) throw new Error('auth_not_configured')
  return jwt.sign({ email, type: 'magic' }, secret, {
    expiresIn: MAGIC_TOKEN_EXPIRY,
    jwtid: randomUUID(),
    algorithm: 'HS256',
  })
}

export function verifyMagicToken(token: string): { email: string; jti: string } | null {
  const secret = getSecret()
  if (!secret) return null
  try {
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'] }) as { email: string; type: string; jti?: string }
    if (payload.type !== 'magic' || !payload.jti || typeof payload.email !== 'string') return null
    return { email: payload.email, jti: payload.jti }
  } catch {
    return null
  }
}

// ─── Session token (long-lived, stored in httpOnly cookie) ────────────────────

export function createSessionToken(userId: string, email: string): string {
  const secret = getSecret()
  if (!secret) throw new Error('auth_not_configured')
  return jwt.sign({ userId, email, type: 'session' }, secret, { expiresIn: SESSION_EXPIRY, algorithm: 'HS256' })
}

export function verifySessionToken(token: string): { userId: string; email: string } | null {
  const secret = getSecret()
  if (!secret) return null
  try {
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'] }) as { userId: string; email: string; type: string }
    if (payload.type !== 'session') return null
    return { userId: payload.userId, email: payload.email }
  } catch {
    return null
  }
}

// ─── Cookie helpers ───────────────────────────────────────────────────────────

export function getSessionCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production'
  return {
    name: SESSION_COOKIE,
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    maxAge: SESSION_MAX_AGE,
    path: '/',
  }
}

// For use in Server Components / Route Handlers via next/headers
export function getSessionFromCookies(): { userId: string; email: string } | null {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get(SESSION_COOKIE)?.value
    if (!token) return null
    return verifySessionToken(token)
  } catch {
    return null
  }
}

// For use in API Routes via NextRequest (edge-compatible)
export function getUserFromRequest(req: NextRequest): { userId: string; email: string } | null {
  const token = req.cookies.get(SESSION_COOKIE)?.value
  if (!token) return null
  return verifySessionToken(token)
}
