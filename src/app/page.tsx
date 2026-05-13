'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Lang = 'en' | 'ar'
type AuthState = 'loading' | 'visitor' | 'user'

// ─── Color tokens — Linear-style, no orange dominant ─────────────────────────
const C = {
  bg:            '#09090B',
  surface:       '#111113',
  surfaceRaised: '#18181B',
  border:        'rgba(255,255,255,0.08)',
  borderSubtle:  'rgba(255,255,255,0.05)',
  text:          '#FAFAFA',
  textSecondary: '#A1A1AA',
  textMuted:     '#71717A',
  textDim:       '#3F3F46',
  continue:      '#3B82F6',
  scale:         '#22C55E',
  kill:          '#EF4444',
  foundingBorder:'rgba(250,250,250,0.2)',
}

// ─── Bilingual copy ───────────────────────────────────────────────────────────
const COPY = {
  en: {
    nav: {
      pricing: 'Pricing',
      cta_visitor: 'Start your first experiment',
      cta_user: 'Open dashboard',
    },
    hero: {
      headline_1: 'Stop wasting weeks on experiments',
      headline_2: 'that should have died in days.',
      sub: 'Growva helps solo founders turn growth experiments into clear decisions: what to test, what to stop, what to continue, and what to scale — using real signals, not gut feeling.',
      cta_visitor: 'Start your first experiment',
      cta_user: 'Open dashboard',
      cta_secondary: 'See how it works ↓',
    },
    card: {
      verdict: 'CONTINUE',
      experiment: '"Ship faster. Decide smarter."',
      stats: '142 visits · 3 signups',
      threshold_label: 'THRESHOLD',
      threshold: '300 visits or 10 signups',
      reason_label: 'REASON',
      reason: 'Signal exists, but the sample is still too small.',
      next_label: 'NEXT ACTION',
      next: "Keep running. Don't change the headline yet.",
    },
    paths: {
      section_label: 'Two paths into Growva',
      title: 'Do you have traffic?',
      yes_title: 'Yes, I have traffic',
      yes_body: 'Use a tracking link or site snippet. Growva collects clicks, signups, and purchases in real time — and turns them into a decision.',
      no_title: 'No traffic yet',
      no_body: 'Growva creates a 48-hour sprint — gives you the script and a tracking link, then turns the results into a decision.',
    },
    tracking: {
      section_label: 'Signal collection',
      title: 'Two ways to collect signal',
      link_title: 'Tracking Link',
      link_body: 'For posts, DMs, X, Reddit, emails. Growva measures every click and its source.',
      snippet_title: 'Site Snippet',
      snippet_body: 'For landing pages. Measures page views, signups, and purchases automatically.',
    },
    how: {
      section_label: 'How it works',
      title: 'Three steps from question to decision',
      steps: [
        { n: '01', title: 'Add your product and hypothesis', body: 'Define what you\'re testing and who it\'s for. Growva structures the experiment around a clear goal.' },
        { n: '02', title: 'Run the experiment', body: 'No traffic? Run a 48-hour sprint. Have traffic? Track it with a link or snippet. Growva collects the signal either way.' },
        { n: '03', title: 'Get the decision', body: 'Scale, Continue, or Stop — with a reason, based on real numbers. Not a vague recommendation.' },
      ],
    },
    pricing: {
      section_label: 'Pricing',
      title: 'One tool. One decision at a time.',
      beta: {
        label: 'Private Beta',
        price: 'Free while in beta',
        note: 'Controlled access · Not a public free plan',
        features: [
          '1 product',
          'Core decision engine',
          'Tracking link',
          '48-hour sprint mode',
          'Beta feedback access',
        ],
        cta: 'Join private beta',
        disclaimer: 'Beta is limited and controlled. We may close access at any time.',
      },
      founding: {
        badge: 'Main Offer',
        label: 'Founding Access',
        price: '$199',
        period: 'one-time · lifetime',
        note: 'First 1,000 founders only. Price increases after.',
        features: [
          '1 product',
          'Core decision engine',
          'Sprint mode',
          'Site snippet',
          'Tracking links',
          'Decision feed',
          'All future core updates',
        ],
        cta: 'Get Founding Access — $199',
      },
      growth: {
        label: 'Growth',
        price: '$99',
        period: '/month',
        for: 'For later-stage founders',
        features: [
          'Multiple products',
          'Advanced automation',
          'Memory systems',
          'Operator tools',
          'Higher tracking capacity',
        ],
        cta: 'Coming after founding access',
        note: 'Available after the founding round closes.',
      },
    },
    final: {
      headline: 'Stop guessing. Start deciding.',
      sub: 'Founding access · $199 · 1,000 spots only.',
      cta_visitor: 'Start your first experiment →',
      cta_user: 'Open dashboard →',
    },
    footer: {
      tagline: 'Decision infrastructure for solo founders.',
      legal: 'All payments secured by Stripe',
      email: 'hello@growva.co',
    },
  },
  ar: {
    nav: {
      pricing: 'الأسعار',
      cta_visitor: 'ابدأ أول تجربة',
      cta_user: 'افتح لوحة التحكم',
    },
    hero: {
      headline_1: 'لا تضيع أسابيع على تجربة',
      headline_2: 'كان المفروض توقفها من أول يومين.',
      sub: 'Growva يساعد المؤسس الفردي يحوّل التجارب إلى قرارات واضحة: وش تختبر، وش توقف، وش تكمل، وش تكبر — بناءً على إشارات حقيقية، مو إحساس.',
      cta_visitor: 'ابدأ أول تجربة',
      cta_user: 'افتح لوحة التحكم',
      cta_secondary: 'كيف يعمل؟ ↓',
    },
    card: {
      verdict: 'استمر',
      experiment: '"اشحن أسرع. قرر بذكاء."',
      stats: '142 زيارة · 3 تسجيلات',
      threshold_label: 'الحد الأدنى',
      threshold: '300 زيارة أو 10 تسجيلات',
      reason_label: 'السبب',
      reason: 'الإشارة موجودة، لكن العينة لا تزال صغيرة.',
      next_label: 'الخطوة التالية',
      next: 'استمر في نفس التجربة. لا تغيّر العنوان الآن.',
    },
    paths: {
      section_label: 'طريقتان للدخول إلى Growva',
      title: 'هل عندك زيارات؟',
      yes_title: 'نعم، عندي زيارات',
      yes_body: 'استخدم رابط التتبع أو كود الموقع. Growva يجمع الكليكات والتسجيلات والمشتريات لحظة بلحظة — ويحوّلها لقرار.',
      no_title: 'ما عندي زيارات بعد',
      no_body: 'Growva يعطيك Sprint لـ 48 ساعة — سكريبت جاهز، رابط تتبع، والنتيجة تتحول لقرار واضح.',
    },
    tracking: {
      section_label: 'جمع الإشارة',
      title: 'طريقتان لجمع الإشارة',
      link_title: 'رابط التتبع',
      link_body: 'للبوستات، DMs، X، Reddit، الإيميل. Growva يقيس كل كليك ومصدره.',
      snippet_title: 'كود الموقع',
      snippet_body: 'لصفحة الهبوط. يقيس الزيارات، التسجيلات، والمشتريات تلقائياً.',
    },
    how: {
      section_label: 'كيف يعمل',
      title: 'ثلاث خطوات من السؤال إلى القرار',
      steps: [
        { n: '01', title: 'أضف منتجك وفرضيتك', body: 'حدد ما تختبره ومن هو جمهورك. Growva يبني التجربة حول هدف واضح.' },
        { n: '02', title: 'شغّل التجربة', body: 'ما عندك traffic؟ شغّل Sprint لـ 48 ساعة. عندك traffic؟ تتبّعه برابط أو كود. Growva يجمع الإشارة بكل الحالات.' },
        { n: '03', title: 'احصل على القرار', body: 'كبّر، استمر، أو أوقف — مع السبب، بناءً على أرقام حقيقية. مو توصية مبهمة.' },
      ],
    },
    pricing: {
      section_label: 'الأسعار',
      title: 'أداة واحدة. قرار واحد في كل مرة.',
      beta: {
        label: 'البيتا الخاصة',
        price: 'مجاني أثناء البيتا',
        note: 'وصول محدود · غير متاح للعموم',
        features: [
          'منتج واحد',
          'محرك القرار الأساسي',
          'رابط التتبع',
          'وضع Sprint لـ 48 ساعة',
          'وصول تجريبي',
        ],
        cta: 'انضم للبيتا الخاصة',
        disclaimer: 'البيتا محدودة ومضبوطة. قد نوقف التسجيل في أي وقت.',
      },
      founding: {
        badge: 'العرض الأساسي',
        label: 'وصول المؤسسين',
        price: '$199',
        period: 'دفعة واحدة · مدى الحياة',
        note: 'أول 1,000 مؤسس فقط. السعر يرتفع بعدها.',
        features: [
          'منتج واحد',
          'محرك القرار الأساسي',
          'وضع Sprint',
          'كود الموقع',
          'روابط التتبع',
          'سجل القرارات',
          'جميع التحديثات الأساسية',
        ],
        cta: 'احصل على وصول المؤسسين — $199',
      },
      growth: {
        label: 'النمو',
        price: '$99',
        period: '/شهر',
        for: 'للمؤسسين في مراحل متقدمة',
        features: [
          'منتجات متعددة',
          'أتمتة متقدمة',
          'أنظمة الذاكرة',
          'أدوات المشغّل',
          'طاقة تتبع أعلى',
        ],
        cta: 'متاح بعد جولة المؤسسين',
        note: 'يُتاح بعد إغلاق جولة المؤسسين.',
      },
    },
    final: {
      headline: 'توقف عن التخمين. ابدأ القرار.',
      sub: 'وصول المؤسسين · $199 · 1,000 مقعد فقط.',
      cta_visitor: 'ابدأ أول تجربة →',
      cta_user: 'افتح لوحة التحكم →',
    },
    footer: {
      tagline: 'بنية تحتية للقرار — للمؤسسين المستقلين.',
      legal: 'جميع المدفوعات مؤمّنة عبر Stripe',
      email: 'hello@growva.co',
    },
  },
}

// ─── Decision Card ────────────────────────────────────────────────────────────
function DecisionCard({ c: copy, isAr }: { c: typeof COPY['en']['card']; isAr: boolean }) {
  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 16,
      padding: '28px 28px',
      width: '100%',
      maxWidth: 340,
      fontFamily: 'inherit',
    }}>
      {/* Verdict badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.continue, flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: C.continue, letterSpacing: 1.2, textTransform: 'uppercase' }}>
          {copy.verdict}
        </span>
      </div>

      {/* Experiment name */}
      <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 4, fontStyle: 'italic' }}>
        {copy.experiment}
      </div>

      {/* Stats */}
      <div style={{ fontSize: 20, fontWeight: 600, color: C.text, marginBottom: 20, letterSpacing: -0.5 }}>
        {copy.stats}
      </div>

      <div style={{ height: 1, background: C.border, marginBottom: 20 }} />

      {/* Threshold */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>
          {copy.threshold_label}
        </div>
        <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.5 }}>
          {copy.threshold}
        </div>
      </div>

      {/* Reason */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>
          {copy.reason_label}
        </div>
        <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.5 }}>
          {copy.reason}
        </div>
      </div>

      {/* Next action */}
      <div style={{ background: C.surfaceRaised, borderRadius: 10, padding: '12px 14px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>
          {copy.next_label}
        </div>
        <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5, fontWeight: 500 }}>
          {copy.next}
        </div>
      </div>
    </div>
  )
}

// ─── Label ────────────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16 }}>
      {children}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [lang, setLang] = useState<Lang>('en')
  const [auth, setAuth] = useState<AuthState>('loading')
  const isAr = lang === 'ar'
  const c = COPY[lang]
  const isLoggedIn = auth === 'user'

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(user => setAuth(user ? 'user' : 'visitor'))
      .catch(() => setAuth('visitor'))
  }, [])

  const heroCta = isLoggedIn ? c.hero.cta_user : c.hero.cta_visitor
  const heroCtaHref = isLoggedIn ? '/dashboard' : '/login'
  const navCta = isLoggedIn ? c.nav.cta_user : c.nav.cta_visitor

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      style={{
        minHeight: '100vh',
        background: C.bg,
        fontFamily: isAr
          ? "'Segoe UI', 'Arial', sans-serif"
          : "'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', sans-serif",
        color: C.text,
        overflowX: 'hidden',
      }}
    >
      {/* ── NAV ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(9,9,11,0.9)', backdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${C.border}`,
        padding: '0 28px', height: 52,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: -0.3, color: C.text }}>
          Growva
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Language toggle */}
          <button
            onClick={() => setLang(isAr ? 'en' : 'ar')}
            style={{
              padding: '5px 12px', background: 'transparent', border: `1px solid ${C.border}`,
              color: C.textMuted, fontSize: 12, fontWeight: 500, borderRadius: 7, cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {isAr ? 'EN' : 'ع'}
          </button>
          <a href="#pricing" style={{ padding: '6px 14px', color: C.textMuted, fontSize: 13, textDecoration: 'none' }}>
            {c.nav.pricing}
          </a>
          <Link
            href={isLoggedIn ? '/dashboard' : '/login'}
            style={{
              padding: '7px 16px', background: C.text, color: C.bg,
              fontSize: 13, fontWeight: 600, textDecoration: 'none', borderRadius: 8,
            }}
          >
            {navCta}
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ paddingTop: 120, paddingBottom: 80 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 28px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '48px 64px',
            alignItems: 'center',
          }}>
            {/* Copy */}
            <div>
              <h1 style={{
                fontSize: 'clamp(32px, 5vw, 52px)',
                fontWeight: 700,
                letterSpacing: -1.5,
                lineHeight: 1.1,
                margin: '0 0 24px',
                color: C.text,
              }}>
                {c.hero.headline_1}<br />
                <span style={{ color: C.textSecondary }}>{c.hero.headline_2}</span>
              </h1>
              <p style={{
                fontSize: 17,
                color: C.textSecondary,
                lineHeight: 1.7,
                margin: '0 0 36px',
                maxWidth: 480,
                fontWeight: 400,
              }}>
                {c.hero.sub}
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Link
                  href={heroCtaHref}
                  style={{
                    padding: '13px 28px', background: C.text, color: C.bg,
                    fontSize: 14, fontWeight: 600, textDecoration: 'none', borderRadius: 10,
                    display: 'inline-block',
                  }}
                >
                  {heroCta}
                </Link>
                <a
                  href="#how"
                  style={{
                    padding: '13px 24px',
                    background: 'transparent',
                    border: `1px solid ${C.border}`,
                    color: C.textSecondary,
                    fontSize: 14, textDecoration: 'none', borderRadius: 10,
                    display: 'inline-block',
                  }}
                >
                  {c.hero.cta_secondary}
                </a>
              </div>
            </div>

            {/* Decision Card */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <DecisionCard c={c.card} isAr={isAr} />
            </div>
          </div>
        </div>
      </section>

      {/* ── TWO PATHS ── */}
      <section style={{ borderTop: `1px solid ${C.border}`, padding: '80px 28px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <SectionLabel>{c.paths.section_label}</SectionLabel>
          <h2 style={{ fontSize: 'clamp(22px, 3.5vw, 32px)', fontWeight: 600, letterSpacing: -0.8, margin: '0 0 40px', color: C.text }}>
            {c.paths.title}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {[
              { title: c.paths.yes_title, body: c.paths.yes_body, icon: '📡' },
              { title: c.paths.no_title,  body: c.paths.no_body,  icon: '⚡' },
            ].map(({ title, body, icon }) => (
              <div key={title} style={{
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 14, padding: '28px 28px',
              }}>
                <div style={{ fontSize: 24, marginBottom: 14 }}>{icon}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 10, letterSpacing: -0.2 }}>
                  {title}
                </div>
                <div style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.7 }}>
                  {body}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRACKING ── */}
      <section style={{ borderTop: `1px solid ${C.border}`, padding: '80px 28px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <SectionLabel>{c.tracking.section_label}</SectionLabel>
          <h2 style={{ fontSize: 'clamp(22px, 3.5vw, 32px)', fontWeight: 600, letterSpacing: -0.8, margin: '0 0 40px', color: C.text }}>
            {c.tracking.title}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {[
              {
                title: c.tracking.link_title,
                body: c.tracking.link_body,
                tag: isAr ? 'رابط' : 'Link',
                tagColor: '#6366F1',
              },
              {
                title: c.tracking.snippet_title,
                body: c.tracking.snippet_body,
                tag: isAr ? 'كود' : 'Snippet',
                tagColor: '#0EA5E9',
              },
            ].map(({ title, body, tag, tagColor }) => (
              <div key={title} style={{
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 14, padding: '28px 28px',
              }}>
                <div style={{
                  display: 'inline-block', padding: '3px 10px', borderRadius: 6,
                  background: `${tagColor}18`, border: `1px solid ${tagColor}30`,
                  color: tagColor, fontSize: 11, fontWeight: 700, letterSpacing: 0.8,
                  marginBottom: 14,
                }}>
                  {tag}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 10, letterSpacing: -0.2 }}>
                  {title}
                </div>
                <div style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.7 }}>
                  {body}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" style={{ borderTop: `1px solid ${C.border}`, padding: '80px 28px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <SectionLabel>{c.how.section_label}</SectionLabel>
          <h2 style={{ fontSize: 'clamp(22px, 3.5vw, 32px)', fontWeight: 600, letterSpacing: -0.8, margin: '0 0 40px', color: C.text }}>
            {c.how.title}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {c.how.steps.map(({ n, title, body }) => (
              <div key={n} style={{
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 14, padding: '28px 28px',
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.textDim, letterSpacing: 1.5, marginBottom: 18 }}>{n}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 10, letterSpacing: -0.2, lineHeight: 1.35 }}>
                  {title}
                </div>
                <div style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.7 }}>
                  {body}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{ borderTop: `1px solid ${C.border}`, padding: '80px 28px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ marginBottom: 48 }}>
            <SectionLabel>{c.pricing.section_label}</SectionLabel>
            <h2 style={{ fontSize: 'clamp(22px, 3.5vw, 32px)', fontWeight: 600, letterSpacing: -0.8, margin: 0, color: C.text }}>
              {c.pricing.title}
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, alignItems: 'start' }}>

            {/* ── Beta ── */}
            <div style={{
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 16, padding: '32px 28px',
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16 }}>
                {c.pricing.beta.label}
              </div>
              <div style={{ fontSize: 22, fontWeight: 600, color: C.text, marginBottom: 4, letterSpacing: -0.5 }}>
                {c.pricing.beta.price}
              </div>
              <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 24 }}>
                {c.pricing.beta.note}
              </div>
              <div style={{ height: 1, background: C.border, marginBottom: 20 }} />
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {c.pricing.beta.features.map(f => (
                  <li key={f} style={{ fontSize: 13, color: C.textSecondary, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: C.textMuted, flexShrink: 0 }}>+</span> {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                style={{
                  display: 'block', padding: '12px 0', textAlign: 'center',
                  background: 'transparent', border: `1px solid ${C.border}`,
                  color: C.text, fontSize: 13, fontWeight: 600,
                  textDecoration: 'none', borderRadius: 9,
                }}
              >
                {c.pricing.beta.cta}
              </Link>
              <p style={{ fontSize: 11, color: C.textDim, margin: '14px 0 0', lineHeight: 1.5, textAlign: 'center' }}>
                {c.pricing.beta.disclaimer}
              </p>
            </div>

            {/* ── Founding (main offer) ── */}
            <div style={{
              background: C.surface,
              border: `1px solid ${C.foundingBorder}`,
              borderRadius: 16, padding: '32px 28px',
              position: 'relative',
            }}>
              {/* Badge */}
              <div style={{
                position: 'absolute', top: -13,
                left: isAr ? undefined : '50%',
                right: isAr ? '50%' : undefined,
                transform: 'translateX(-50%)',
                background: C.text, color: C.bg,
                fontSize: 11, fontWeight: 700, padding: '4px 16px',
                borderRadius: 100, whiteSpace: 'nowrap', letterSpacing: 0.5,
              }}>
                {c.pricing.founding.badge}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.text, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16 }}>
                {c.pricing.founding.label}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 40, fontWeight: 700, color: C.text, letterSpacing: -1.5, lineHeight: 1 }}>
                  {c.pricing.founding.price}
                </span>
              </div>
              <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>
                {c.pricing.founding.period}
              </div>
              <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 24 }}>
                {c.pricing.founding.note}
              </div>
              <div style={{ height: 1, background: C.border, marginBottom: 20 }} />
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {c.pricing.founding.features.map(f => (
                  <li key={f} style={{ fontSize: 13, color: C.textSecondary, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: C.text, flexShrink: 0 }}>+</span> {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/pricing"
                style={{
                  display: 'block', padding: '13px 0', textAlign: 'center',
                  background: C.text, color: C.bg,
                  fontSize: 13, fontWeight: 700,
                  textDecoration: 'none', borderRadius: 9,
                }}
              >
                {c.pricing.founding.cta}
              </Link>
            </div>

            {/* ── Growth ── */}
            <div style={{
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 16, padding: '32px 28px',
              opacity: 0.75,
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16 }}>
                {c.pricing.growth.label}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                <span style={{ fontSize: 40, fontWeight: 700, color: C.text, letterSpacing: -1.5, lineHeight: 1 }}>
                  {c.pricing.growth.price}
                </span>
                <span style={{ fontSize: 14, color: C.textMuted, fontWeight: 400 }}>
                  {c.pricing.growth.period}
                </span>
              </div>
              <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 24 }}>
                {c.pricing.growth.for}
              </div>
              <div style={{ height: 1, background: C.border, marginBottom: 20 }} />
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {c.pricing.growth.features.map(f => (
                  <li key={f} style={{ fontSize: 13, color: C.textSecondary, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: C.textMuted, flexShrink: 0 }}>+</span> {f}
                  </li>
                ))}
              </ul>
              <div style={{
                display: 'block', padding: '12px 0', textAlign: 'center',
                background: 'transparent', border: `1px solid ${C.border}`,
                color: C.textMuted, fontSize: 13, borderRadius: 9,
              }}>
                {c.pricing.growth.cta}
              </div>
              <p style={{ fontSize: 11, color: C.textDim, margin: '14px 0 0', lineHeight: 1.5, textAlign: 'center' }}>
                {c.pricing.growth.note}
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ borderTop: `1px solid ${C.border}`, padding: '80px 28px', textAlign: 'center' }}>
        <div style={{ maxWidth: 540, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(26px, 4.5vw, 42px)', fontWeight: 700, letterSpacing: -1.2, lineHeight: 1.1, margin: '0 0 16px', color: C.text }}>
            {c.final.headline}
          </h2>
          <p style={{ fontSize: 15, color: C.textMuted, margin: '0 0 36px', lineHeight: 1.6 }}>
            {c.final.sub}
          </p>
          <Link
            href={heroCtaHref}
            style={{
              display: 'inline-block', padding: '14px 36px',
              background: C.text, color: C.bg,
              fontSize: 15, fontWeight: 700,
              textDecoration: 'none', borderRadius: 11,
            }}
          >
            {isLoggedIn ? c.final.cta_user : c.final.cta_visitor}
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: `1px solid ${C.border}`, padding: '28px 28px', textAlign: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 8 }}>Growva</div>
        <p style={{ fontSize: 12, color: C.textDim, margin: '0 0 4px' }}>{c.footer.tagline}</p>
        <p style={{ fontSize: 12, color: C.textDim, margin: 0 }}>
          {c.footer.legal} ·{' '}
          <a href={`mailto:${c.footer.email}`} style={{ color: C.textDim, textDecoration: 'none' }}>
            {c.footer.email}
          </a>
        </p>
      </footer>
    </div>
  )
}
