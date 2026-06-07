export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyMagicToken, createSessionToken, getSessionCookieOptions } from '@/lib/auth'

const ADMIN_EMAIL = 'aushara1985@gmail.com'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')
  const from = searchParams.get('from') || '/dashboard'

  // Behind Railway's proxy, req.url resolves to the internal host (localhost:8080).
  // Use the public host header (same source as /api/auth/send) so redirects point
  // at the real domain instead of localhost.
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${req.headers.get('host')}`

  if (!token) {
    return NextResponse.redirect(new URL('/login?error=missing_token', baseUrl))
  }

  const payload = verifyMagicToken(token)
  if (!payload) {
    return NextResponse.redirect(new URL('/login?error=invalid_or_expired', baseUrl))
  }

  // Upsert user — create if new, find if existing
  const user = await prisma.user.upsert({
    where: { email: payload.email },
    update: {},
    create: { email: payload.email },
  })

  // Backfill: assign all unowned products to admin on first/every login
  if (payload.email === ADMIN_EMAIL) {
    await prisma.product.updateMany({
      where: { userId: null },
      data: { userId: user.id },
    })
  }

  // Create session token and set cookie
  const sessionToken = createSessionToken(user.id, user.email)
  const cookieOptions = getSessionCookieOptions()

  // Sanitize 'from' — only allow relative paths
  const safePath = from.startsWith('/') ? from : '/dashboard'

  const response = NextResponse.redirect(new URL(safePath, baseUrl))
  response.cookies.set(cookieOptions.name, sessionToken, {
    httpOnly: cookieOptions.httpOnly,
    secure: cookieOptions.secure,
    sameSite: cookieOptions.sameSite,
    maxAge: cookieOptions.maxAge,
    path: cookieOptions.path,
  })

  return response
}
