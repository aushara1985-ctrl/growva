export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyMagicToken, createSessionToken, getSessionCookieOptions } from '@/lib/auth'
import { sendWelcomeOnce } from '@/lib/welcome'
import { attrFromCookie, capture } from '@/lib/track'

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

  // Single use: burn the token id. A replay hits the primary-key constraint and
  // is rejected. If the table is unavailable we fail closed (no login).
  try {
    await prisma.magicTokenUse.create({ data: { jti: payload.jti } })
  } catch {
    return NextResponse.redirect(new URL('/login?error=invalid_or_expired', baseUrl))
  }

  // Upsert user — create if new, find if existing
  const existedBefore = !!(await prisma.user.findUnique({ where: { email: payload.email }, select: { id: true } }))
  const user = await prisma.user.upsert({
    where: { email: payload.email },
    update: {},
    create: { email: payload.email },
  })

  // Welcome email only for a brand-new account (never for existing users).
  if (!existedBefore) {
    await sendWelcomeOnce(user.id, user.email, baseUrl).catch(() => {})
  }

  // PostHog: exactly one signup_completed per NEW account, with the first-touch source saved on the first visit.
  // Internal user id only (no email). Never blocks the login.
  if (!existedBefore) {
    await capture('signup_completed', user.id, {
      user_id: user.id,
      plan: 'free',
      ...attrFromCookie(req.cookies.get('gv_attr')?.value),
    })
  }

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
