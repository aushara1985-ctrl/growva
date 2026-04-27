'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface GrowthCard {
  id: string
  metricLabel: string
  metricValue: string
  headline: string
  description: string
  tweetText: string
  shareCount: number
  isPublic: boolean
  createdAt: string
  experiment: { angle: string; type: string }
  product: { name: string }
}

export default function GrowthCardsPage() {
  const router = useRouter()
  const [cards, setCards] = useState<GrowthCard[]>([])
  const [loading, setLoading] = useState(true)
  const [sharing, setSharing] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [activeCard, setActiveCard] = useState<GrowthCard | null>(null)

  useEffect(() => {
    fetch('/api/growth-cards')
      .then(r => r.json())
      .then(data => { setCards(data); setLoading(false) })
  }, [])

  const shareCard = async (card: GrowthCard) => {
    setSharing(card.id)
    await fetch('/api/growth-cards', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardId: card.id }),
    })
    setCards(prev => prev.map(c => c.id === card.id ? { ...c, shareCount: c.shareCount + 1, isPublic: true } : c))
    setSharing(null)
    // Open Twitter
    const tweet = encodeURIComponent(card.tweetText)
    window.open(`https://twitter.com/intent/tweet?text=${tweet}`, '_blank')
  }

  const copyTweet = async (card: GrowthCard) => {
    await navigator.clipboard.writeText(card.tweetText)
    setCopied(card.id)
    setTimeout(() => setCopied(null), 2000)
  }

  const s = {
    page: { minHeight: '100vh', background: '#fafafa', fontFamily: "'Inter', -apple-system, sans-serif" },
    nav: { background: '#fff', borderBottom: '1px solid #f0f0f0', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', gap: 12 },
    back: { background: 'transparent', border: 'none', fontSize: 13, color: '#999', cursor: 'pointer' },
    wrap: { maxWidth: 900, margin: '0 auto', padding: '32px 24px' },
    header: { marginBottom: 32 },
    title: { fontSize: 22, fontWeight: 500, color: '#0a0a0a', marginBottom: 6 },
    sub: { fontSize: 14, color: '#888' },
    empty: { textAlign: 'center' as const, padding: '80px 0', color: '#ccc', fontSize: 14 },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 },
    card: { background: '#0a0a0a', borderRadius: 16, padding: '28px', cursor: 'pointer', transition: 'transform 0.15s', position: 'relative' as const },
    cardLabel: { fontSize: 10, color: '#555', letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 16 },
    cardMetric: { fontSize: 44, fontWeight: 300, letterSpacing: -1.5, color: '#1DEB7A', lineHeight: 1, marginBottom: 8 },
    cardMetricLabel: { fontSize: 12, color: '#555', marginBottom: 20 },
    cardHeadline: { fontSize: 15, fontWeight: 500, color: '#fff', lineHeight: 1.4, marginBottom: 10 },
    cardDesc: { fontSize: 12, color: '#666', lineHeight: 1.6, marginBottom: 20 },
    cardFooter: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, borderTop: '1px solid #1a1a1a' },
    cardProduct: { fontSize: 11, color: '#444' },
    cardShares: { fontSize: 11, color: '#444' },
    cardActions: { display: 'flex', gap: 8, marginTop: 16 },
    btnShare: { flex: 1, padding: '9px', background: '#1d9bf0', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
    btnCopy: { padding: '9px 16px', background: 'transparent', color: '#888', border: '1px solid #1a1a1a', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' as const },
    publicBadge: { position: 'absolute' as const, top: 14, right: 14, fontSize: 9, padding: '3px 8px', background: 'rgba(29,235,122,0.1)', color: '#1DEB7A', border: '1px solid rgba(29,235,122,0.2)', borderRadius: 100, letterSpacing: 1 },
  }

  return (
    <div style={s.page}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500&display=swap" rel="stylesheet" />

      <div style={s.nav}>
        <button style={s.back} onClick={() => router.push('/dashboard')}>← Dashboard</button>
        <span style={{ color: '#e8e8e8' }}>/</span>
        <span style={{ fontSize: 14, fontWeight: 500, color: '#0a0a0a' }}>Growth Cards</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#bbb' }}>{cards.length} cards</span>
      </div>

      <div style={s.wrap}>
        <div style={s.header}>
          <div style={s.title}>Growth Cards</div>
          <div style={s.sub}>Auto-generated when an experiment wins. Share your proof.</div>
        </div>

        {loading && <div style={s.empty}>Loading...</div>}

        {!loading && cards.length === 0 && (
          <div style={s.empty}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🏆</div>
            <div style={{ marginBottom: 8 }}>No growth cards yet.</div>
            <div style={{ fontSize: 12 }}>Scale your first experiment to generate a card.</div>
          </div>
        )}

        <div style={s.grid}>
          {cards.map(card => (
            <div key={card.id} style={s.card}>
              {card.isPublic && <div style={s.publicBadge}>SHARED</div>}
              <div style={s.cardLabel}>Growth Card · {card.product.name}</div>
              <div style={s.cardMetric}>{card.metricValue}</div>
              <div style={s.cardMetricLabel}>{card.metricLabel}</div>
              <div style={s.cardHeadline}>{card.headline}</div>
              <div style={s.cardDesc}>{card.description}</div>
              <div style={s.cardFooter}>
                <span style={s.cardProduct}>{card.experiment.type.replace('_', ' ')} · {card.experiment.angle.slice(0, 30)}...</span>
                <span style={s.cardShares}>{card.shareCount} shares</span>
              </div>
              <div style={s.cardActions}>
                <button
                  style={s.btnShare}
                  onClick={() => shareCard(card)}
                  disabled={sharing === card.id}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/>
                  </svg>
                  {sharing === card.id ? 'Opening...' : 'Share on X'}
                </button>
                <button
                  style={s.btnCopy}
                  onClick={() => copyTweet(card)}
                >
                  {copied === card.id ? '✓ Copied' : 'Copy tweet'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* DEMO CARDS when empty - for preview */}
        {!loading && cards.length === 0 && (
          <div style={{ marginTop: 48 }}>
            <div style={{ fontSize: 11, color: '#ccc', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>Example cards</div>
            <div style={s.grid}>
              {[
                { metric: '+4.2%', label: 'Conversion rate', headline: 'Social proof angle crushed it.', desc: 'Switching from feature-led to social proof copy doubled conversion in 8 days.', product: 'Inab', tweet: 'Ran a social proof experiment on my SaaS pricing page. +4.2% conversion in 8 days. Built with Life Hack.', shares: 0 },
                { metric: '+$840', label: 'Revenue this week', headline: 'Pricing test paid off immediately.', desc: 'A 20% price increase with a risk-reversal CTA had zero negative impact on signups.', product: 'Ventra', tweet: 'Raised prices 20% on my SaaS. Added a risk-reversal CTA. Revenue up $840 this week with same signup rate. Life Hack called it.', shares: 0 },
              ].map((demo, i) => (
                <div key={i} style={{ ...s.card, opacity: 0.5, pointerEvents: 'none' }}>
                  <div style={s.cardLabel}>Example · {demo.product}</div>
                  <div style={s.cardMetric}>{demo.metric}</div>
                  <div style={s.cardMetricLabel}>{demo.label}</div>
                  <div style={s.cardHeadline}>{demo.headline}</div>
                  <div style={s.cardDesc}>{demo.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
