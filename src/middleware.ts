import { NextRequest, NextResponse } from 'next/server'

// Edge-compatible JWT decode (no Node.js crypto — just inspect payload + expiry).
// Real signature verification happens in API routes via jsonwebtoken (Node.js runtime).
// Middleware is UX-gating only; the API routes are the security boundary.
function decodeSessionCookie(token: string): { userId: string; email: string } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    // base64url → base64 → string
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const json = atob(b64)
    const payload = JSON.parse(json)

    if (!payload.userId || !payload.email || payload.type !== 'session') return null
    if (typeof payload.exp === 'number' && payload.exp * 1000 < Date.now()) return null

    return { userId: payload.userId, email: payload.email }
  } catch {
    return null
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ─── Protected page routes ────────────────────────────────────────────────
  const PROTECTED_PAGES = ['/dashboard', '/products']
  const isProtectedPage = PROTECTED_PAGES.some(p => pathname === p || pathname.startsWith(p + '/'))

  if (isProtectedPage) {
    const token = req.cookies.get('growva_session')?.value
    if (!token || !decodeSessionCookie(token)) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.next()
  }

  // ─── Protected API routes ─────────────────────────────────────────────────
  const PROTECTED_API_PREFIXES = [
    '/api/products',
    '/api/dashboard',
    '/api/experiments',
    '/api/decisions',
    '/api/brain',
    '/api/brief',
    '/api/features',
    '/api/competitors',
    '/api/monopoly',
    '/api/growth-cards',
    '/api/build-queue',
    '/api/execute',
    '/api/execution',
    '/api/decisions-v2',
  ]

  const isProtectedApi = PROTECTED_API_PREFIXES.some(p => pathname.startsWith(p))
  if (isProtectedApi) {
    const token = req.cookies.get('growva_session')?.value
    if (!token || !decodeSessionCookie(token)) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
    }
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard',
    '/dashboard/:path*',
    '/products',
    '/products/:path*',
    '/api/products/:path*',
    '/api/dashboard/:path*',
    '/api/experiments/:path*',
    '/api/decisions/:path*',
    '/api/brain/:path*',
    '/api/brief/:path*',
    '/api/features/:path*',
    '/api/competitors/:path*',
    '/api/monopoly/:path*',
    '/api/growth-cards/:path*',
    '/api/build-queue/:path*',
    '/api/execute/:path*',
    '/api/execution/:path*',
    '/api/decisions-v2/:path*',
  ],
}
