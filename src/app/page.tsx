import Link from 'next/link'

const FIRE = '#FF4500'
const AMBER = '#FF9200'
const GREEN = '#1DEB7A'
const BLUE = '#5B6EFF'
const MUTED = '#6A6A7A'
const DIM = '#3A3A48'

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#08080A', fontFamily: "'DM Sans', -apple-system, sans-serif", color: '#F2F0E8', overflowX: 'hidden' }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      {/* ── NAV ── */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(8,8,10,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: `linear-gradient(135deg,${FIRE},${AMBER})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#000' }}>G</div>
          <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: -0.3 }}>Growva</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link href="/pricing" style={{ padding: '7px 16px', color: MUTED, fontSize: 13, textDecoration: 'none', borderRadius: 8 }}>Pricing</Link>
          <Link href="/dashboard" style={{ padding: '7px 18px', background: `linear-gradient(90deg,${FIRE},${AMBER})`, color: '#000', fontSize: 13, fontWeight: 700, textDecoration: 'none', borderRadius: 8 }}>Open App →</Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ paddingTop: 140, paddingBottom: 100, textAlign: 'center', maxWidth: 760, margin: '0 auto', padding: '140px 24px 100px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,69,0,0.1)', border: '1px solid rgba(255,69,0,0.2)', borderRadius: 100, padding: '5px 14px', fontSize: 12, color: AMBER, fontWeight: 600, marginBottom: 32, letterSpacing: 0.5 }}>
          AI-POWERED GROWTH ENGINE
        </div>

        <h1 style={{ fontSize: 'clamp(40px, 7vw, 72px)', fontWeight: 300, letterSpacing: -3, lineHeight: 1.05, margin: '0 0 24px', color: '#F2F0E8' }}>
          Your product grows<br />
          <span style={{ background: `linear-gradient(90deg,${FIRE},${AMBER})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>while you sleep</span>
        </h1>

        <p style={{ fontSize: 18, color: MUTED, lineHeight: 1.7, maxWidth: 520, margin: '0 auto 48px', fontWeight: 400 }}>
          Growva runs daily A/B experiments, kills what's losing, scales what's winning — and tells you exactly what to build next.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/pricing" style={{ padding: '14px 32px', background: `linear-gradient(90deg,${FIRE},${AMBER})`, color: '#000', fontSize: 15, fontWeight: 700, textDecoration: 'none', borderRadius: 10 }}>
            Get Founding Access — $199
          </Link>
          <Link href="/dashboard" style={{ padding: '14px 28px', background: 'rgba(255,255,255,0.05)', color: '#F2F0E8', fontSize: 15, textDecoration: 'none', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)' }}>
            View Dashboard
          </Link>
        </div>

        <p style={{ marginTop: 20, fontSize: 12, color: DIM }}>First 1,000 founders only · Lifetime access · No monthly fees</p>
      </section>

      {/* ── STATS BAR ── */}
      <section style={{ borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '32px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 0 }}>
          {[
            { v: 'Daily', l: 'Automated growth loops' },
            { v: '100%', l: 'Data-driven decisions' },
            { v: '0 hrs', l: 'Manual analysis needed' },
          ].map(({ v, l }) => (
            <div key={l} style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: AMBER, letterSpacing: -1, lineHeight: 1 }}>{v}</div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 6 }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '100px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{ fontSize: 11, color: MUTED, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>How it works</div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 300, letterSpacing: -1.5, margin: 0 }}>Three steps to autonomous growth</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
          {[
            { n: '01', title: 'Connect your product', body: 'Add one SDK line. Growva starts tracking real user behavior — pageviews, clicks, signups, purchases.', color: BLUE },
            { n: '02', title: 'AI runs experiments', body: 'Every day, the engine generates A/B tests, picks the best angles, and decides what to kill or scale.', color: AMBER },
            { n: '03', title: 'You get the playbook', body: 'Daily brief in your dashboard: what worked, what to build next, and what your competitors are missing.', color: GREEN },
          ].map(({ n, title, body, color }) => (
            <div key={n} style={{ background: '#0F0F12', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '32px 28px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: 2, marginBottom: 20 }}>{n}</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, letterSpacing: -0.3 }}>{title}</div>
              <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.7 }}>{body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ background: '#0A0A0D', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '100px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ fontSize: 11, color: MUTED, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>What you get</div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 300, letterSpacing: -1.5, margin: 0 }}>Everything to dominate your market</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
            {[
              { icon: '⚡', title: 'Daily AI Growth Loop', body: 'Automatically generates, runs, and evaluates experiments every 24 hours. No manual work.' },
              { icon: '🧠', title: 'Collective Brain', body: 'Learns from every product on the platform. What works for similar founders gets suggested to you first.' },
              { icon: '🎯', title: 'Feature Decision Engine', body: 'AI ranks your feature backlog by revenue potential, monopoly score, and founder focus.' },
              { icon: '🔥', title: 'Growth Cards', body: 'Shareable proof-of-growth cards for every winning experiment. Show your traction.' },
              { icon: '📊', title: 'Monopoly Scoring', body: 'Measures your data moat and switching cost. Know exactly how defensible you are.' },
              { icon: '🏗', title: 'Builder Agent', body: 'Approved features get turned into GitHub issues automatically. Ship faster.' },
            ].map(({ icon, title, body }) => (
              <div key={title} style={{ background: '#0F0F12', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '28px 24px', display: 'flex', gap: 16 }}>
                <div style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{icon}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, letterSpacing: -0.2 }}>{title}</div>
                  <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.6 }}>{body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ maxWidth: 640, margin: '0 auto', padding: '100px 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 300, letterSpacing: -2, lineHeight: 1.1, marginBottom: 24 }}>
          Ready to grow on<br />
          <span style={{ background: `linear-gradient(90deg,${FIRE},${AMBER})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>autopilot?</span>
        </h2>
        <p style={{ fontSize: 16, color: MUTED, marginBottom: 40, lineHeight: 1.7 }}>
          Join the first 1,000 founders getting Founding Access. One-time payment, lifetime use.
        </p>
        <Link href="/pricing" style={{ display: 'inline-block', padding: '16px 40px', background: `linear-gradient(90deg,${FIRE},${AMBER})`, color: '#000', fontSize: 16, fontWeight: 700, textDecoration: 'none', borderRadius: 12 }}>
          See Pricing →
        </Link>
        <p style={{ marginTop: 16, fontSize: 12, color: DIM }}>No subscription · Cancel anytime on monthly plans</p>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '32px 24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ width: 22, height: 22, borderRadius: 5, background: `linear-gradient(135deg,${FIRE},${AMBER})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#000' }}>G</div>
          <span style={{ fontWeight: 700, fontSize: 13 }}>Growva</span>
        </div>
        <p style={{ fontSize: 12, color: DIM, margin: 0 }}>Autonomous Revenue Layer for Internet Products</p>
      </footer>
    </div>
  )
}
