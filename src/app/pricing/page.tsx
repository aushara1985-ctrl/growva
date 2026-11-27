'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CATALOG } from '@/lib/stripe'

export default function PricingPage() {
  const router = useRouter()
  // Ali 2026-11-27: yearly first and selected by default (2 months free = 10x monthly). Display only: the recurring plan is
  // still 'coming after the founding round' and no payment is live during the private beta.
  const [yearly, setYearly] = useState(true)

  // During the private beta, founding access is reserved via beta signup —
  // payment opens once the core offer is validated. Add-ons are intentionally
  // not offered yet (no upsells before the core product proves out).
  const claimFounding = () => router.push('/login?from=/dashboard')

  const s = {
    page: { minHeight: '100vh', background: '#08080A', fontFamily: "'DM Sans', -apple-system, sans-serif", color: '#fff' },
    wrap: { maxWidth: 1000, margin: '0 auto', padding: '80px 24px' },
    header: { textAlign: 'center' as const, marginBottom: 64 },
    h1: { fontSize: 48, fontWeight: 300, letterSpacing: -1.5, marginBottom: 16, lineHeight: 1.1 },
    sub: { fontSize: 16, color: '#8A8A9A', marginBottom: 32 },
    emailWrap: { display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 8 },
    input: { padding: '10px 16px', background: '#15151D', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 14, outline: 'none', width: 260, fontFamily: 'inherit' },
    emailNote: { fontSize: 12, color: '#5A5A6E', textAlign: 'center' as const },
    plansGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 16, marginBottom: 48 },
    plan: { background: '#111116', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: '44px 40px', position: 'relative' as const },
    planFeatured: { background: '#111116', border: '1px solid #E8A020', borderRadius: 20, padding: '44px 40px', position: 'relative' as const },
    badge: { position: 'absolute' as const, top: -12, left: '50%', transform: 'translateX(-50%)', background: '#E8A020', color: '#fff', fontSize: 11, fontWeight: 600, padding: '4px 16px', borderRadius: 100, whiteSpace: 'nowrap' as const },
    planName: { fontSize: 12, color: '#5A5A6E', letterSpacing: 1.5, textTransform: 'uppercase' as const, marginBottom: 16 },
    price: { fontSize: 52, fontWeight: 300, letterSpacing: -2, lineHeight: 1, marginBottom: 6 },
    priceSub: { fontSize: 14, color: '#5A5A6E', marginBottom: 32 },
    divider: { height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 28 },
    features: { listStyle: 'none', display: 'flex', flexDirection: 'column' as const, gap: 10, marginBottom: 36 },
    feature: { fontSize: 14, color: '#8A8A9A', display: 'flex', alignItems: 'center', gap: 10 },
    scarcity: { fontSize: 12, color: '#5A5A6E', marginBottom: 16 },
    btnPrimary: { display: 'block', width: '100%', padding: 14, background: '#E8A020', color: '#000', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity 0.2s' },
    btnOutline: { display: 'block', width: '100%', padding: 14, background: 'transparent', color: '#8A8A9A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' },
    addonsSection: { marginBottom: 48 },
    addonsLabel: { fontSize: 11, color: '#5A5A6E', letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 20 },
    addonsGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 },
    addon: { background: '#111116', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
    addonInfo: {},
    addonName: { fontSize: 14, fontWeight: 400, marginBottom: 4 },
    addonDesc: { fontSize: 12, color: '#5A5A6E' },
    addonRight: { display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 },
    addonPrice: { fontSize: 15, fontWeight: 400, color: '#fff' },
    addonBtn: { padding: '7px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, color: '#8A8A9A', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' as const },
    faq: { textAlign: 'center' as const, paddingTop: 48, borderTop: '1px solid rgba(255,255,255,0.06)' },
    faqText: { fontSize: 14, color: '#5A5A6E' },
  }

  const checkMark = (
    <span style={{ width: 16, height: 16, borderRadius: '50%', background: 'rgba(29,235,122,0.12)', border: '1px solid rgba(29,235,122,0.25)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 9, color: '#1DEB7A' }}>✓</span>
  )

  return (
    <div style={s.page}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />

      <div style={s.wrap}>
        <div style={s.header}>
          <h1 style={s.h1}>One tool. One decision at a time.</h1>
          <p style={s.sub}>Founding access for builders who are serious about knowing what works.</p>
        </div>

        <div role="group" aria-label="Billing period" style={{ display: 'flex', justifyContent: 'center', gap: 4, padding: 4, margin: '0 auto 28px', width: 'max-content', maxWidth: '100%', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 999 }}>
          <button type="button" aria-pressed={yearly} onClick={() => setYearly(true)} style={{ padding: '9px 18px', border: 'none', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: yearly ? '#E8A020' : 'transparent', color: yearly ? '#000' : '#8A8A9A' }}>Yearly · save 17%</button>
          <button type="button" aria-pressed={!yearly} onClick={() => setYearly(false)} style={{ padding: '9px 18px', border: 'none', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: !yearly ? '#E8A020' : 'transparent', color: !yearly ? '#000' : '#8A8A9A' }}>Monthly</button>
        </div>

        {/* PLANS */}
        <div style={s.plansGrid}>
          {CATALOG.map(plan => (
            <div key={plan.id} style={plan.id === 'founding' ? s.planFeatured : s.plan}>
              {plan.badge && <div style={s.badge}>{plan.badge}</div>}
              <div style={s.planName}>{plan.name}</div>
              <div style={s.price}>
                ${plan.type === 'recurring' && yearly ? (plan.price * 10 / 12).toFixed(2) : plan.price}
                {plan.type === 'recurring' && <span style={{ fontSize: 16, color: '#5A5A6E', fontWeight: 300 }}>/mo</span>}
                {plan.type === 'one_time' && <span style={{ fontSize: 16, color: '#5A5A6E', fontWeight: 300 }}> lifetime</span>}
              </div>
              {plan.type === 'recurring' && (
                <div style={{ fontSize: 12, color: '#E8A020', marginBottom: 8 }}>
                  {yearly ? `Billed $${plan.price * 10} once a year · save 17%` : 'Billed monthly at the full price'}
                </div>
              )}
              <div style={s.priceSub}>{plan.description}</div>
              <div style={s.divider} />
              <ul style={s.features}>
                {plan.features.map(f => (
                  <li key={f} style={s.feature}>{checkMark}{f}</li>
                ))}
              </ul>
              {plan.id === 'founding' && (
                <p style={s.scarcity}>Only <strong style={{ color: '#fff', fontWeight: 400 }}>1,000 spots.</strong> Price goes up after.</p>
              )}
              {plan.id === 'founding' ? (
                <button style={s.btnPrimary} onClick={claimFounding}>
                  Claim your founding spot →
                </button>
              ) : (
                <button style={{ ...s.btnOutline, opacity: 0.55, cursor: 'default' }} disabled>
                  Coming after founding round
                </button>
              )}
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div style={s.faq}>
          <p style={s.faqText}>
            Questions? Email us at <span style={{ color: '#8A8A9A' }}>hello@growva.co</span>
            &nbsp;·&nbsp; All payments secured by Stripe
          </p>
          <p style={s.faqText}>
            <a href="/terms" style={{ color: '#8A8A9A' }}>Terms</a> · <a href="/privacy" style={{ color: '#8A8A9A' }}>Privacy</a> · <a href="/terms#refund" style={{ color: '#8A8A9A' }}>Refund &amp; Cancellation</a> · <a href="/terms#contact" style={{ color: '#8A8A9A' }}>Contact</a>
          </p>
          <p style={s.faqText}>Operated by inventive gaze, LLC · يُشغّل هذا المنتج من قبل inventive gaze, LLC</p>
        </div>
      </div>
    </div>
  )
}
