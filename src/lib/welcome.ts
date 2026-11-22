// One-time welcome email after a brand-new account is created (first magic-link
// verify). Same Resend channel and env as the login email (RESEND_API_KEY +
// RESEND_FROM_EMAIL). Idempotent via users.welcomeSentAt: claimed before the
// send, released if the send fails. Existing users are never emailed (the
// caller only invokes this for accounts that did not exist before).
// Growva is in beta with no enforced trial, so there is no trial reminder.
import { prisma } from '@/lib/db'

export async function sendWelcomeOnce(userId: string, email: string, baseUrl: string): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL
  if (!resendKey || !fromEmail) return

  const claim = await prisma.user.updateMany({
    where: { id: userId, welcomeSentAt: null },
    data: { welcomeSentAt: new Date() },
  })
  if (claim.count === 0) return

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(resendKey)
    const result: any = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: 'Welcome to Growva · هلا فيك في Growva',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 20px;">
          <div dir="rtl" style="text-align:right; margin-bottom: 24px;">
            <h2 style="margin: 0 0 8px; font-size: 20px;">هلا فيك في Growva</h2>
            <p style="color: #555; line-height: 1.9; margin: 0;">
              Growva يساعدك تعرف هل منتجك يستاهل تكمل عليه أو لا، من إشارات حقيقية (زيارات وتسجيلات) وليس من تخمين.
              أول خطوة: أضف منتجك وركّب كود التتبع، ولمّا توصل بيانات كافية يطلع لك القرار. الدفع «قريباً»، والوصول الحالي بيتا.
            </p>
          </div>
          <div dir="ltr" style="text-align:left;">
            <h3 style="margin: 0 0 8px; font-size: 16px;">Welcome to Growva</h3>
            <p style="color: #555; line-height: 1.7; margin: 0;">
              Growva tells you whether your product is worth continuing, based on real signals (views and signups), not guesses.
              First step: add your product and install the tracking snippet. A verdict appears once enough real data arrives. Paid plans are coming soon; access is currently beta.
            </p>
          </div>
          <a href="${baseUrl}/dashboard"
             style="display: inline-block; margin-top: 24px; background: #18181b; color: white; padding: 12px 24px;
                    border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 15px;">
            Open Growva · افتح Growva
          </a>
        </div>
      `,
    })
    if (result?.error) throw new Error(result.error.message || 'resend_error')
  } catch (err) {
    console.error('[welcome] send failed:', err instanceof Error ? err.message : 'unknown')
    await prisma.user.updateMany({ where: { id: userId }, data: { welcomeSentAt: null } }).catch(() => {})
  }
}
