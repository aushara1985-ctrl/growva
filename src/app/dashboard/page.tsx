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

interface Product {
  id: string
  name: string
  targetUser: string
  description: string
  price: number | null
  apiKey: string
  isActive: boolean
  experiments: Array<{ id: string; status: string; type: string; angle: string; headline: string; copy: string; cta: string; distributionChannel: string; expectedKpi: string }>
  score: Score | null
  winningPatterns: WinningPattern[]
  conversions7d: number
  revenue7d: number
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
  todayBrief: Brief | null
  brainStats?: { collectiveDatapoints: number; topPatterns: any[] }
}

const ACTION_COLOR: Record<string, string> = { KILL: '#dc2626', SCALE: '#16a34a', ITERATE: '#d97706', CONTINUE: '#2563eb' }
const ACTION_ICON: Record<string, string> = { KILL: '—', SCALE: '↑', ITERATE: '↻', CONTINUE: '→' }

export default function Dashboard() {
  const [data, setData] = useState<DashData | null>(null)
  const [adding, setAdding] = useState(false)
  const [briefLoading, setBriefLoading] = useState(false)
  const [startingId, setStartingId] = useState<string | null>(null)
  const [decidingId, setDecidingId] = useState<string | null>(null)
  const [openProducts, setOpenProducts] = useState<Set<string>>(new Set())
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
    await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setAdding(false); setForm({ name: '', description: '', url: '', price: '', targetUser: '' }); load()
  }

  const startGrowth = async (id: string) => {
    setStartingId(id)
    await fetch(`/api/products/${id}`, { method: 'POST' })
    setStartingId(null); load()
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

  const { overview, productList, recentDecisions, dailyData, todayBrief } = data

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Top nav */}
      <div style={{ background: '#fff', borderBottom: '1px solid #f0f0f0', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 24, height: 24, background: '#0a0a0a', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: '#fff' }} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#0a0a0a', letterSpacing: -0.3 }}>Revenue Engine</span>
        </div>
        <div style={{ display: 'flex', gap: 20, fontSize: 13, color: '#888', alignItems: 'center' }}>
          <span>{overview.products} products</span>
          <span style={{ color: '#16a34a', fontWeight: 500 }}>{overview.activeExperiments} running</span>
          <button onClick={() => router.push('/templates')} style={{ background: 'transparent', border: '1px solid #e8e8e8', borderRadius: 6, padding: '5px 12px', fontSize: 12, color: '#555', cursor: 'pointer' }}>
            Templates
          </button>
          <button onClick={() => router.push('/growth-cards')} style={{ background: 'transparent', border: '1px solid #e8e8e8', borderRadius: 6, padding: '5px 12px', fontSize: 12, color: '#555', cursor: 'pointer' }}>
            Growth cards
          </button>
          <button onClick={() => router.push('/pricing')} style={{ background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 14px', fontSize: 12, cursor: 'pointer' }}>
            Upgrade
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>

        {/* DAILY BRIEF */}
        <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#999', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Today's Brief</div>
              {todayBrief ? (
                <>
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
                </>
              ) : (
                <p style={{ fontSize: 14, color: '#aaa', margin: 0 }}>No brief yet for today. Generate one to see AI recommendations.</p>
              )}
            </div>
            <button
              onClick={generateBrief}
              disabled={briefLoading}
              style={{ background: briefLoading ? '#f3f4f6' : '#0a0a0a', color: briefLoading ? '#999' : '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 500, cursor: briefLoading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              {briefLoading ? 'Generating...' : 'Generate brief'}
            </button>
          </div>
        </div>

        {/* WAR ROOM — Product table */}
        <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 12, marginBottom: 24, overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#0a0a0a' }}>War Room</span>
            <button onClick={() => setAdding(!adding)} style={{ background: 'transparent', border: '1px solid #e8e8e8', borderRadius: 7, padding: '6px 14px', fontSize: 12, color: '#444', cursor: 'pointer' }}>
              {adding ? 'Cancel' : '+ Add product'}
            </button>
          </div>

          {adding && (
            <div style={{ padding: '20px 24px', background: '#fafafa', borderBottom: '1px solid #f0f0f0', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
              {[{ k: 'name', p: 'Product name', lbl: 'Name' }, { k: 'targetUser', p: 'Saudi freelancers', lbl: 'Target user' }, { k: 'url', p: 'https://...', lbl: 'URL' }, { k: 'price', p: '29', lbl: 'Price ($)' }].map(f => (
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
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 100px 100px 100px 80px 160px', padding: '10px 24px', borderBottom: '1px solid #f5f5f5', gap: 16 }}>
            {['Product', 'Revenue 7d', 'Conv. 7d', 'Score', 'Tests', 'Status'].map(h => (
              <div key={h} style={{ fontSize: 11, fontWeight: 600, color: '#bbb', letterSpacing: 0.5 }}>{h.toUpperCase()}</div>
            ))}
          </div>

          {productList.length === 0 && (
            <div style={{ padding: '48px 24px', textAlign: 'center', fontSize: 13, color: '#ccc' }}>Add your first product to get started</div>
          )}

          {productList.map(p => {
            const active = p.experiments.filter(e => e.status === 'ACTIVE').length
            const isOpen = openProducts.has(p.id)
            const scoreColor = (p.score?.overall || 0) >= 60 ? '#16a34a' : (p.score?.overall || 0) >= 30 ? '#d97706' : '#dc2626'

            return (
              <div key={p.id}>
                <div
                  onClick={() => toggleProduct(p.id)}
                  style={{ display: 'grid', gridTemplateColumns: '2fr 100px 100px 100px 80px 160px', padding: '14px 24px', borderBottom: '1px solid #f5f5f5', alignItems: 'center', gap: 16, cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#0a0a0a', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {p.name}
                      {p.isActive && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />}
                    </div>
                    <div style={{ fontSize: 12, color: '#999' }}>{p.targetUser}</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: p.revenue7d > 0 ? '#16a34a' : '#0a0a0a' }}>${p.revenue7d.toFixed(0)}</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#0a0a0a' }}>{p.conversions7d}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ flex: 1, height: 4, background: '#f0f0f0', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${p.score?.overall || 0}%`, height: '100%', background: scoreColor, borderRadius: 2, transition: 'width 0.5s' }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: scoreColor, minWidth: 24 }}>{p.score?.overall || 0}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#666' }}>{active} active</div>
                  <div onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => startGrowth(p.id)}
                      disabled={startingId === p.id || p.isActive}
                      style={{
                        background: p.isActive ? '#f0fdf4' : '#0a0a0a',
                        color: p.isActive ? '#16a34a' : '#fff',
                        border: p.isActive ? '1px solid #bbf7d0' : 'none',
                        borderRadius: 7, padding: '7px 14px', fontSize: 12, fontWeight: 500,
                        cursor: p.isActive ? 'default' : 'pointer', width: '100%',
                      }}
                    >
                      {startingId === p.id ? 'Starting...' : p.isActive ? '● Running' : 'Start growth'}
                    </button>
                  </div>
                </div>

                {/* Expanded experiments */}
                {isOpen && (
                  <div style={{ background: '#fafafa', borderBottom: '1px solid #f0f0f0', padding: '16px 24px' }}>
                    <div style={{ fontSize: 11, color: '#bbb', fontWeight: 600, letterSpacing: 0.5, marginBottom: 12 }}>API KEY: <span style={{ fontFamily: 'monospace', color: '#999', fontWeight: 400 }}>{p.apiKey}</span></div>

                    {/* Score breakdown */}
                    {p.score && (
                      <div style={{ marginBottom: 16 }}>
                        {(p.score as any).recommendation && (
                          <div style={{ padding: '10px 14px', background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 8, marginBottom: 10, fontSize: 12, color: '#555', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: (p.score as any).signal === 'accelerating' ? '#f0fdf4' : (p.score as any).signal === 'steady' ? '#eff6ff' : (p.score as any).signal === 'slowing' ? '#fffbeb' : '#fef2f2', color: (p.score as any).signal === 'accelerating' ? '#16a34a' : (p.score as any).signal === 'steady' ? '#2563eb' : (p.score as any).signal === 'slowing' ? '#d97706' : '#dc2626' }}>
                              {(p.score as any).signal?.toUpperCase()}
                            </span>
                            {(p.score as any).recommendation}
                          </div>
                        )}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                          {[
                            { label: 'Momentum', val: p.score.momentum },
                            { label: 'Conv. Health', val: p.score.conversionHealth },
                            { label: 'Rev. Velocity', val: p.score.revenueVelocity },
                            { label: 'Growth Chance', val: p.score.growthChance },
                          ].map(s => (
                            <div key={s.label} style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: '10px 14px' }}>
                              <div style={{ fontSize: 11, color: '#bbb', marginBottom: 4 }}>{s.label}</div>
                              <div style={{ fontSize: 18, fontWeight: 600, color: '#0a0a0a' }}>{s.val}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Winning patterns */}
                    {p.winningPatterns.length > 0 && (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 11, color: '#bbb', fontWeight: 600, letterSpacing: 0.5, marginBottom: 8 }}>WINNING PATTERNS</div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {p.winningPatterns.map((w, i) => (
                            <div key={i} style={{ padding: '6px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, fontSize: 12 }}>
                              <span style={{ color: '#15803d', fontWeight: 500 }}>{(w.conversionRate * 100).toFixed(1)}%</span>
                              <span style={{ color: '#555', marginLeft: 6 }}>{w.angle} · {w.channel}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Experiments */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {p.experiments.length === 0 && <div style={{ fontSize: 13, color: '#ccc', padding: '20px 0', textAlign: 'center' }}>No experiments — start growth mode first</div>}
                      {p.experiments.map(exp => {
                        const statusColor: Record<string, string> = { ACTIVE: '#d97706', SCALED: '#16a34a', KILLED: '#dc2626', COMPLETED: '#999' }
                        return (
                          <div key={exp.id} style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                  <span style={{ fontSize: 11, fontWeight: 600, color: statusColor[exp.status] || '#999', textTransform: 'uppercase', letterSpacing: 0.5 }}>{exp.status}</span>
                                  <span style={{ fontSize: 11, color: '#bbb' }}>·</span>
                                  <span style={{ fontSize: 11, color: '#bbb' }}>{exp.type.replace('_', ' ')}</span>
                                </div>
                                <div style={{ fontSize: 14, fontWeight: 500, color: '#0a0a0a', marginBottom: 3 }}>{exp.headline}</div>
                                <div style={{ fontSize: 12, color: '#999', fontStyle: 'italic', marginBottom: 6 }}>{exp.angle}</div>
                                <div style={{ fontSize: 12, color: '#666', lineHeight: 1.5 }}>{exp.copy}</div>
                                <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12, color: '#aaa' }}>
                                  <span>CTA: <span style={{ color: '#555' }}>{exp.cta}</span></span>
                                  <span>Channel: <span style={{ color: '#555' }}>{exp.distributionChannel}</span></span>
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                                {exp.status === 'ACTIVE' && (
                                  <button
                                    onClick={() => triggerDecision(exp.id)}
                                    disabled={decidingId === exp.id}
                                    style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 7, padding: '7px 14px', fontSize: 12, color: '#444', cursor: 'pointer' }}
                                  >
                                    {decidingId === exp.id ? 'Deciding...' : 'Decide'}
                                  </button>
                                )}
                                <button
                                  onClick={() => router.push(`/execute/${exp.id}`)}
                                  style={{ background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 7, padding: '7px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
                                >
                                  Execute →
                                </button>
                              </div>
                            </div>
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

        {/* Bottom row: Chart + Feed */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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

          <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 12, padding: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#999', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 16 }}>Decision log</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
              {recentDecisions.length === 0 && <div style={{ fontSize: 13, color: '#ddd', padding: '20px 0', textAlign: 'center' }}>No decisions yet</div>}
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
        </div>

        {/* Brain Status */}
        {data.brainStats && (
          <div style={{ marginTop: 16, background: '#fff', border: '1px solid #e8e8e8', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#0a0a0a' }}>Brain</span>
              <span style={{ fontSize: 11, padding: '2px 8px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 100 }}>Active</span>
              <span style={{ marginLeft: 'auto', fontSize: 12, color: '#bbb' }}>{data.brainStats.collectiveDatapoints} collective datapoints</span>
            </div>
            <div style={{ padding: '14px 20px' }}>
              {data.brainStats.topPatterns?.length > 0 ? (
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
              ) : (
                <div style={{ fontSize: 13, color: '#ccc' }}>Brain is learning — run more experiments to unlock collective intelligence.</div>
              )}
            </div>
          </div>
        )}

        {/* Webhook info */}
        <div style={{ marginTop: 16, padding: '14px 20px', background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, fontSize: 12, color: '#999', lineHeight: 1.8 }}>
          <span style={{ fontWeight: 600, color: '#555' }}>Webhook: </span>
          POST /api/events · Header: <code style={{ background: '#f5f5f5', padding: '1px 5px', borderRadius: 3, fontFamily: 'monospace' }}>x-api-key: [product_api_key]</code> · Body: <code style={{ background: '#f5f5f5', padding: '1px 5px', borderRadius: 3, fontFamily: 'monospace' }}>&#123;"type": "PAGE_VIEW|CLICK|SIGNUP|PURCHASE", "value": 1&#125;</code>
        </div>
      </div>
    </div>
  )
}
