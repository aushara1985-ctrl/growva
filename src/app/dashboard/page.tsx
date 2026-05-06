'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface Brief {
  content: string
  topFocus: string
  actions: Array<{ product: string; action: string; reason: string; priority: 'high' | 'medium' | 'low' }>
}

interface Score {
  momentum: number
  conversionHealth: number
  revenueVelocity: number
  growthChance: number
  overall: number
}

interface WinningPattern {
  experimentType: string
  angle: string
  channel: string
  conversionRate: number
}

interface Experiment {
  id: string
  status: string
  type: string
  angle: string
  headline: string
  copy: string
  cta: string
  distributionChannel: string
  expectedKpi: string
  reviewDueAt: string | null
  trackingId: string | null
}

interface Product {
  id: string
  name: string
  targetUser: string
  description: string
  price: number | null
  apiKey: string
  isActive: boolean
  experiments: Experiment[]
  score: Score | null
  winningPatterns: WinningPattern[]
  conversions7d: number
  revenue7d: number
  pendingCount: number
  runningCount: number
  decisionReadyCount: number
  _count: { events: number }
}

interface Decision {
  id: string
  action: string
  reason: string
  confidence: number
  createdAt: string
  product: { name: string }
  experiment: { angle: string } | null
}

interface DashData {
  overview: { products: number; activeExperiments: number; totalRevenue: number; totalConversions: number; scaledTotal: number; killedTotal: number }
  productList: Product[]
  recentDecisions: Decision[]
  dailyData: Array<{ date: string; events: number }>
  hasAnyEvents: boolean
  todayBrief: Brief | null
  brainStats?: { collectiveDatapoints: number; topPatterns: any[] }
}

const ACTION_COLOR: Record<string, string> = { KILL: '#dc2626', SCALE: '#16a34a', ITERATE: '#d97706', CONTINUE: '#2563eb' }
const ACTION_ICON: Record<string, string> = { KILL: '—', SCALE: '↑', ITERATE: '↻', CONTINUE: '→' }

const TRACKING_OPTIONS = [
  {
    id: 'tracking_links',
    label: 'Use Growva tracking links',
    description: 'Best for beta. We give each experiment a tracking link and monitor clicks.',
    status: 'available' as const,
    icon: '🔗',
  },
  {
    id: 'analytics',
    label: 'Connect analytics',
    description: 'Google Analytics, Plausible — helps Growva understand visits and conversions.',
    status: 'coming_soon' as const,
    icon: '📊',
  },
  {
    id: 'payments',
    label: 'Connect payments',
    description: 'Stripe, Lemon Squeezy, Gumroad — helps Growva see which experiments drive revenue.',
    status: 'coming_soon' as const,
    icon: '💳',
  },
  {
    id: 'forms',
    label: 'Connect forms / waitlists',
    description: 'Tally, Typeform — helps Growva measure leads and signups.',
    status: 'coming_soon' as const,
    icon: '📋',
  },
  {
    id: 'social',
    label: 'Track posts and campaigns',
    description: 'Use tracking links for X, LinkedIn, Reddit posts. API integrations later.',
    status: 'available' as const,
    icon: '📣',
  },
  {
    id: 'skip',
    label: "I don't track results yet",
    description: 'Growva will still guide you with tracking links and simple check-ins.',
    status: 'available' as const,
    icon: '→',
  },
]

function hoursUntil(dateStr: string): number {
  return Math.max(0, Math.round((new Date(dateStr).getTime() - Date.now()) / 36e5))
}

function productStateLabel(p: Product): { label: string; color: string; bg: string } | null {
  if (p.decisionReadyCount > 0) {
    return { label: 'Decision ready', color: '#d97706', bg: '#fffbeb' }
  }
  if (p.runningCount > 0) {
    const running = p.experiments.find(e => (e.status === 'RUNNING' || e.status === 'ACTIVE') && e.reviewDueAt)
    const hours = running?.reviewDueAt ? hoursUntil(running.reviewDueAt) : null
    return {
      label: hours != null ? `Monitoring · ${hours}h left` : 'Monitoring',
      color: '#15803d',
      bg: '#f0fdf4',
    }
  }
  if (p.pendingCount > 0) {
    return { label: 'Activate an experiment', color: '#6366f1', bg: '#f5f3ff' }
  }
  if (p.experiments.length === 0) {
    return { label: 'Start growth', color: '#0a0a0a', bg: '#f5f5f5' }
  }
  return null
}

export default function Dashboard() {
  const [data, setData] = useState<DashData | null>(null)
  const [adding, setAdding] = useState(false)
  const [briefLoading, setBriefLoading] = useState(false)
  const [startingId, setStartingId] = useState<string | null>(null)
  const [activatingId, setActivatingId] = useState<string | null>(null)
  const [decidingId, setDecidingId] = useState<string | null>(null)
  const [openProducts, setOpenProducts] = useState<Set<string>>(new Set())
  const [onboardingProductId, setOnboardingProductId] = useState<string | null>(null)
  const router = useRouter()
  const [form, setForm] = useState({ name: '', description: '', url: '', price: '', targetUser: '' })

  const load = useCallback(async () => {
    const [dash, brain] = await Promise.all([
      fetch('/api/dashboard').then(r => r.json()),
      fetch('/api/brain').then(r => r.json()).catch(() => null),
    ])
    setData({ ...dash, brainStats: brain })
  }, [])

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t) }, [load])

  const addProduct = async () => {
    if (!form.name || !form.description || !form.targetUser) return
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const product = await res.json()
    setAdding(false)
    setForm({ name: '', description: '', url: '', price: '', targetUser: '' })
    await load()
    // Show tracking method selection for the new product
    if (product?.id) setOnboardingProductId(product.id)
  }

  const saveTrackingMethod = async (productId: string, methodId: string) => {
    await fetch(`/api/products/${productId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metadata: { trackingMethod: methodId } }),
    })
    setOnboardingProductId(null)
  }

  const startGrowth = async (id: string) => {
    setStartingId(id)
    await fetch(`/api/products/${id}`, { method: 'POST' })
    setStartingId(null); load()
  }

  const activateExperiment = async (expId: string) => {
    setActivatingId(expId)
    await fetch(`/api/experiments/${expId}/activate`, { method: 'POST' })
    setActivatingId(null); load()
  }

  const generateBrief = async () => {
    setBriefLoading(true)
    await fetch('/api/brief', { method: 'POST' })
    setBriefLoading(false); load()
  }

  const triggerDecision = async (experimentId: string) => {
    setDecidingId(experimentId)
    await fetch('/api/decisions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ experimentId }) })
    setDecidingId(null); load()
  }

  const toggleProduct = (id: string) => {
    setOpenProducts(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }

  if (!data) return (
    <div style={{ minHeight: '100vh', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'system-ui', fontSize: 14, color: '#999' }}>Loading...</p>
    </div>
  )

  const { overview, productList, recentDecisions, dailyData, hasAnyEvents, todayBrief } = data

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Phase 7 — Tracking method onboarding modal */}
      {onboardingProductId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, maxWidth: 560, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#0a0a0a', marginBottom: 6 }}>How should Growva measure your results?</div>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>
              Choose how you'll track experiment performance. You can change this later.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {TRACKING_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => saveTrackingMethod(onboardingProductId, opt.id)}
                  style={{
                    background: opt.status === 'available' ? '#fff' : '#fafafa',
                    border: `1px solid ${opt.status === 'available' ? '#e8e8e8' : '#f0f0f0'}`,
                    borderRadius: 10, padding: '14px 16px',
                    textAlign: 'left', cursor: opt.status === 'available' ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'flex-start', gap: 14,
                    opacity: opt.status === 'coming_soon' ? 0.65 : 1,
                    transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={e => { if (opt.status === 'available') (e.currentTarget as HTMLElement).style.borderColor = '#0a0a0a' }}
                  onMouseLeave={e => { if (opt.status === 'available') (e.currentTarget as HTMLElement).style.borderColor = '#e8e8e8' }}
                >
                  <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{opt.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 14, fontWeight: 500, color: '#0a0a0a' }}>{opt.label}</span>
                      {opt.status === 'coming_soon' && (
                        <span style={{ fontSize: 10, fontWeight: 600, color: '#888', background: '#f0f0f0', borderRadius: 4, padding: '1px 7px', letterSpacing: 0.3 }}>
                          COMING SOON
                        </span>
                      )}
                      {opt.status === 'available' && opt.id !== 'skip' && (
                        <span style={{ fontSize: 10, fontWeight: 600, color: '#15803d', background: '#f0fdf4', borderRadius: 4, padding: '1px 7px', letterSpacing: 0.3 }}>
                          AVAILABLE NOW
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }}>{opt.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Top nav */}
      <div style={{ background: '#fff', borderBottom: '1px solid #f0f0f0', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 24, height: 24, background: '#0a0a0a', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: '#fff' }} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#0a0a0a', letterSpacing: -0.3 }}>Growva</span>
        </div>
        <div style={{ display: 'flex', gap: 20, fontSize: 13, color: '#888', alignItems: 'center' }}>
          <span>{overview.products} products</span>
          <span style={{ color: '#16a34a', fontWeight: 500 }}>{overview.activeExperiments} monitoring</span>
          <button onClick={() => router.push('/pricing')} style={{ background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 14px', fontSize: 12, cursor: 'pointer' }}>
            Upgrade
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>

        {/* Phase 4 — Zero state: no products */}
        {productList.length === 0 && (
          <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 12, padding: '48px 32px', textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 24, marginBottom: 12 }}>⚡</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#0a0a0a', marginBottom: 8 }}>
              Add your first product to get today's growth decision.
            </div>
            <div style={{ fontSize: 14, color: '#888', marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
              Growva will generate 3 experiments, monitor results, and tell you exactly what to scale or kill.
            </div>
            <button onClick={() => setAdding(true)} style={{ background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 24px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
              + Add product
            </button>
          </div>
        )}

        {/* DAILY BRIEF — only show when there is data */}
        {todayBrief && (
          <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 12, padding: 24, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#999', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Today's Brief</div>
                <p style={{ fontSize: 14, color: '#333', lineHeight: 1.6, margin: '0 0 12px' }}>{todayBrief.content}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#f0fdf4', borderRadius: 8, marginBottom: 14 }}>
                  <span style={{ fontSize: 12, color: '#15803d', fontWeight: 500 }}>Focus today →</span>
                  <span style={{ fontSize: 13, color: '#166534' }}>{todayBrief.topFocus}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {todayBrief.actions?.map((a, i) => (
                    <div key={i} style={{ padding: '6px 12px', borderRadius: 6, background: a.priority === 'high' ? '#fef2f2' : a.priority === 'medium' ? '#fffbeb' : '#f8fafc', border: `1px solid ${a.priority === 'high' ? '#fecaca' : a.priority === 'medium' ? '#fde68a' : '#e2e8f0'}` }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#666' }}>{a.product}: </span>
                      <span style={{ fontSize: 11, color: '#444' }}>{a.action}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={generateBrief}
                disabled={briefLoading}
                style={{ background: briefLoading ? '#f3f4f6' : '#0a0a0a', color: briefLoading ? '#999' : '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 500, cursor: briefLoading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                {briefLoading ? 'Generating...' : 'Refresh brief'}
              </button>
            </div>
          </div>
        )}

        {/* WAR ROOM */}
        {productList.length > 0 && (
          <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 12, marginBottom: 24, overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0a0a0a' }}>Products</span>
              <button onClick={() => setAdding(!adding)} style={{ background: 'transparent', border: '1px solid #e8e8e8', borderRadius: 7, padding: '6px 14px', fontSize: 12, color: '#444', cursor: 'pointer' }}>
                {adding ? 'Cancel' : '+ Add product'}
              </button>
            </div>

            {adding && (
              <div style={{ padding: '20px 24px', background: '#fafafa', borderBottom: '1px solid #f0f0f0', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
                {[{ k: 'name', p: 'Product name', lbl: 'Name' }, { k: 'targetUser', p: 'Solo founders', lbl: 'Target user' }, { k: 'url', p: 'https://...', lbl: 'URL' }, { k: 'price', p: '29', lbl: 'Price ($)' }].map(f => (
                  <div key={f.k}>
                    <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>{f.lbl}</div>
                    <input value={(form as any)[f.k]} onChange={e => setForm({ ...form, [f.k]: e.target.value })} placeholder={f.p} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e8e8e8', borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                ))}
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>Description</div>
                  <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What it does and who it's for" rows={2} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e8e8e8', borderRadius: 6, fontSize: 13, resize: 'none', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <button onClick={addProduct} style={{ background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 7, padding: '9px 20px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Add product</button>
              </div>
            )}

            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 120px 100px 80px 200px', padding: '10px 24px', borderBottom: '1px solid #f5f5f5', gap: 16 }}>
              {['Product', 'Revenue 7d', 'Conv. 7d', 'Tests', 'Status'].map(h => (
                <div key={h} style={{ fontSize: 11, fontWeight: 600, color: '#bbb', letterSpacing: 0.5 }}>{h.toUpperCase()}</div>
              ))}
            </div>

            {productList.map(p => {
              const state = productStateLabel(p)
              const isOpen = openProducts.has(p.id)
              const totalTests = p.experiments.length

              return (
                <div key={p.id}>
                  <div
                    onClick={() => toggleProduct(p.id)}
                    style={{ display: 'grid', gridTemplateColumns: '2fr 120px 100px 80px 200px', padding: '14px 24px', borderBottom: '1px solid #f5f5f5', alignItems: 'center', gap: 16, cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: '#0a0a0a', marginBottom: 2 }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: '#999' }}>{p.targetUser}</div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: p.revenue7d > 0 ? '#16a34a' : '#0a0a0a' }}>${p.revenue7d.toFixed(0)}</div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#0a0a0a' }}>{p.conversions7d}</div>
                    <div style={{ fontSize: 13, color: '#666' }}>{totalTests}</div>
                    {/* Phase 4 — state pill */}
                    <div onClick={e => e.stopPropagation()}>
                      {state ? (
                        <span style={{ fontSize: 11, fontWeight: 600, color: state.color, background: state.bg, border: `1px solid ${state.color}33`, borderRadius: 6, padding: '4px 10px', display: 'inline-block' }}>
                          {state.label}
                        </span>
                      ) : (
                        <button
                          onClick={() => startGrowth(p.id)}
                          disabled={startingId === p.id}
                          style={{ background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 7, padding: '7px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
                        >
                          {startingId === p.id ? 'Starting...' : 'Start growth'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded experiments */}
                  {isOpen && (
                    <div style={{ background: '#fafafa', borderBottom: '1px solid #f0f0f0', padding: '16px 24px' }}>

                      {/* Phase 4 — contextual guidance */}
                      {p.experiments.length === 0 && (
                        <div style={{ padding: '16px 20px', background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500, color: '#0a0a0a', marginBottom: 2 }}>Generate your first 3 experiments</div>
                            <div style={{ fontSize: 12, color: '#888' }}>Growva will create targeted experiments based on your product and target user.</div>
                          </div>
                          <button
                            onClick={() => startGrowth(p.id)}
                            disabled={startingId === p.id}
                            style={{ background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 16px', fontSize: 12, fontWeight: 500, cursor: 'pointer', flexShrink: 0, marginLeft: 16 }}
                          >
                            {startingId === p.id ? 'Generating...' : 'Generate experiments →'}
                          </button>
                        </div>
                      )}

                      {p.experiments.length > 0 && p.pendingCount > 0 && p.runningCount === 0 && (
                        <div style={{ padding: '12px 16px', background: '#f5f3ff', border: '1px solid #c4b5fd', borderRadius: 8, marginBottom: 12, fontSize: 12, color: '#5b21b6' }}>
                          Activate one experiment to start monitoring. Growva will give you a decision in 48 hours.
                        </div>
                      )}

                      {p.runningCount > 0 && p.decisionReadyCount === 0 && (
                        <div style={{ padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, marginBottom: 12, fontSize: 12, color: '#15803d' }}>
                          Growva is monitoring this experiment. Check back when the decision is ready.
                        </div>
                      )}

                      {p.decisionReadyCount > 0 && (
                        <div style={{ padding: '12px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, marginBottom: 12, fontSize: 12, color: '#92400e', fontWeight: 500 }}>
                          Decision ready — go to the product page to get Growva's recommendation.
                        </div>
                      )}

                      {/* Experiment list */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {p.experiments.map(exp => {
                          const isPending = exp.status === 'PENDING'
                          const isRunning = exp.status === 'RUNNING' || exp.status === 'ACTIVE'
                          const isReady = isRunning && exp.reviewDueAt != null && new Date(exp.reviewDueAt) <= new Date()
                          const statusColor: Record<string, string> = {
                            PENDING: '#6366f1', RUNNING: '#10b981', ACTIVE: '#d97706',
                            SCALED: '#16a34a', KILLED: '#dc2626', COMPLETED: '#999',
                          }

                          return (
                            <div key={exp.id} style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: '14px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                    <span style={{ fontSize: 11, fontWeight: 600, color: statusColor[exp.status] || '#999', textTransform: 'uppercase', letterSpacing: 0.5 }}>{exp.status}</span>
                                    <span style={{ fontSize: 11, color: '#bbb' }}>·</span>
                                    <span style={{ fontSize: 11, color: '#bbb' }}>{exp.type.replace('_', ' ')}</span>
                                    {isReady && <span style={{ fontSize: 10, fontWeight: 700, color: '#d97706', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 4, padding: '1px 6px' }}>DECISION READY</span>}
                                  </div>
                                  <div style={{ fontSize: 14, fontWeight: 500, color: '#0a0a0a', marginBottom: 2 }}>{exp.headline}</div>
                                  <div style={{ fontSize: 12, color: '#999', fontStyle: 'italic' }}>{exp.angle}</div>
                                </div>
                                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                                  {/* Phase 5 — activate button */}
                                  {isPending && (
                                    <button
                                      onClick={() => activateExperiment(exp.id)}
                                      disabled={activatingId === exp.id}
                                      style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 7, padding: '7px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
                                    >
                                      {activatingId === exp.id ? 'Activating...' : 'I activated this'}
                                    </button>
                                  )}
                                  {isRunning && (
                                    <button
                                      onClick={() => triggerDecision(exp.id)}
                                      disabled={decidingId === exp.id}
                                      style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 7, padding: '7px 14px', fontSize: 12, color: '#444', cursor: 'pointer' }}
                                    >
                                      {decidingId === exp.id ? 'Deciding...' : 'Decide'}
                                    </button>
                                  )}
                                  <button
                                    onClick={() => router.push(`/products/${p.id}`)}
                                    style={{ background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 7, padding: '7px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
                                  >
                                    View →
                                  </button>
                                </div>
                              </div>
                              {/* Phase 6 — inline tracking hint */}
                              {isRunning && exp.trackingId && (
                                <div style={{ marginTop: 10, fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ color: '#10b981' }}>🔗 Tracking link ready</span>
                                  <span>—</span>
                                  <a href={`/products/${p.id}`} style={{ color: '#6366f1', textDecoration: 'none' }}>View link and monitoring →</a>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Bottom row: Chart + Decision log — only when there is data */}
        {(hasAnyEvents || recentDecisions.length > 0) && (
          <div style={{ display: 'grid', gridTemplateColumns: hasAnyEvents && recentDecisions.length > 0 ? '1fr 1fr' : '1fr', gap: 16 }}>
            {hasAnyEvents && (
              <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 12, padding: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#999', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 16 }}>Activity — 7 days</div>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={dailyData}>
                    <XAxis dataKey="date" tick={{ fill: '#ccc', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={d => d.slice(5)} />
                    <YAxis tick={{ fill: '#ccc', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #eee', borderRadius: 6, fontSize: 12 }} labelStyle={{ color: '#666' }} />
                    <Line type="monotone" dataKey="events" stroke="#0a0a0a" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {recentDecisions.length > 0 && (
              <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 12, padding: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#999', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 16 }}>Decision log</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
                  {recentDecisions.map(d => (
                    <div key={d.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
                      <span style={{ width: 22, height: 22, borderRadius: 6, background: `${ACTION_COLOR[d.action]}15`, color: ACTION_COLOR[d.action], fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {ACTION_ICON[d.action]}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: ACTION_COLOR[d.action] }}>{d.action} <span style={{ color: '#999', fontWeight: 400 }}>· {d.product.name}</span></div>
                        <div style={{ fontSize: 11, color: '#aaa' }}>{d.reason}</div>
                      </div>
                      <span style={{ fontSize: 10, color: '#ccc' }}>{Math.round(d.confidence * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Brain — only when there are patterns */}
        {data.brainStats && (data.brainStats.collectiveDatapoints > 0 || data.brainStats.topPatterns?.length > 0) && (
          <div style={{ marginTop: 16, background: '#fff', border: '1px solid #e8e8e8', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#0a0a0a' }}>Brain</span>
              <span style={{ fontSize: 11, padding: '2px 8px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 100 }}>Active</span>
              <span style={{ marginLeft: 'auto', fontSize: 12, color: '#bbb' }}>{data.brainStats.collectiveDatapoints} collective datapoints</span>
            </div>
            <div style={{ padding: '14px 20px' }}>
              {data.brainStats.topPatterns?.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 11, color: '#bbb', fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>TOP COLLECTIVE PATTERNS</div>
                  {data.brainStats.topPatterns.slice(0, 3).map((p: any, i: number) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                      <span style={{ color: '#16a34a', fontWeight: 600, minWidth: 40 }}>{(p.avgConversionRate * 100).toFixed(1)}%</span>
                      <span style={{ color: '#555', flex: 1 }}>{p.angle}</span>
                      <span style={{ color: '#bbb' }}>{p.channel} · {p.sampleSize} experiments</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
