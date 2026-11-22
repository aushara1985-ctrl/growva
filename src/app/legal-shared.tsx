// Shared layout + copy for the legal pages (Terms / Privacy). Operator: inventive gaze, LLC.
// Prices mirror CATALOG in src/lib/stripe.ts and src/app/pricing/page.tsx. Not a route.
import Link from 'next/link'
import type { ReactNode } from 'react'

export const SUPPORT_EMAIL = 'hello@growva.co'
export const UPDATED = 'November 22, 2026 · 22 نوفمبر 2026'

export type Section = { id?: string; h: string; body: ReactNode }

const C = { bg: '#08080A', card: '#111116', border: 'rgba(255,255,255,0.08)', text: '#fff', dim: '#8A8A9A', accent: '#E8A020' }

export function LegalShell({ title, titleAr, en, ar }: { title: string; titleAr: string; en: Section[]; ar: Section[] }) {
  const block = (sections: Section[], dir: 'ltr' | 'rtl') => (
    <div dir={dir} style={{ textAlign: dir === 'rtl' ? 'right' : 'left', fontFamily: dir === 'rtl' ? "'Tajawal','Segoe UI',Arial,sans-serif" : undefined }}>
      {sections.map(s => (
        <section key={s.h} id={s.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '18px 22px', marginBottom: 12 }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, margin: '0 0 8px', color: C.text }}>{s.h}</h2>
          <div style={{ fontSize: 14, lineHeight: 1.8, color: C.dim }}>{s.body}</div>
        </section>
      ))}
    </div>
  )
  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 20px 64px' }}>
        <Link href="/" style={{ color: C.text, fontWeight: 700, textDecoration: 'none' }}>Growva</Link>
        <h1 style={{ fontSize: 32, fontWeight: 300, margin: '24px 0 4px' }}>{title}</h1>
        <p style={{ fontSize: 12, color: C.dim, marginBottom: 24 }}>Last updated: {UPDATED}</p>
        {block(en, 'ltr')}
        <h1 dir="rtl" style={{ fontSize: 28, fontWeight: 400, margin: '40px 0 16px', fontFamily: "'Tajawal','Segoe UI',Arial,sans-serif" }}>{titleAr}</h1>
        {block(ar, 'rtl')}
        <p style={{ fontSize: 12, color: C.dim, marginTop: 24 }}>
          This product is operated by inventive gaze, LLC — Support:{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: C.accent }}>{SUPPORT_EMAIL}</a>
          <br />
          <span dir="rtl">يُشغّل هذا المنتج من قبل inventive gaze, LLC — الدعم: {SUPPORT_EMAIL}</span>
        </p>
        <nav style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, marginTop: 16 }}>
          <Link href="/terms" style={{ color: C.dim }}>Terms</Link>
          <Link href="/privacy" style={{ color: C.dim }}>Privacy</Link>
          <Link href="/terms#refund" style={{ color: C.dim }}>Refund &amp; Cancellation</Link>
          <Link href="/terms#contact" style={{ color: C.dim }}>Contact</Link>
          <Link href="/pricing" style={{ color: C.dim }}>Pricing</Link>
        </nav>
      </div>
    </div>
  )
}

const L = (items: string[]) => (
  <ul style={{ margin: '4px 0', paddingInlineStart: 20 }}>{items.map(i => <li key={i}>{i}</li>)}</ul>
)

export const TERMS_EN: Section[] = [
  { h: '1. Acceptance', body: <p>By using Growva you agree to these terms. If you do not agree, do not use the service.</p> },
  { h: '2. What Growva is', body: <p>Growva is a subscription web app (SaaS) that helps solo founders run structured experiments on their product and get a clear Scale / Kill / Iterate decision based on real signals (views and sign-ups from your tracking links). We do not guarantee any business result.</p> },
  { h: '3. Account', body: <p>You sign in with your email via a magic link. You are responsible for your account and for the accuracy of the information you add.</p> },
  { h: '4. Plans and payment', body: L([
    'Prices are in US dollars and are listed on the Pricing page: Founding Access $199 one-time (lifetime, limited to the first 1,000 spots) and Growth $99 per month (coming after the founding round).',
    'Right now Growva is in private beta: founding access is reserved by signing up, and no payment is taken. When payment opens, it is made by card through Stripe under these terms. We do not store your card details.',
    'Monthly subscriptions renew automatically every month at the same price until you cancel. Founding Access is a single payment with no renewal.',
  ]) },
  { h: '5. Free trial', body: <p>Beta access is free and needs no card. Nothing is charged unless you choose a paid plan and pay yourself.</p> },
  { h: '6. Cancellation', body: L([
    `You can cancel a monthly subscription at any time from your billing page or by emailing ${SUPPORT_EMAIL}.`,
    'After cancelling, your account stays active until the end of the paid period and does not renew.',
  ]) },
  { id: 'refund', h: '7. Refund policy', body: L([
    'Monthly plan: full refund of the first payment if requested within 7 days of payment. After that, no partial-period refunds, and cancelling stops the next renewal.',
    'One-time / lifetime plan (Founding Access): full refund if requested within 14 days of purchase.',
    'Refunds go back to the same card within 5–10 business days, depending on your bank.',
    `To request a refund, email ${SUPPORT_EMAIL} with your account email.`,
  ]) },
  { h: '8. Acceptable use', body: <p>Do not use Growva for spam, fake traffic, illegal activity, or to attack or overload the service. We may suspend accounts that break these rules.</p> },
  { h: '9. Data and privacy', body: <p>Your data is used only to run the service and is never sold. See the <Link href="/privacy" style={{ color: C.accent }}>Privacy Policy</Link> for details and your rights.</p> },
  { h: '10. Limitation of liability', body: <p>The service is provided as is. We aim to keep it available but do not guarantee uninterrupted service or business results. Our liability is in any case limited to the amount you paid us in the last 3 months.</p> },
  { id: 'contact', h: '11. Contact', body: <p>Operated by inventive gaze, LLC (Delaware, USA). Email: <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: C.accent }}>{SUPPORT_EMAIL}</a> — we reply within one business day.</p> },
]

export const TERMS_AR: Section[] = [
  { h: '1. قبول الشروط', body: <p>باستخدامك لـ Growva توافق على هذه الشروط. إذا ما توافق عليها، لا تستخدم الخدمة.</p> },
  { h: '2. وش هو Growva', body: <p>Growva خدمة اشتراك (SaaS) تساعد المؤسسين المستقلين يشغّلون تجارب منظمة على منتجهم ويطلعون بقرار واضح (وسّع / أوقف / عدّل) مبني على إشارات حقيقية (زيارات وتسجيلات من روابط التتبع). ما نضمن أي نتيجة تجارية.</p> },
  { h: '3. الحساب', body: <p>تدخل ببريدك الإلكتروني عن طريق رابط سحري. أنت مسؤول عن حسابك وعن صحة المعلومات اللي تضيفها.</p> },
  { h: '4. الباقات والدفع', body: L([
    'الأسعار بالدولار الأمريكي ومنشورة في صفحة الأسعار: Founding Access ‏199$ دفعة وحدة (مدى الحياة، لأول 1,000 مقعد فقط) وباقة Growth ‏99$ شهريًا (بعد جولة المؤسسين).',
    'الحين Growva في بيتا خاصة: وصول المؤسسين يُحجز بالتسجيل ولا ينسحب منك أي مبلغ. لما يفتح الدفع، يكون ببطاقة عن طريق Stripe بموجب هذه الشروط، وما نحفظ بيانات بطاقتك.',
    'الاشتراك الشهري يتجدد تلقائيًا كل شهر بنفس السعر لين تلغيه. وصول المؤسسين دفعة وحدة بدون تجديد.',
  ]) },
  { h: '5. التجربة المجانية', body: <p>الوصول في البيتا مجاني وبدون بطاقة. ما ينسحب منك أي مبلغ إلا إذا اخترت باقة مدفوعة ودفعت بنفسك.</p> },
  { h: '6. الإلغاء', body: L([
    `تقدر تلغي اشتراكك الشهري متى ما بغيت من صفحة الفوترة أو بإيميل لـ ${SUPPORT_EMAIL}.`,
    'بعد الإلغاء يظل حسابك شغال لين نهاية الفترة المدفوعة، وما يتجدد بعدها.',
  ]) },
  { h: '7. سياسة الاسترداد', body: L([
    'الاشتراك الشهري: استرداد كامل لأول دفعة إذا طلبته خلال 7 أيام من الدفع. بعدها ما فيه استرداد للفترة الجارية، ويوقف التجديد الجاي.',
    'الدفعة الواحدة / مدى الحياة (Founding Access): استرداد كامل إذا طلبته خلال 14 يوم من الشراء.',
    'الاسترداد يرجع لنفس البطاقة خلال 5–10 أيام عمل حسب البنك.',
    `لطلب الاسترداد: إيميل لـ ${SUPPORT_EMAIL} فيه بريد حسابك.`,
  ]) },
  { h: '8. الاستخدام المقبول', body: <p>لا تستخدم Growva لرسائل مزعجة أو زيارات وهمية أو أي نشاط مخالف للأنظمة، ولا لمهاجمة الخدمة أو إرهاقها. يحق لنا إيقاف أي حساب يخالف هذا.</p> },
  { h: '9. البيانات والخصوصية', body: <p>نستخدم بياناتك فقط لتشغيل الخدمة ولا نبيعها. التفاصيل وحقوقك في <Link href="/privacy" style={{ color: C.accent }}>سياسة الخصوصية</Link>.</p> },
  { h: '10. حدود المسؤولية', body: <p>نقدم الخدمة كما هي ونسعى أن تكون متاحة دائمًا، لكن ما نضمن نتائج تجارية. مسؤوليتنا في أي حال لا تتجاوز المبلغ اللي دفعته لنا خلال آخر 3 أشهر.</p> },
  { h: '11. التواصل', body: <p>يُشغّل هذا المنتج من قبل inventive gaze, LLC (ديلاوير، الولايات المتحدة). الإيميل: <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: C.accent }}>{SUPPORT_EMAIL}</a> — نرد خلال يوم عمل.</p> },
]

export const PRIVACY_EN: Section[] = [
  { h: '1. Introduction', body: <p>Growva is operated by inventive gaze, LLC. This policy explains what data we collect and how we use it.</p> },
  { h: '2. What we collect', body: L(['Your email address (for sign-in).', 'Your products, experiments, and decisions you create.', 'Anonymous view and sign-up counts recorded through your tracking links.', 'Payment is handled by Stripe; we do not store card details.']) },
  { h: '3. How we use it', body: <p>Only to run the service. We never sell your data and share it only with providers needed to operate it (hosting, email, payments).</p> },
  { h: '4. Your rights', body: <p>You can access, correct, or delete your data, including your account. Email {SUPPORT_EMAIL}.</p> },
  { h: '5. Contact', body: <p><a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: C.accent }}>{SUPPORT_EMAIL}</a></p> },
]

export const PRIVACY_AR: Section[] = [
  { h: '1. المقدمة', body: <p>Growva يُشغّله inventive gaze, LLC. توضح هذه السياسة وش نجمع من بياناتك وكيف نستخدمه.</p> },
  { h: '2. وش نجمع', body: L(['بريدك الإلكتروني (لتسجيل الدخول).', 'منتجاتك وتجاربك وقراراتك اللي تنشئها.', 'أعداد زيارات وتسجيلات مجهولة تُسجَّل عبر روابط التتبع حقتك.', 'الدفع يُعالج عند Stripe ولا نحفظ بيانات البطاقة.']) },
  { h: '3. كيف نستخدمها', body: <p>فقط لتشغيل الخدمة. ما نبيع بياناتك أبدًا، ولا نشاركها إلا مع مزودي الخدمة اللازمين للتشغيل (استضافة، بريد، دفع).</p> },
  { h: '4. حقوقك', body: <p>لك الحق في الوصول إلى بياناتك وتصحيحها وحذفها، وحذف حسابك. راسلنا على {SUPPORT_EMAIL}.</p> },
  { h: '5. الاتصال بنا', body: <p><a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: C.accent }}>{SUPPORT_EMAIL}</a></p> },
]
