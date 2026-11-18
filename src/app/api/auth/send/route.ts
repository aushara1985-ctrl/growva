export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createMagicToken } from '@/lib/auth'

// SECURITY: the magic link is a credential. It must only ever travel by email.
// It is NEVER returned in an HTTP response in production. The only exception is a
// local dev path that needs BOTH NODE_ENV !== 'production' AND ALLOW_DEV_LOGIN_LINK=1.
//
// To turn real login emails on, set on the server (Railway):
//   RESEND_API_KEY      — Resend API key
//   RESEND_FROM_EMAIL   — verified sender, e.g. "Growva <noreply@growva.live>"
//   AUTH_SECRET         — long random string (>= 16 chars) used to sign tokens
//   NEXT_PUBLIC_APP_URL — public base URL, e.g. https://growva-production.up.railway.app

const EMAIL_UNAVAILABLE = {
  sent: false,
  error: 'email_unavailable',
  message: 'Login emails are temporarily unavailable. Please try again later.',
}

export async function POST(req: NextRequest) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
  }
  const { email, from } = body ?? {}

  if (typeof email !== 'string' || !email.includes('@') || email.length > 254) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
  }

  const normalizedEmail = email.toLowerCase().trim()
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${req.headers.get('host')}`
  const fromPath = (typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')) ? from : '/dashboard'

  const isProd = process.env.NODE_ENV === 'production'
  const devLinkAllowed = !isProd && process.env.ALLOW_DEV_LOGIN_LINK === '1'
  const resendKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL

  const emailConfigured = !!(resendKey && fromEmail)
  if (!emailConfigured && !devLinkAllowed) {
    // Honest failure: no email provider, no dev override. Nothing is generated.
    return NextResponse.json(EMAIL_UNAVAILABLE, { status: 503 })
  }

  let token: string
  try {
    token = createMagicToken(normalizedEmail)
  } catch {
    return NextResponse.json(EMAIL_UNAVAILABLE, { status: 503 })
  }
  const magicLink = `${baseUrl}/api/auth/verify?token=${token}&from=${encodeURIComponent(fromPath)}`

  if (emailConfigured) {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(resendKey)
      const result: any = await resend.emails.send({
        from: fromEmail!,
        to: normalizedEmail,
        subject: 'Your Growva login link',
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
            <h2 style="margin-bottom: 8px; font-size: 20px;">Log in to Growva</h2>
            <p style="color: #555; margin-bottom: 32px;">Click the button below to log in. This link expires in 15 minutes and works once.</p>
            <a href="${magicLink}"
               style="display: inline-block; background: #18181b; color: white; padding: 12px 24px;
                      border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 15px;">
              Log in to Growva
            </a>
            <p style="color: #999; font-size: 13px; margin-top: 32px;">
              If you didn't request this, you can safely ignore this email.
            </p>
          </div>
        `,
      })
      if (result?.error) throw new Error(result.error.message || 'resend_error')
      return NextResponse.json({ sent: true })
    } catch (err) {
      console.error('[auth/send] Resend error:', err instanceof Error ? err.message : 'unknown')
      // Never fall back to returning the link.
      return NextResponse.json(EMAIL_UNAVAILABLE, { status: 503 })
    }
  }

  // Dev-only path (NODE_ENV !== 'production' AND ALLOW_DEV_LOGIN_LINK=1).
  return NextResponse.json({
    sent: false,
    link: magicLink,
    message: 'DEV ONLY: no email provider configured.',
  })
}
