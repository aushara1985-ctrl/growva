import Link from 'next/link'

const AMBER  = '#E8A020'
const MUTED  = '#6A6A7A'
const DIM    = '#3A3A48'
const BORDER = 'rgba(255,255,255,0.07)'

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#08080A', fontFamily: "'DM Sans', -apple-system, sans-serif", color: '#F2F0E8', overflowX: 'hidden' }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,300&display=swap" rel="stylesheet" />

      {/* ── NAV ── */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(8,8,10,0.92)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${BORDER}`, padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: AMBER, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#000' }}>G</div>
          <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: -0.3 }}>Growva</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <a href="#pricing" style={{ padding: '7px 16px', color: MUTED, fontSize: 13, textDecoration: 'none', borderRadius: 8 }}>Pricing</a>
          <Link href="/dashboard" style={{ padding: '7px 18px', background: AMBER, color: '#000', fontSize: 13, fontWeight: 700, textDecoration: 'none', borderRadius: 8 }}>Open App →</Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ paddingTop: 160, paddingBottom: 100, textAlign: 'center', maxWidth: 760, margin: '0 auto', padding: '160px 24px 100px' }}>
        <h1 style={{ fontSize: 'clamp(42px, 7vw, 68px)', fontWeight: 300, letterSpacing: -3, lineHeight: 1.08, margin: '0 0 28px', color: '#F2F0E8' }}>
          Run the experiment.<br />Get the decision.
        </h1>

        <p style={{ fontSize: 18, color: MUTED, lineHeight: 1.75, maxWidth: 500, margin: '0 auto 48px', fontWeight: 400 }}>
          Growva structures your growth experiments, monitors the results, and tells you what to scale, kill, or iterate — before you waste another month.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="#pricing" style={{ padding: '14px 32px', background: AMBER, color: '#000', fontSize: 15, fontWeight: 700, textDecoration: 'none', borderRadius: 10 }}>
            Get Founding Access — $199
          </a>
          <Link href="/dashboard" style={{ padding: '14px 28px', background: 'rgba(255,255,255,0.05)', color: '#F2F0E8', fontSize: 15, textDecoration: 'none', borderRadius: 10, border: `1px solid ${BORDER}` }}>
            Open dashboard
          </Link>
        </div>

        <p style={{ marginTop: 20, fontSize: 12, color: DIM }}>First 1,000 founders only · Lifetime access · No monthly fees</p>
      </section>

      {/* ── CONVICTION ── */}
      <section style={{ borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, padding: '56px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 'clamp(17px, 3vw, 22px)', fontWeight: 300, color: '#F2F0E8', maxWidth: 540, margin: '0 auto 28px', letterSpacing: -0.4, lineHeight: 1.5 }}>
          Growva doesn't automate your growth.<br />It structures your decisions.
        </p>
        <div style={{ display: 'flex', gap: 48, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            'Every experiment has a hypothesis.',
            'Every result has a verdict.',
            'Every decision has a reason.',
          ].map(line => (
            <span key={line} style={{ fontSize: 13, color: MUTED, letterSpacing: 0.1 }}>{line}</span>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '100px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{ fontSize: 11, color: MUTED, letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 16 }}>How Growva works</div>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 300, letterSpacing: -1.5, margin: 0 }}>Three steps from question to decision</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
          {[
            {
              n: '01',
              title: "Define what you're testing",
              body: 'Add your product, your target user, and the outcome that matters. Growva generates 3 structured experiments tailored to your goal.',
            },
            {
              n: '02',
              title: 'Activate an experiment',
              body: 'Run it on your own channels. When you go live, tell Growva. It opens a 48-hour monitoring window and starts collecting signal.',
            },
            {
              n: '03',
              title: 'Get the verdict',
              body: 'Scale, kill, or iterate. Growva tells you exactly why — based on what happened, not gut feel. Then it structures the next experiment.',
            },
          ].map(({ n, title, body }) => (
            <div key={n} style={{ background: '#0F0F12', border: `1px solid ${BORDER}`, borderRadius: 16, padding: '32px 28px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: AMBER, letterSpacing: 2, marginBottom: 20 }}>{n}</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, letterSpacing: -0.3, lineHeight: 1.3 }}>{title}</div>
              <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.75 }}>{body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{ background: '#0A0A0D', borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, padding: '100px 24px' }}>
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ fontSize: 11, color: MUTED, letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 16 }}>Pricing</div>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 300, letterSpacing: -1.5, margin: '0 0 12px' }}>One tool. One decision at a time.</h2>
            <p style={{ fontSize: 16, color: MUTED, margin: 0 }}>Founding access for builders who are serious about knowing what works.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            {/* Founding plan */}
            <div style={{ background: '#111114', border: `1px solid ${AMBER}44`, borderRadius: 20, padding: '40px 36px', position: 'relative' as const }}>
              <div style={{ position: 'absolute' as const, top: -13, left: '50%', transform: 'translateX(-50%)', background: AMBER, color: '#000', fontSize: 11, fontWeight: 700, padding: '4px 18px', borderRadius: 100, whiteSpace: 'nowrap' as const, letterSpacing: 0.5 }}>
                Founding Access
              </div>
              <div style={{ fontSize: 11, color: MUTED, letterSpacing: 1.5, textTransform: 'uppercase' as const, marginBottom: 16 }}>One-time</div>
              <div style={{ fontSize: 52, fontWeight: 300, letterSpacing: -2, lineHeight: 1, marginBottom: 6 }}>$199</div>
              <div style={{ fontSize: 14, color: MUTED, marginBottom: 32 }}>1 product · Lifetime access · First 1,000</div>
              <div style={{ height: 1, background: BORDER, marginBottom: 24 }} />
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'flex', flexDirection: 'column' as const, gap: 11 }}>
                {[
                  'Structured experiment framework',
                  '48-hour decision window',
                  'Scale · Kill · Iterate verdicts',
                  'Tracking links per experiment',
                  'All future releases',
                ].map(f => (
                  <li key={f} style={{ fontSize: 14, color: '#9A9A9A', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: AMBER, fontWeight: 700, flexShrink: 0 }}>+</span> {f}
                  </li>
                ))}
              </ul>
              <p style={{ fontSize: 12, color: DIM, marginBottom: 16 }}>Only <strong style={{ color: '#F2F0E8', fontWeight: 400 }}>1,000 spots.</strong> Price increases after.</p>
              <Link href="/pricing" style={{ display: 'block', padding: '14px 0', background: AMBER, color: '#000', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: 'none', textAlign: 'center' as const }}>
                Get Founding Access →
              </Link>
            </div>

            {/* Growth plan */}
            <div style={{ background: '#111114', border: `1px solid ${BORDER}`, borderRadius: 20, padding: '40px 36px' }}>
              <div style={{ fontSize: 11, color: MUTED, letterSpacing: 1.5, textTransform: 'uppercase' as const, marginBottom: 16 }}>Monthly</div>
              <div style={{ fontSize: 52, fontWeight: 300, letterSpacing: -2, lineHeight: 1, marginBottom: 6 }}>
                $99<span style={{ fontSize: 16, color: MUTED, fontWeight: 300 }}>/mo</span>
              </div>
              <div style={{ fontSize: 14, color: MUTED, marginBottom: 32 }}>Multiple products · Full decision history</div>
              <div style={{ height: 1, background: BORDER, marginBottom: 24 }} />
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'flex', flexDirection: 'column' as const, gap: 11 }}>
                {[
                  '5 products',
                  'Full decision history',
                  'Winning pattern memory',
                  'Priority support',
                  'All releases',
                ].map(f => (
                  <li key={f} style={{ fontSize: 14, color: '#9A9A9A', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: MUTED, flexShrink: 0 }}>+</span> {f}
                  </li>
                ))}
              </ul>
              <Link href="/pricing" style={{ display: 'block', padding: '14px 0', background: 'transparent', color: '#9A9A9A', border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 14, textDecoration: 'none', textAlign: 'center' as const }}>
                Start Growth plan
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ maxWidth: 600, margin: '0 auto', padding: '100px 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(30px, 5vw, 46px)', fontWeight: 300, letterSpacing: -2, lineHeight: 1.1, marginBottom: 24, color: '#F2F0E8' }}>
          Start your first experiment.
        </h2>
        <p style={{ fontSize: 16, color: MUTED, marginBottom: 40, lineHeight: 1.7 }}>
          Founding access · $199 · 1,000 spots only.
        </p>
        <a href="#pricing" style={{ display: 'inline-block', padding: '15px 40px', background: AMBER, color: '#000', fontSize: 16, fontWeight: 700, textDecoration: 'none', borderRadius: 12 }}>
          Get access →
        </a>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: `1px solid ${BORDER}`, padding: '32px 24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{ width: 22, height: 22, borderRadius: 5, background: AMBER, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#000' }}>G</div>
          <span style={{ fontWeight: 700, fontSize: 13 }}>Growva</span>
        </div>
        <p style={{ fontSize: 12, color: DIM, margin: '0 0 6px' }}>Decision infrastructure for early-stage founders.</p>
        <p style={{ fontSize: 12, color: DIM, margin: 0 }}>All payments secured by Stripe · <a href="mailto:hello@growva.co" style={{ color: DIM, textDecoration: 'none' }}>hello@growva.co</a></p>
      </footer>
    </div>
  )
}
