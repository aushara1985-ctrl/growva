'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

const BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://growva-production.up.railway.app'

interface Event {
  type: string
  value: number
  experimentId?: string | null
}

interface SprintPlan {
  action: string
  script: string
  successThreshold: string
  weakThreshold: string
  killSignal: string
  generatedBy: string
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
  mode: string
  startedAt: string
  activatedAt: string | null
  reviewDueAt: string | null
  trackingId: string | null
  metadata?: {
    mode?: string
    hypothesis?: string
    sprintType?: string
    targetAudience?: string
    sprintPlan?: SprintPlan
    sprintResult?: {
      replies?: number
      paidInterest?: number
      objections?: string
      notes?: string
    }
  } | null
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
  const [trackingTab, setTrackingTab] = useState<'link' | 'snippet'>('link')
  // Sprint state
  const [sprintResult, setSprintResult] = useState({ replies: 0, paidInterest: 0, objections: '', notes: '' })
  const [sprintEvidenceOpen, setSprintEvidenceOpen] = useState(false)
  const [savingEvidence, setSavingEvidence] = useState(false)

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

  const saveSprintEvidence = async (experimentId: string) => {
    setSavingEvidence(true)
    await fetch(`/api/experiments/${experimentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sprintResult }),
    })
    setSavingEvidence(false)
  }

  const triggerDecision = async (experimentId: string, isSprint = false) => {
    setDeciding(experimentId)
    // For sprint: save manual evidence first, then request decision
    if (isSprint && (sprintResult.replies > 0 || sprintResult.paidInterest > 0 || sprintResult.objections || sprintResult.notes)) {
      await saveSprintEvidence(experimentId)
    }
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
            const trackingUrl = exp.trackingId ? `${BASE_URL}/api/track/${exp.trackingId}` : null

            // ── SPRINT EXPERIMENT VIEW ──────────────────────────────────────
            if (exp.mode === 'SPRINT' || exp.metadata?.mode === 'SPRINT') {
              const plan = exp.metadata?.sprintPlan
              const hypothesis = exp.metadata?.hypothesis || exp.headline
              const sprintType = exp.metadata?.sprintType || ''
              const windowClosed = exp.reviewDueAt != null && new Date(exp.reviewDueAt) <= new Date()
              const hoursLeft = exp.reviewDueAt && !windowClosed ? hoursUntil(exp.reviewDueAt) : 0
              const isDecided = ['KILLED', 'SCALED'].includes(exp.status)
              const canDecide = isRunning && (windowClosed || clicks >= 3 || signups >= 1)

              const scriptWithLink = plan?.script?.replace('{trackingLink}', trackingUrl || '[tracking link]') ?? ''

              return (
                <div key={exp.id} style={{ background: '#0d0d0d', border: '1px solid #f59e0b22', borderRadius: 8, padding: 24 }}>

                  {/* Sprint header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <span style={{ fontSize: 9, letterSpacing: 2, color: '#f59e0b', background: '#f59e0b18', border: '1px solid #f59e0b33', borderRadius: 4, padding: '2px 8px' }}>
                          ⚡ SPRINT
                        </span>
                        <span style={{ fontSize: 10, color: '#555', letterSpacing: 2 }}>48H VALIDATION</span>
                        {!isDecided && !windowClosed && (
                          <span style={{ fontSize: 10, color: '#10b981' }}>{hoursLeft}h left</span>
                        )}
                        {windowClosed && !isDecided && (
                          <span style={{ fontSize: 10, color: '#f59e0b', fontWeight: 600 }}>WINDOW CLOSED</span>
                        )}
                      </div>
                      <div style={{ fontSize: 15, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, marginBottom: 4 }}>
                        {hypothesis}
                      </div>
                      {sprintType && (
                        <div style={{ fontSize: 11, color: '#555' }}>Sprint type: {sprintType.toLowerCase().replace('_', ' ')}</div>
                      )}
                    </div>

                    {isRunning && (
                      <button
                        onClick={() => triggerDecision(exp.id, true)}
                        disabled={deciding === exp.id}
                        style={{
                          background: deciding === exp.id ? '#1a1a1a' : canDecide ? '#111' : '#0d0d0d',
                          color: deciding === exp.id ? '#555' : canDecide ? '#f59e0b' : '#444',
                          border: `1px solid ${canDecide ? '#f59e0b33' : '#1a1a1a'}`, borderRadius: 6,
                          padding: '8px 16px', fontSize: 11, fontWeight: 600,
                          cursor: deciding === exp.id ? 'not-allowed' : 'pointer',
                          fontFamily: 'inherit', letterSpacing: 1, flexShrink: 0,
                        }}>
                        {deciding === exp.id ? 'DECIDING...' : '⚡ GET VERDICT'}
                      </button>
                    )}
                  </div>

                  {/* Sprint plan */}
                  {plan && (
                    <div style={{ marginBottom: 20 }}>
                      {/* Action */}
                      <div style={{ background: '#111', border: '1px solid #1f2937', borderRadius: 6, padding: '14px 16px', marginBottom: 12 }}>
                        <div style={{ fontSize: 10, color: '#555', letterSpacing: 2, marginBottom: 8 }}>YOUR ACTION</div>
                        <div style={{ fontSize: 13, color: '#e8e8e8', lineHeight: 1.6 }}>{plan.action}</div>
                      </div>

                      {/* Script */}
                      <div style={{ background: '#111', border: '1px solid #1f2937', borderRadius: 6, padding: '14px 16px', marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <div style={{ fontSize: 10, color: '#555', letterSpacing: 2 }}>SCRIPT — COPY & USE</div>
                          <CopyButton text={scriptWithLink} />
                        </div>
                        <pre style={{ fontSize: 12, color: '#a5b4fc', lineHeight: 1.7, margin: 0, fontFamily: 'monospace', whiteSpace: 'pre-wrap' as const, wordBreak: 'break-word' as const }}>
                          {scriptWithLink}
                        </pre>
                      </div>

                      {/* Tracking link */}
                      {trackingUrl && (
                        <div style={{ background: '#111', border: '1px solid #1f2937', borderRadius: 6, padding: '12px 16px', marginBottom: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <div style={{ fontSize: 10, color: '#555', letterSpacing: 2 }}>TRACKING LINK — USE IN YOUR SPRINT</div>
                            <CopyButton text={trackingUrl} />
                          </div>
                          <code style={{ fontSize: 12, color: '#10b981', wordBreak: 'break-all' as const }}>{trackingUrl}</code>
                          <div style={{ fontSize: 11, color: '#555', marginTop: 6 }}>Every click is measured automatically. Share this link in your DMs, posts, or emails.</div>
                        </div>
                      )}

                      {/* Optional snippet if product has URL */}
                      {product.url && (
                        <div style={{ marginBottom: 12 }}>
                          <button onClick={() => setTrackingTab(trackingTab === 'snippet' ? 'link' : 'snippet')}
                            style={{ background: 'transparent', border: '1px solid #1f2937', borderRadius: 5, padding: '5px 12px', fontSize: 11, color: '#555', cursor: 'pointer', fontFamily: 'inherit' }}>
                            {trackingTab === 'snippet' ? 'Hide snippet' : '</> Also install snippet on your page'}
                          </button>
                          {trackingTab === 'snippet' && (() => {
                            const snippetCode = `<script src="${BASE_URL}/api/g.js"\n  data-key="${product.apiKey}"\n  data-experiment="${exp.trackingId || ''}"></script>`
                            return (
                              <div style={{ background: '#111', border: '1px solid #1f2937', borderRadius: 6, padding: '12px 16px', marginTop: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                                  <code style={{ fontSize: 11, color: '#60a5fa', flex: 1, whiteSpace: 'pre', fontFamily: 'monospace', lineHeight: 1.6 }}>{snippetCode}</code>
                                  <CopyButton text={snippetCode} />
                                </div>
                                <div style={{ fontSize: 11, color: '#555' }}>Paste in your page &lt;head&gt; — auto-tracks page views from snippet installs.</div>
                              </div>
                            )
                          })()}
                        </div>
                      )}

                      {/* Thresholds */}
                      <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 6, padding: '14px 16px' }}>
                        <div style={{ fontSize: 10, color: '#555', letterSpacing: 2, marginBottom: 12 }}>SIGNAL THRESHOLDS</div>
                        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                          <div style={{ display: 'flex', gap: 10, fontSize: 12 }}>
                            <span style={{ color: '#16a34a', fontWeight: 600, minWidth: 52, flexShrink: 0 }}>SCALE →</span>
                            <span style={{ color: '#555', lineHeight: 1.5 }}>{plan.successThreshold}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 10, fontSize: 12 }}>
                            <span style={{ color: '#d97706', fontWeight: 600, minWidth: 52, flexShrink: 0 }}>CONT. →</span>
                            <span style={{ color: '#555', lineHeight: 1.5 }}>{plan.weakThreshold}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 10, fontSize: 12 }}>
                            <span style={{ color: '#dc2626', fontWeight: 600, minWidth: 52, flexShrink: 0 }}>STOP →</span>
                            <span style={{ color: '#555', lineHeight: 1.5 }}>{plan.killSignal}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Live signals */}
                  <div style={{ display: 'flex', gap: 20, fontSize: 11, paddingBottom: 16, borderBottom: '1px solid #1a1a1a', marginBottom: 16 }}>
                    <span style={{ color: '#555' }}>Clicks: <span style={{ color: '#10b981', fontWeight: 600 }}>{clicks}</span></span>
                    <span style={{ color: '#555' }}>Views: <span style={{ color: '#e8e8e8' }}>{pageViews}</span></span>
                    <span style={{ color: '#555' }}>Signups: <span style={{ color: '#22c55e' }}>{signups}</span></span>
                    {revenue > 0 && <span style={{ color: '#555' }}>Revenue: <span style={{ color: '#22c55e' }}>${revenue.toFixed(0)}</span></span>}
                    {!clicks && !signups && !pageViews && (
                      <span style={{ color: '#555', fontStyle: 'italic' }}>No signal yet — share your tracking link to start</span>
                    )}
                  </div>

                  {/* Manual evidence — collapsible fallback */}
                  {isRunning && (
                    <div>
                      <button onClick={() => setSprintEvidenceOpen(!sprintEvidenceOpen)}
                        style={{ background: 'transparent', border: 'none', color: '#555', fontSize: 11, cursor: 'pointer', padding: 0, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{sprintEvidenceOpen ? '▾' : '▸'}</span>
                        <span>Can't track everything automatically? Log evidence manually</span>
                      </button>

                      {sprintEvidenceOpen && (
                        <div style={{ marginTop: 14, background: '#111', border: '1px solid #1f2937', borderRadius: 6, padding: '16px' }}>
                          <div style={{ fontSize: 10, color: '#555', letterSpacing: 2, marginBottom: 14 }}>MANUAL EVIDENCE — supplements automatic tracking</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                            <div>
                              <div style={{ fontSize: 11, color: '#555', marginBottom: 5 }}>Replies received</div>
                              <input type="number" min={0} value={sprintResult.replies}
                                onChange={e => setSprintResult({ ...sprintResult, replies: parseInt(e.target.value) || 0 })}
                                style={{ width: '100%', padding: '8px 10px', background: '#0d0d0d', border: '1px solid #1f2937', borderRadius: 5, fontSize: 13, color: '#e8e8e8', outline: 'none', boxSizing: 'border-box' as const }} />
                            </div>
                            <div>
                              <div style={{ fontSize: 11, color: '#555', marginBottom: 5 }}>Paid interest <span style={{ color: '#444' }}>(asked about price)</span></div>
                              <input type="number" min={0} value={sprintResult.paidInterest}
                                onChange={e => setSprintResult({ ...sprintResult, paidInterest: parseInt(e.target.value) || 0 })}
                                style={{ width: '100%', padding: '8px 10px', background: '#0d0d0d', border: '1px solid #1f2937', borderRadius: 5, fontSize: 13, color: '#e8e8e8', outline: 'none', boxSizing: 'border-box' as const }} />
                            </div>
                          </div>
                          <div style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 11, color: '#555', marginBottom: 5 }}>Most common objection</div>
                            <input value={sprintResult.objections}
                              onChange={e => setSprintResult({ ...sprintResult, objections: e.target.value })}
                              placeholder="e.g. Price too high, already have a solution"
                              style={{ width: '100%', padding: '8px 10px', background: '#0d0d0d', border: '1px solid #1f2937', borderRadius: 5, fontSize: 13, color: '#e8e8e8', outline: 'none', boxSizing: 'border-box' as const }} />
                          </div>
                          <div style={{ marginBottom: 14 }}>
                            <div style={{ fontSize: 11, color: '#555', marginBottom: 5 }}>Notes</div>
                            <textarea value={sprintResult.notes}
                              onChange={e => setSprintResult({ ...sprintResult, notes: e.target.value })}
                              placeholder="Anything else that matters — reactions, quotes, surprises"
                              rows={2}
                              style={{ width: '100%', padding: '8px 10px', background: '#0d0d0d', border: '1px solid #1f2937', borderRadius: 5, fontSize: 13, color: '#e8e8e8', outline: 'none', resize: 'none', boxSizing: 'border-box' as const }} />
                          </div>
                          <button onClick={() => saveSprintEvidence(exp.id)} disabled={savingEvidence}
                            style={{ background: savingEvidence ? '#1a1a1a' : '#1f2937', color: savingEvidence ? '#555' : '#e8e8e8', border: 'none', borderRadius: 5, padding: '7px 16px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                            {savingEvidence ? 'Saving...' : 'Save evidence'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            }
            // ── END SPRINT VIEW ─────────────────────────────────────────────

            // Decision ready: 48h window closed OR threshold reached (300 views or 10 signups)
            const windowClosed   = exp.reviewDueAt != null && new Date(exp.reviewDueAt) <= new Date()
            const thresholdReady = pageViews >= 300 || signups >= 10
            const isDecisionReady = isRunning && (windowClosed || thresholdReady)
            const decisionTrigger = thresholdReady ? 'Threshold reached' : 'Decision window closed'

            const hoursLeft = exp.reviewDueAt && !windowClosed ? hoursUntil(exp.reviewDueAt) : 0
            const snippetCode = `<script src="${BASE_URL}/api/g.js"\n  data-key="${product.apiKey}"\n  data-experiment="${exp.trackingId || ''}"></script>`

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
                    <div style={{ fontSize: 12, color: '#fbbf24', fontWeight: 600, marginBottom: 2 }}>
                      Decision ready — click "DECIDE NOW" to get Growva's recommendation
                    </div>
                    <div style={{ fontSize: 11, color: '#78716c' }}>
                      {decisionTrigger} · {pageViews} views, {signups} signups
                    </div>
                  </div>
                )}

                {/* Tracking — shown after activation */}
                {isRunning && (
                  <div style={{ background: '#0a0a0a', border: '1px solid #1f2937', borderRadius: 6, padding: '16px', marginBottom: 12 }}>

                    {/* Tab header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                      <div style={{ fontSize: 10, color: '#555', letterSpacing: 2 }}>TRACKING</div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {(['link', 'snippet'] as const).map(tab => (
                          <button key={tab} onClick={() => setTrackingTab(tab)} style={{
                            background: trackingTab === tab ? '#1f2937' : 'transparent',
                            color: trackingTab === tab ? '#e8e8e8' : '#555',
                            border: `1px solid ${trackingTab === tab ? '#374151' : '#1f2937'}`,
                            borderRadius: 5, padding: '4px 12px', fontSize: 11,
                            cursor: 'pointer', fontFamily: 'inherit',
                          }}>
                            {tab === 'link' ? '🔗 Link' : '</> Snippet'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Link tab */}
                    {trackingTab === 'link' && trackingUrl && (
                      <>
                        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 10, lineHeight: 1.6 }}>
                          Use in posts, DMs, emails, or campaigns. Growva measures clicks and source.
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#111', border: '1px solid #1f2937', borderRadius: 5, padding: '8px 12px', marginBottom: 12 }}>
                          <code style={{ fontSize: 11, color: '#10b981', flex: 1, wordBreak: 'break-all' as const }}>{trackingUrl}</code>
                          <CopyButton text={trackingUrl} />
                        </div>
                      </>
                    )}

                    {/* Snippet tab */}
                    {trackingTab === 'snippet' && (
                      <>
                        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 10, lineHeight: 1.6 }}>
                          Paste in your page <code style={{ color: '#9ca3af' }}>&lt;head&gt;</code> or before <code style={{ color: '#9ca3af' }}>&lt;/body&gt;</code>.
                          Auto-tracks page views. Call <code style={{ color: '#9ca3af' }}>growva.track()</code> for signups and purchases.
                        </div>

                        {/* Install snippet */}
                        <div style={{ fontSize: 10, color: '#555', letterSpacing: 1, marginBottom: 6 }}>INSTALL</div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#111', border: '1px solid #1f2937', borderRadius: 5, padding: '10px 12px', marginBottom: 14 }}>
                          <code style={{ fontSize: 11, color: '#60a5fa', flex: 1, whiteSpace: 'pre', fontFamily: 'monospace', lineHeight: 1.6 }}>{snippetCode}</code>
                          <CopyButton text={snippetCode} />
                        </div>

                        {/* Manual events */}
                        <div style={{ fontSize: 10, color: '#555', letterSpacing: 1, marginBottom: 6 }}>MANUAL EVENTS</div>
                        <div style={{ background: '#111', border: '1px solid #1f2937', borderRadius: 5, padding: '10px 12px', marginBottom: 10 }}>
                          {[
                            { label: 'Signup', code: "growva.track('SIGNUP')" },
                            { label: 'Purchase', code: "growva.track('PURCHASE', { amount: 29, currency: 'USD' })" },
                            { label: 'Custom', code: "growva.track('CUSTOM', { name: 'demo_booked' })" },
                          ].map(({ label, code }) => (
                            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                              <code style={{ fontSize: 11, color: '#a78bfa', flex: 1, fontFamily: 'monospace' }}>{code}</code>
                              <CopyButton text={code} />
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Signal stats — always visible */}
                    <div style={{ display: 'flex', gap: 20, fontSize: 11, paddingTop: 10, borderTop: '1px solid #1f2937' }}>
                      <span style={{ color: '#555' }}>Clicks: <span style={{ color: '#10b981', fontWeight: 600 }}>{clicks}</span></span>
                      <span style={{ color: '#555' }}>Views: <span style={{ color: '#e8e8e8' }}>{pageViews}</span></span>
                      <span style={{ color: '#555' }}>Signups: <span style={{ color: '#22c55e' }}>{signups}</span></span>
                      {revenue > 0 && <span style={{ color: '#555' }}>Revenue: <span style={{ color: '#22c55e' }}>${revenue.toFixed(0)}</span></span>}
                      <span style={{ color: '#555' }}>Conv: <span style={{ color: parseFloat(convRate) > 3 ? '#22c55e' : parseFloat(convRate) > 1 ? '#f59e0b' : '#6b7280' }}>{convRate}%</span></span>
                      {!pageViews && !signups && (
                        <span style={{ color: '#6b7280', fontStyle: 'italic' }}>No signal yet — share the link or install the snippet</span>
                      )}
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
