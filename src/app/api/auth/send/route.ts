export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createMagicToken } from '@/lib/auth'

const ADMIN_EMAIL = 'aushara1985@gmail.com'

export async function POST(req: NextRequest) {
  const { email } = await req.json()

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
  }

  const normalizedEmail = email.toLowerCase().trim()
  const token = createMagicToken(normalizedEmail)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${req.headers.get('host')}`
  const magicLink = `${baseUrl}/api/auth/verify?token=${token}`

  const resendKey = process.env.RESEND_API_KEY

  if (resendKey) {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(resendKey)

      await resend.emails.send({
        from: 'Growva <noreply@growva.co>',
        to: normalizedEmail,
        subject: 'Your Growva login link',
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
            <h2 style="margin-bottom: 8px; font-size: 20px;">Log in to Growva</h2>
            <p style="color: #555; margin-bottom: 32px;">Click the button below to log in. This link expires in 15 minutes.</p>
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

      return NextResponse.json({ sent: true })
    } catch (err) {
      console.error('[auth/send] Resend error:', err)
      // Fall through to return link in response
    }
  }

  // Fallback: no Resend key (or Resend failed) — return link for manual testing
  console.log(`[auth/send] Magic link for ${normalizedEmail}: ${magicLink}`)
  return NextResponse.json({
    sent: false,
    link: magicLink,
    message: 'No email provider configured. Use the link below to log in.',
  })
}
