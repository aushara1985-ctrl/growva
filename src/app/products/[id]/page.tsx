'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

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
  events: Array<{ type: string; value: number }>
}

interface Product {
  id: string
  name: string
  description: string
  targetUser: string
  apiKey: string
  experiments: Experiment[]
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#f59e0b',
  SCALED: '#22c55e',
  KILLED: '#ef4444',
  COMPLETED: '#666',
  PENDING: '#3b82f6',
}

const TYPE_LABELS: Record<string, string> = {
  LANDING_PAGE: 'Landing Page',
  PRICING_TEST: 'Pricing Test',
  OFFER_TEST: 'Offer Test',
  CONTENT_ANGLE: 'Content Angle',
  AD_COPY: 'Ad Copy',
}

export default function ProductPage() {
  const params = useParams()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [deciding, setDeciding] = useState<string | null>(null)

  const fetchProduct = async () => {
    const res = await fetch(`/api/products/${params.id}`)
    const json = await res.json()
    setProduct(json)
    setLoading(false)
  }

  useEffect(() => {
    fetchProduct()
  }, [params.id])

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

        {/* API Key */}
        <div style={{
          background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 8,
          padding: '16px 20px', marginBottom: 24,
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <div>
            <div style={{ fontSize: 9, color: '#555', letterSpacing: 3, marginBottom: 4 }}>API KEY</div>
            <div style={{ fontSize: 12, color: '#00ff88', letterSpacing: 1 }}>{product.apiKey}</div>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 11, color: '#444' }}>
            Use this key to send events → <span style={{ color: '#555' }}>POST /api/events · Header: x-api-key</span>
          </div>
        </div>

        {/* Experiments */}
        <div style={{ fontSize: 10, color: '#555', letterSpacing: 3, marginBottom: 16 }}>
          EXPERIMENTS ({product.experiments.length})
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {product.experiments.length === 0 && (
            <div style={{ color: '#333', fontSize: 13, textAlign: 'center', padding: 60 }}>
              No experiments yet. Start growth mode from the dashboard.
            </div>
          )}

          {product.experiments.map(exp => {
            const pageViews = exp.events?.filter(e => e.type === 'PAGE_VIEW').length || 0
            const signups = exp.events?.filter(e => e.type === 'SIGNUP').length || 0
            const revenue = exp.events?.filter(e => e.type === 'PURCHASE').reduce((s, e) => s + e.value, 0) || 0
            const convRate = pageViews > 0 ? ((signups / pageViews) * 100).toFixed(1) : '0.0'

            return (
              <div key={exp.id} style={{
                background: '#0d0d0d',
                border: `1px solid ${exp.status === 'ACTIVE' ? '#f59e0b22' : '#1a1a1a'}`,
                borderRadius: 8, padding: 24,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <span style={{
                        fontSize: 9, letterSpacing: 2,
                        color: STATUS_COLORS[exp.status] || '#666',
                        background: `${STATUS_COLORS[exp.status]}11`,
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

                  {exp.status === 'ACTIVE' && (
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

                <div style={{ fontSize: 12, color: '#555', lineHeight: 1.7, marginBottom: 16, maxWidth: 600 }}>
                  {exp.copy}
                </div>

                <div style={{ display: 'flex', gap: 24, fontSize: 11 }}>
                  <div>
                    <span style={{ color: '#444' }}>CTA: </span>
                    <span style={{ color: '#e8e8e8' }}>{exp.cta}</span>
                  </div>
                  <div>
                    <span style={{ color: '#444' }}>Channel: </span>
                    <span style={{ color: '#3b82f6' }}>{exp.distributionChannel}</span>
                  </div>
                  <div>
                    <span style={{ color: '#444' }}>KPI: </span>
                    <span style={{ color: '#a855f7' }}>{exp.expectedKpi}</span>
                  </div>
                </div>

                {/* Stats */}
                <div style={{
                  display: 'flex', gap: 20, marginTop: 16, paddingTop: 16,
                  borderTop: '1px solid #1a1a1a', fontSize: 11,
                }}>
                  <span style={{ color: '#555' }}>Views: <span style={{ color: '#e8e8e8' }}>{pageViews}</span></span>
                  <span style={{ color: '#555' }}>Signups: <span style={{ color: '#22c55e' }}>{signups}</span></span>
                  <span style={{ color: '#555' }}>Revenue: <span style={{ color: '#22c55e' }}>${revenue.toFixed(0)}</span></span>
                  <span style={{ color: '#555' }}>Conv. Rate: <span style={{ color: parseFloat(convRate) > 3 ? '#22c55e' : parseFloat(convRate) > 1 ? '#f59e0b' : '#ef4444' }}>{convRate}%</span></span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
