'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CATALOG, ADDONS } from '@/lib/stripe'

export default function PricingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [showEmailFor, setShowEmailFor] = useState<string | null>(null)

  const checkout = async (priceKey: string) => {
    if (!email) { setShowEmailFor(priceKey); return }
    setLoading(priceKey)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceKey, email }),
      })
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(null)
    }
  }

  const s = {
    page: { minHeight: '100vh', background: '#08080A', fontFamily: "'DM Sans', -apple-system, sans-serif", color: '#fff' },
    wrap: { maxWidth: 1000, margin: '0 auto', padding: '80px 24px' },
    header: { textAlign: 'center' as const, marginBottom: 64 },
    h1: { fontSize: 48, fontWeight: 300, letterSpacing: -1.5, marginBottom: 16, lineHeight: 1.1 },
    sub: { fontSize: 16, color: '#8A8A9A', marginBottom: 32 },
    emailWrap: { display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 8 },
    input: { padding: '10px 16px', background: '#15151D', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 14, outline: 'none', width: 260, fontFamily: 'inherit' },
    emailNote: { fontSize: 12, color: '#5A5A6E', textAlign: 'center' as const },
    plansGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 48 },
    plan: { background: '#111116', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: '44px 40px', position: 'relative' as const },
    planFeatured: { background: '#111116', border: '1px solid #5B6EFF', borderRadius: 20, padding: '44px 40px', position: 'relative' as const },
    badge: { position: 'absolute' as const, top: -12, left: '50%', transform: 'translateX(-50%)', background: '#5B6EFF', color: '#fff', fontSize: 11, fontWeight: 600, padding: '4px 16px', borderRadius: 100, whiteSpace: 'nowrap' as const },
    planName: { fontSize: 12, color: '#5A5A6E', letterSpacing: 1.5, textTransform: 'uppercase' as const, marginBottom: 16 },
    price: { fontSize: 52, fontWeight: 300, letterSpacing: -2, lineHeight: 1, marginBottom: 6 },
    priceSub: { fontSize: 14, color: '#5A5A6E', marginBottom: 32 },
    divider: { height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 28 },
    features: { listStyle: 'none', display: 'flex', flexDirection: 'column' as const, gap: 10, marginBottom: 36 },
    feature: { fontSize: 14, color: '#8A8A9A', display: 'flex', alignItems: 'center', gap: 10 },
    scarcity: { fontSize: 12, color: '#5A5A6E', marginBottom: 16 },
    btnPrimary: { display: 'block', width: '100%', padding: 14, background: '#5B6EFF', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity 0.2s' },
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
          <h1 style={s.h1}>Simple pricing.</h1>
          <p style={s.sub}>Start free. Upgrade when you're growing.</p>

          <div style={s.emailWrap}>
            <input
              style={s.input}
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <p style={s.emailNote}>Enter your email once — used for all purchases below</p>
        </div>

        {/* PLANS */}
        <div style={s.plansGrid}>
          {CATALOG.map(plan => (
            <div key={plan.id} style={plan.id === 'founding' ? s.planFeatured : s.plan}>
              {plan.badge && <div style={s.badge}>{plan.badge}</div>}
              <div style={s.planName}>{plan.name}</div>
              <div style={s.price}>
                ${plan.price}
                {plan.type === 'recurring' && <span style={{ fontSize: 16, color: '#5A5A6E', fontWeight: 300 }}>/mo</span>}
                {plan.type === 'one_time' && <span style={{ fontSize: 16, color: '#5A5A6E', fontWeight: 300 }}> lifetime</span>}
              </div>
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
              <button
                style={plan.id === 'founding' ? s.btnPrimary : s.btnOutline}
                disabled={loading === plan.priceKey}
                onClick={() => checkout(plan.priceKey)}
              >
                {loading === plan.priceKey ? 'Redirecting...' : plan.id === 'founding' ? 'Get Founding Access →' : 'Start Growth plan'}
              </button>
            </div>
          ))}
        </div>

        {/* ADD-ONS */}
        <div style={s.addonsSection}>
          <div style={s.addonsLabel}>Add-ons</div>
          <div style={s.addonsGrid}>
            {ADDONS.map(addon => (
              <div key={addon.id} style={s.addon}>
                <div style={s.addonInfo}>
                  <div style={s.addonName}>{addon.name}</div>
                  <div style={s.addonDesc}>{addon.description}</div>
                </div>
                <div style={s.addonRight}>
                  <div style={s.addonPrice}>
                    ${addon.price}{addon.type === 'recurring' ? '/mo' : ''}
                  </div>
                  <button
                    style={s.addonBtn}
                    disabled={loading === addon.priceKey}
                    onClick={() => checkout(addon.priceKey)}
                  >
                    {loading === addon.priceKey ? '...' : 'Add →'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div style={s.faq}>
          <p style={s.faqText}>
            Questions? Email us at <span style={{ color: '#8A8A9A' }}>hello@revenueengine.co</span>
            &nbsp;·&nbsp; All payments secured by Stripe
            &nbsp;·&nbsp; Cancel anytime
          </p>
        </div>
      </div>
    </div>
  )
}
