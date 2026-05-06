'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

const BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://growva-production.up.railway.app'

interface Event {
  type: string
  value: number
  experimentId?: string | null
}

interface Experiment {
  id: string
  type: string
  angle: string
  headline: string
  copy: string
  cta: string
  distributionChannel: string
  expectedKpi: string
  status: string
  startedAt: string
  activatedAt: string | null
  reviewDueAt: string | null
  trackingId: string | null
}

interface Product {
  id: string
  name: string
  description: string
  targetUser: string
  apiKey: string
  url: string | null
  experiments: Experiment[]
  events: Event[]
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:    '#f59e0b',
  RUNNING:   '#10b981',
  SCALED:    '#22c55e',
  KILLED:    '#ef4444',
  COMPLETED: '#666',
  PENDING:   '#6366f1',
}

const TYPE_LABELS: Record<string, string> = {
  LANDING_PAGE:  'Landing Page',
  PRICING_TEST:  'Pricing Test',
  OFFER_TEST:    'Offer Test',
  CONTENT_ANGLE: 'Content Angle',
  AD_COPY:       'Ad Copy',
}

function hoursUntil(dateStr: string): number {
  return Math.max(0, Math.round((new Date(dateStr).getTime() - Date.now()) / 36e5))
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={copy} style={{
      background: copied ? '#d1fae5' : '#f3f4f6', color: copied ? '#065f46' : '#374151',
      border: `1px solid ${copied ? '#6ee7b7' : '#e5e7eb'}`, borderRadius: 6,
      padding: '5px 12px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
      transition: 'all 0.15s',
    }}>
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

export default function ProductPage() {
  const params = useParams()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [activating, setActivating] = useState<string | null>(null)
  const [deciding, setDeciding] = useState<string | null>(null)

  const fetchProduct = async () => {
    const res = await fetch(`/api/products/${params.id}`)
    const json = await res.json()
    setProduct(json)
    setLoading(false)
  }

  useEffect(() => { fetchProduct() }, [params.id])

  const activate = async (expId: string) => {
    setActivating(expId)
    await fetch(`/api/experiments/${expId}/activate`, { method: 'POST' })
    setActivating(null)
    fetchProduct()
  }

  const triggerDecision = async (experimentId: string) => {
    setDeciding(experimentId)
    await fetch('/api/decisions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ experimentId }),
    })
    setDeciding(null)
    fetchProduct()
  }

  if (loading) return (
    <div style={{ background: '#080808', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#00ff88', fontFamily: 'monospace', fontSize: 14, letterSpacing: 4 }}>LOADING...</div>
    </div>
  )

  if (!product) return (
    <div style={{ background: '#080808', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#ef4444', fontFamily: 'monospace' }}>Product not found</div>
    </div>
  )

  return (
    <div style={{ background: '#080808', minHeight: '100vh', color: '#e8e8e8', fontFamily: "'IBM Plex Mono', monospace" }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ borderBottom: '1px solid #1a1a1a', padding: '20px 32px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <a href="/dashboard" style={{ color: '#555', textDecoration: 'none', fontSize: 12 }}>← BACK</a>
        <div style={{ width: 1, height: 16, background: '#222' }} />
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 18 }}>
          {product.name}
        </span>
        <span style={{ fontSize: 11, color: '#555' }}>{product.targetUser}</span>
      </div>

      <div style={{ padding: 32 }}>

        {/* Experiments */}
        <div style={{ fontSize: 10, color: '#555', letterSpacing: 3, marginBottom: 16 }}>
          EXPERIMENTS ({product.experiments.length})
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {product.experiments.length === 0 && (
            <div style={{ color: '#333', fontSize: 13, textAlign: 'center', padding: 60, border: '1px dashed #1a1a1a', borderRadius: 8 }}>
              No experiments yet. Click "Start Growth" from the dashboard to generate 3 experiments.
            </div>
          )}

          {product.experiments.map(exp => {
            const expEvents = product.events?.filter(e => (e as any).experimentId === exp.id) ?? []
            const clicks = expEvents.filter(e => e.type === 'CLICK').length
            const pageViews = expEvents.filter(e => e.type === 'PAGE_VIEW').length
            const signups = expEvents.filter(e => e.type === 'SIGNUP').length
            const revenue = expEvents.filter(e => e.type === 'PURCHASE').reduce((s, e) => s + e.value, 0)
            const convRate = pageViews > 0 ? ((signups / pageViews) * 100).toFixed(1) : '0.0'

            const isPending = exp.status === 'PENDING'
            const isRunning = exp.status === 'RUNNING' || exp.status === 'ACTIVE'
            const isDecisionReady = isRunning && exp.reviewDueAt != null && new Date(exp.reviewDueAt) <= new Date()
            const hoursLeft = exp.reviewDueAt && !isDecisionReady ? hoursUntil(exp.reviewDueAt) : 0
            const trackingUrl = exp.trackingId ? `${BASE_URL}/api/track/${exp.trackingId}` : null

            return (
              <div key={exp.id} style={{
                background: '#0d0d0d',
                border: `1px solid ${isPending ? '#6366f122' : isRunning ? '#10b98122' : '#1a1a1a'}`,
                borderRadius: 8, padding: 24,
              }}>
                {/* Experiment header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <span style={{
                        fontSize: 9, letterSpacing: 2,
                        color: STATUS_COLORS[exp.status] || '#666',
                        background: `${STATUS_COLORS[exp.status]}18`,
                        border: `1px solid ${STATUS_COLORS[exp.status]}33`,
                        borderRadius: 4, padding: '2px 8px',
                      }}>{exp.status}</span>
                      <span style={{ fontSize: 10, color: '#555', letterSpacing: 2 }}>
                        {TYPE_LABELS[exp.type] || exp.type}
                      </span>
                    </div>
                    <div style={{ fontSize: 15, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, marginBottom: 4 }}>
                      {exp.headline}
                    </div>
                    <div style={{ fontSize: 11, color: '#666', fontStyle: 'italic' }}>
                      Angle: {exp.angle}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
                    {/* Activate button for PENDING */}
                    {isPending && (
                      <button
                        onClick={() => activate(exp.id)}
                        disabled={activating === exp.id}
                        style={{
                          background: activating === exp.id ? '#1a1a1a' : '#6366f1',
                          color: activating === exp.id ? '#555' : '#fff',
                          border: 'none', borderRadius: 6,
                          padding: '9px 18px', fontSize: 12, fontWeight: 600,
                          cursor: activating === exp.id ? 'not-allowed' : 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        {activating === exp.id ? 'Activating...' : 'I activated this experiment'}
                      </button>
                    )}

                    {/* Decide button */}
                    {(isRunning || exp.status === 'ACTIVE') && (
                      <button
                        onClick={() => triggerDecision(exp.id)}
                        disabled={deciding === exp.id}
                        style={{
                          background: deciding === exp.id ? '#1a1a1a' : '#111',
                          color: deciding === exp.id ? '#555' : '#f59e0b',
                          border: '1px solid #f59e0b33', borderRadius: 6,
                          padding: '8px 16px', fontSize: 11, fontWeight: 600,
                          cursor: deciding === exp.id ? 'not-allowed' : 'pointer',
                          fontFamily: 'inherit', letterSpacing: 1,
                        }}
                      >
                        {deciding === exp.id ? 'DECIDING...' : '⚡ DECIDE NOW'}
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ fontSize: 12, color: '#555', lineHeight: 1.7, marginBottom: 16, maxWidth: 600 }}>
                  {exp.copy}
                </div>

                <div style={{ display: 'flex', gap: 24, fontSize: 11, marginBottom: 16 }}>
                  <div><span style={{ color: '#444' }}>CTA: </span><span style={{ color: '#e8e8e8' }}>{exp.cta}</span></div>
                  <div><span style={{ color: '#444' }}>Channel: </span><span style={{ color: '#3b82f6' }}>{exp.distributionChannel}</span></div>
                  <div><span style={{ color: '#444' }}>KPI: </span><span style={{ color: '#a855f7' }}>{exp.expectedKpi}</span></div>
                </div>

                {/* Monitoring status banner — PENDING */}
                {isPending && (
                  <div style={{ background: '#1e1b4b', border: '1px solid #6366f133', borderRadius: 6, padding: '12px 16px', marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: '#a5b4fc', marginBottom: 4, fontWeight: 500 }}>
                      Ready to activate
                    </div>
                    <div style={{ fontSize: 11, color: '#6366f1', lineHeight: 1.6 }}>
                      When you launch this experiment externally, click "I activated this experiment" above.
                      Growva will start monitoring and give you a decision in 48 hours.
                    </div>
                  </div>
                )}

                {/* Monitoring status banner — RUNNING */}
                {isRunning && !isDecisionReady && (
                  <div style={{ background: '#022c22', border: '1px solid #10b98133', borderRadius: 6, padding: '12px 16px', marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: '#6ee7b7', marginBottom: 4, fontWeight: 500 }}>
                      Growva is monitoring this experiment
                    </div>
                    <div style={{ fontSize: 11, color: '#10b981' }}>
                      Decision due in {hoursLeft}h
                      {exp.reviewDueAt && (
                        <span style={{ color: '#065f46', marginLeft: 8 }}>
                          ({new Date(exp.reviewDueAt).toLocaleDateString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })})
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Decision ready banner */}
                {isRunning && isDecisionReady && (
                  <div style={{ background: '#1c1917', border: '1px solid #f59e0b33', borderRadius: 6, padding: '12px 16px', marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: '#fbbf24', fontWeight: 600 }}>
                      Decision ready — click "DECIDE NOW" to get Growva's recommendation
                    </div>
                  </div>
                )}

                {/* Tracking link — shown after activation */}
                {isRunning && trackingUrl && (
                  <div style={{ background: '#0a0a0a', border: '1px solid #1f2937', borderRadius: 6, padding: '14px 16px', marginBottom: 12 }}>
                    <div style={{ fontSize: 10, color: '#555', letterSpacing: 2, marginBottom: 10 }}>TRACKING LINK</div>
                    <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.6, marginBottom: 10 }}>
                      Use this link in your post, landing page, DM, or campaign so Growva can measure clicks.
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#111', border: '1px solid #1f2937', borderRadius: 5, padding: '8px 12px', marginBottom: 10 }}>
                      <code style={{ fontSize: 11, color: '#10b981', flex: 1, wordBreak: 'break-all' }}>{trackingUrl}</code>
                      <CopyButton text={trackingUrl} />
                    </div>
                    <div style={{ display: 'flex', gap: 20, fontSize: 11 }}>
                      <span style={{ color: '#555' }}>Clicks: <span style={{ color: '#10b981', fontWeight: 600 }}>{clicks}</span></span>
                      <span style={{ color: '#555' }}>Views: <span style={{ color: '#e8e8e8' }}>{pageViews}</span></span>
                      <span style={{ color: '#555' }}>Signups: <span style={{ color: '#22c55e' }}>{signups}</span></span>
                      {revenue > 0 && <span style={{ color: '#555' }}>Revenue: <span style={{ color: '#22c55e' }}>${revenue.toFixed(0)}</span></span>}
                      <span style={{ color: '#555' }}>Conv: <span style={{ color: parseFloat(convRate) > 3 ? '#22c55e' : parseFloat(convRate) > 1 ? '#f59e0b' : '#6b7280' }}>{convRate}%</span></span>
                    </div>
                  </div>
                )}

                {/* Stats for non-pending */}
                {!isPending && !isRunning && (
                  <div style={{ display: 'flex', gap: 20, paddingTop: 12, borderTop: '1px solid #1a1a1a', fontSize: 11 }}>
                    <span style={{ color: '#555' }}>Views: <span style={{ color: '#e8e8e8' }}>{pageViews}</span></span>
                    <span style={{ color: '#555' }}>Signups: <span style={{ color: '#22c55e' }}>{signups}</span></span>
                    <span style={{ color: '#555' }}>Revenue: <span style={{ color: '#22c55e' }}>${revenue.toFixed(0)}</span></span>
                    <span style={{ color: '#555' }}>Conv: <span style={{ color: parseFloat(convRate) > 3 ? '#22c55e' : parseFloat(convRate) > 1 ? '#f59e0b' : '#ef4444' }}>{convRate}%</span></span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
