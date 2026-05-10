import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

const AUTH_SECRET = process.env.AUTH_SECRET || 'growva-dev-secret-change-in-production'
const SESSION_COOKIE = 'growva_session'
const MAGIC_TOKEN_EXPIRY = '15m'
const SESSION_EXPIRY = '7d'
const SESSION_MAX_AGE = 7 * 24 * 60 * 60 // 7 days in seconds

// ─── Magic link token (short-lived, email only) ───────────────────────────────

export function createMagicToken(email: string): string {
  return jwt.sign({ email, type: 'magic' }, AUTH_SECRET, { expiresIn: MAGIC_TOKEN_EXPIRY })
}

export function verifyMagicToken(token: string): { email: string } | null {
  try {
    const payload = jwt.verify(token, AUTH_SECRET) as { email: string; type: string }
    if (payload.type !== 'magic') return null
    return { email: payload.email }
  } catch {
    return null
  }
}

// ─── Session token (long-lived, stored in httpOnly cookie) ────────────────────

export function createSessionToken(userId: string, email: string): string {
  return jwt.sign({ userId, email, type: 'session' }, AUTH_SECRET, { expiresIn: SESSION_EXPIRY })
}

export function verifySessionToken(token: string): { userId: string; email: string } | null {
  try {
    const payload = jwt.verify(token, AUTH_SECRET) as { userId: string; email: string; type: string }
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
