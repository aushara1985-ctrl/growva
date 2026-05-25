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

const ACTION_COLOR: Record<string, string> = { KILL: '#ef4444', SCALE: '#22c55e', ITERATE: '#f59e0b', CONTINUE: '#3b82f6' }
const ACTION_ICON: Record<string, string> = { KILL: '—', SCALE: '↑', ITERATE: '↻', CONTINUE: '→' }

const TRACKING_OPTIONS = [
  { id: 'tracking_links', label: 'Use Growva tracking links', description: 'Best for beta. We give each experiment a tracking link and monitor clicks.', status: 'available' as const, icon: '🔗' },
  { id: 'analytics', label: 'Connect analytics', description: 'Google Analytics, Plausible — helps Growva understand visits and conversions.', status: 'coming_soon' as const, icon: '📊' },
  { id: 'payments', label: 'Connect payments', description: 'Stripe, Lemon Squeezy, Gumroad — helps Growva see which experiments drive revenue.', status: 'coming_soon' as const, icon: '💳' },
  { id: 'forms', label: 'Connect forms / waitlists', description: 'Tally, Typeform — helps Growva measure leads and signups.', status: 'coming_soon' as const, icon: '📋' },
  { id: 'social', label: 'Track posts and campaigns', description: 'Use tracking links for X, LinkedIn, Reddit posts. API integrations later.', status: 'available' as const, icon: '📣' },
  { id: 'skip', label: "I don't track results yet", description: 'Growva will still guide you with tracking links and simple check-ins.', status: 'available' as const, icon: '→' },
]

function hoursUntil(dateStr: string): number {
  return Math.max(0, Math.round((new Date(dateStr).getTime() - Date.now()) / 36e5))
}

function productStateLabel(p: Product): { label: string; color: string; ringColor: string } | null {
  if (p.decisionReadyCount > 0) return { label: 'Decision ready', color: 'text-amber-400', ringColor: 'border-amber-500/40 bg-amber-500/10' }
  if (p.runningCount > 0) {
    const running = p.experiments.find(e => (e.status === 'RUNNING' || e.status === 'ACTIVE') && e.reviewDueAt)
    const hours = running?.reviewDueAt ? hoursUntil(running.reviewDueAt) : null
    return { label: hours != null ? `Monitoring · ${hours}h left` : 'Monitoring', color: 'text-emerald-400', ringColor: 'border-emerald-500/40 bg-emerald-500/10' }
  }
  if (p.pendingCount > 0) return { label: 'Activate an experiment', color: 'text-indigo-400', ringColor: 'border-indigo-500/40 bg-indigo-500/10' }
  if (p.experiments.length === 0) return { label: 'Start growth', color: 'text-zinc-400', ringColor: 'border-zinc-700 bg-zinc-800' }
  return null
}

// ── shared input / button primitives ──────────────────────────────────────────
const inputCls = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/10 transition-all'
const textareaCls = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/10 resize-none transition-all'
const btnPrimary = 'bg-white text-black text-sm font-semibold px-4 py-2 rounded-lg hover:bg-zinc-100 active:scale-[.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed'
const btnSecondary = 'bg-transparent text-zinc-400 text-sm border border-zinc-700 px-4 py-2 rounded-lg hover:bg-zinc-800 hover:text-zinc-200 transition-all'

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
  const [form, setForm] = useState({ name: '', description: '', url: '', targetUser: '', goal: 'signups' })

  const [setupMode, setSetupMode] = useState<'' | 'TRAFFIC' | 'SPRINT'>('')
  const [setupStep, setSetupStep] = useState(0)
  const [setupData, setSetupData] = useState({ name: '', targetUser: '', goal: 'signups', url: '', context: '', trackingMethod: '', hypothesis: '', sprintType: '' })
  const [setupLoading, setSetupLoading] = useState(false)

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
    const res = await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const product = await res.json()
    setAdding(false)
    setForm({ name: '', description: '', url: '', targetUser: '', goal: 'signups' })
    await load()
    if (product?.id) setOnboardingProductId(product.id)
  }

  const saveTrackingMethod = async (productId: string, methodId: string) => {
    await fetch(`/api/products/${productId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ metadata: { trackingMethod: methodId } }) })
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

  const runTrafficSetup = async () => {
    if (!setupData.name || !setupData.targetUser || !setupData.url || !setupData.trackingMethod) return
    setSetupLoading(true)
    try {
      const res = await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: setupData.name, targetUser: setupData.targetUser, description: setupData.context || `${setupData.name} — built for ${setupData.targetUser}`, url: setupData.url, goal: setupData.goal }) })
      const product = await res.json()
      if (!product?.id) { setSetupLoading(false); return }
      await fetch(`/api/products/${product.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ metadata: { trackingMethod: setupData.trackingMethod, mode: 'TRAFFIC' } }) })
      fetch(`/api/products/${product.id}`, { method: 'POST' }).catch(() => {})
      router.push(`/products/${product.id}`)
    } catch { setSetupLoading(false) }
  }

  const runSprintSetup = async () => {
    if (!setupData.name || !setupData.hypothesis || !setupData.sprintType) return
    setSetupLoading(true)
    try {
      const res = await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: setupData.name, targetUser: setupData.targetUser || setupData.name, description: setupData.hypothesis, url: setupData.url || null, goal: 'signups' }) })
      const product = await res.json()
      if (!product?.id) { setSetupLoading(false); return }
      await fetch('/api/experiments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: product.id, hypothesis: setupData.hypothesis, sprintType: setupData.sprintType, targetAudience: setupData.targetUser }) })
      router.push(`/products/${product.id}`)
    } catch { setSetupLoading(false) }
  }

  if (!data) return (
    <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
    </div>
  )

  const { overview, productList, recentDecisions, dailyData, hasAnyEvents, todayBrief } = data

  return (
    <div className="min-h-screen bg-[#09090B] text-white" style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>

      {/* ── Tracking method onboarding modal ── */}
      {onboardingProductId && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="text-base font-semibold text-white mb-1">How should Growva measure your results?</div>
            <div className="text-xs text-zinc-500 mb-6">Choose how you'll track experiment performance. You can change this later.</div>
            <div className="flex flex-col gap-3">
              {TRACKING_OPTIONS.map(opt => (
                <button key={opt.id} onClick={() => saveTrackingMethod(onboardingProductId, opt.id)}
                  disabled={opt.status === 'coming_soon'}
                  className={`text-left border rounded-xl p-4 flex items-start gap-3 transition-all ${opt.status === 'available' ? 'bg-zinc-800 border-zinc-700 hover:border-zinc-500 cursor-pointer' : 'bg-zinc-900 border-zinc-800 opacity-50 cursor-default'}`}>
                  <span className="text-lg shrink-0 mt-0.5">{opt.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-white">{opt.label}</span>
                      {opt.status === 'coming_soon' && <span className="text-[10px] font-semibold text-zinc-500 bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 uppercase tracking-wide">Soon</span>}
                      {opt.status === 'available' && opt.id !== 'skip' && <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded px-1.5 py-0.5 uppercase tracking-wide">Available</span>}
                    </div>
                    <div className="text-xs text-zinc-500 leading-relaxed">{opt.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Nav ── */}
      <div className="bg-zinc-950 border-b border-zinc-800 px-6 h-14 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-white rounded-md flex items-center justify-center">
            <div className="w-2 h-2 rounded-sm bg-black" />
          </div>
          <span className="text-sm font-semibold text-white tracking-tight">Growva</span>
        </div>
        <div className="flex items-center gap-5 text-xs text-zinc-500">
          <span>{overview.products} {overview.products === 1 ? 'product' : 'products'}</span>
          {overview.activeExperiments > 0
            ? <span className="text-emerald-400 font-medium">{overview.activeExperiments} running</span>
            : overview.products > 0 && <span className="text-zinc-600">no active experiments</span>}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-4">

        {/* ── First-run setup flow ── */}
        {productList.length === 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">

            {/* Step 0 — traffic or sprint? */}
            {setupStep === 0 && (
              <div className="p-10">
                <div className="text-[11px] text-zinc-600 uppercase tracking-widest mb-5">Start your first experiment</div>
                <div className="text-lg font-semibold text-white mb-2">Do you already have traffic for this experiment?</div>
                <div className="text-sm text-zinc-500 mb-8 leading-relaxed">A landing page, campaign, waitlist, or audience you can send to a link.</div>
                <div className="grid grid-cols-2 gap-3 max-w-lg">
                  {[
                    { mode: 'TRAFFIC' as const, icon: '📊', title: 'Yes — I have traffic', desc: 'Track existing traffic and get a data-driven decision' },
                    { mode: 'SPRINT' as const,  icon: '⚡', title: 'No — I need to create traffic', desc: 'Run a 48-hour sprint — Growva gives you the plan and tracking link' },
                  ].map(opt => (
                    <button key={opt.mode} onClick={() => { setSetupMode(opt.mode); setSetupStep(1) }}
                      className="bg-zinc-800 border-2 border-zinc-700 hover:border-zinc-500 rounded-xl p-5 text-left transition-all group">
                      <div className="text-xl mb-3">{opt.icon}</div>
                      <div className="text-sm font-semibold text-white mb-1">{opt.title}</div>
                      <div className="text-xs text-zinc-500 leading-relaxed">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── TRAFFIC PATH ── */}
            {setupMode === 'TRAFFIC' && setupStep === 1 && (
              <div className="p-8">
                <div className="text-[11px] text-zinc-600 uppercase tracking-widest mb-5">Traffic Mode · Step 1 of 4</div>
                <div className="text-base font-semibold text-white mb-6">What are you testing, and who is it for?</div>
                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div>
                    <div className="text-[11px] text-zinc-500 mb-2 uppercase tracking-wide">What are you testing?</div>
                    <input value={setupData.name} onChange={e => setSetupData({ ...setupData, name: e.target.value })} placeholder="e.g. Pricing page headline, Beta launch" className={inputCls} />
                  </div>
                  <div>
                    <div className="text-[11px] text-zinc-500 mb-2 uppercase tracking-wide">Who is this for?</div>
                    <input value={setupData.targetUser} onChange={e => setSetupData({ ...setupData, targetUser: e.target.value })} placeholder="e.g. Solo founders, ops teams, cafes" className={inputCls} />
                  </div>
                </div>
                <div className="mb-6">
                  <div className="text-[11px] text-zinc-600 mb-2 uppercase tracking-wide">Context for Growva <span className="normal-case text-zinc-700">(optional)</span></div>
                  <textarea value={setupData.context} onChange={e => setSetupData({ ...setupData, context: e.target.value })} placeholder="What has been tried, what is working, what is the product." rows={2} className={textareaCls} />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { setSetupMode(''); setSetupStep(0) }} className={btnSecondary}>← Back</button>
                  <button onClick={() => { if (setupData.name && setupData.targetUser) setSetupStep(2) }} className={btnPrimary} disabled={!setupData.name || !setupData.targetUser}>Next →</button>
                </div>
              </div>
            )}

            {setupMode === 'TRAFFIC' && setupStep === 2 && (
              <div className="p-8">
                <div className="text-[11px] text-zinc-600 uppercase tracking-widest mb-5">Traffic Mode · Step 2 of 4</div>
                <div className="text-base font-semibold text-white mb-2">What outcome matters most?</div>
                <div className="text-xs text-zinc-500 mb-6">Growva will watch for this signal and use it in its verdict.</div>
                <div className="flex flex-wrap gap-2 mb-8">
                  {[
                    { value: 'signups', label: 'Signups', desc: 'Email captures, waitlist joins' },
                    { value: 'revenue', label: 'Revenue', desc: 'Sales, purchases, payments' },
                    { value: 'clicks', label: 'Clicks', desc: 'Link clicks, CTA engagement' },
                    { value: 'activation', label: 'Activation', desc: 'First meaningful action' },
                  ].map(opt => (
                    <button key={opt.value} onClick={() => setSetupData({ ...setupData, goal: opt.value })}
                      className={`px-4 py-3 rounded-lg text-sm font-medium text-left border transition-all min-w-[130px] ${setupData.goal === opt.value ? 'bg-white text-black border-white' : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-zinc-500'}`}>
                      <div>{opt.label}</div>
                      <div className="text-[11px] mt-0.5 opacity-60">{opt.desc}</div>
                    </button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setSetupStep(1)} className={btnSecondary}>← Back</button>
                  <button onClick={() => setSetupStep(3)} className={btnPrimary}>Next →</button>
                </div>
              </div>
            )}

            {setupMode === 'TRAFFIC' && setupStep === 3 && (
              <div className="p-8">
                <div className="text-[11px] text-zinc-600 uppercase tracking-widest mb-5">Traffic Mode · Step 3 of 4</div>
                <div className="text-base font-semibold text-white mb-2">Where is this experiment running?</div>
                <div className="text-xs text-zinc-500 mb-6">Growva needs the URL for context and attribution.</div>
                <div className="mb-8">
                  <div className="text-[11px] text-zinc-500 mb-2 uppercase tracking-wide">Product or page URL <span className="text-red-500 font-bold">*</span></div>
                  <input value={setupData.url} onChange={e => setSetupData({ ...setupData, url: e.target.value })} placeholder="https://yourproduct.com" type="url" className={inputCls} />
                  {!setupData.url && <div className="text-xs text-red-500 mt-1.5">URL is required</div>}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setSetupStep(2)} className={btnSecondary}>← Back</button>
                  <button onClick={() => { if (setupData.url) setSetupStep(4) }} disabled={!setupData.url} className={btnPrimary}>Next →</button>
                </div>
              </div>
            )}

            {setupMode === 'TRAFFIC' && setupStep === 4 && (
              <div className="p-8">
                <div className="text-[11px] text-zinc-600 uppercase tracking-widest mb-5">Traffic Mode · Step 4 of 4</div>
                <div className="text-base font-semibold text-white mb-2">How should Growva collect signal?</div>
                <div className="text-xs text-zinc-500 mb-6">Choose your tracking method. You need at least one for Growva to make a reliable decision.</div>
                <div className="flex flex-col gap-3 mb-8">
                  {[
                    { id: 'tracking_links', icon: '🔗', label: 'Tracking links', desc: 'Best for posts, DMs, emails, and campaigns. Growva generates a unique link per experiment.', tracks: 'Tracks: clicks, source, referrer' },
                    { id: 'site_snippet', icon: '</>', label: 'Site snippet', desc: 'Paste a small script on your page. Auto-tracks page views. Call growva.track() for signups and purchases.', tracks: 'Tracks: page views, signups, purchases' },
                  ].map(opt => (
                    <button key={opt.id} onClick={() => setSetupData({ ...setupData, trackingMethod: opt.id })}
                      className={`text-left border-2 rounded-xl p-4 flex items-start gap-4 transition-all ${setupData.trackingMethod === opt.id ? 'bg-zinc-800 border-white' : 'bg-zinc-900 border-zinc-700 hover:border-zinc-500'}`}>
                      <span className="text-lg shrink-0 mt-0.5 font-mono">{opt.icon}</span>
                      <div>
                        <div className="text-sm font-semibold text-white mb-1">{opt.label}</div>
                        <div className="text-xs text-zinc-500 leading-relaxed mb-1">{opt.desc}</div>
                        <div className="text-[11px] text-emerald-400 font-medium">{opt.tracks}</div>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setSetupStep(3)} className={btnSecondary}>← Back</button>
                  <button onClick={runTrafficSetup} disabled={!setupData.trackingMethod || setupLoading} className={btnPrimary}>
                    {setupLoading ? 'Setting up...' : 'Generate experiments →'}
                  </button>
                  {!setupData.trackingMethod && <span className="text-xs text-red-400">Select a tracking method</span>}
                </div>
              </div>
            )}

            {/* ── SPRINT PATH ── */}
            {setupMode === 'SPRINT' && setupStep === 1 && (
              <div className="p-8">
                <div className="text-[11px] text-zinc-600 uppercase tracking-widest mb-5">Sprint Mode · Step 1 of 3</div>
                <div className="text-base font-semibold text-white mb-6">What are you trying to validate?</div>
                <div className="space-y-4 mb-6">
                  <div>
                    <div className="text-[11px] text-zinc-500 mb-2 uppercase tracking-wide">Product name</div>
                    <input value={setupData.name} onChange={e => setSetupData({ ...setupData, name: e.target.value })} placeholder="e.g. Growva, SeatX, pricing page" className={inputCls} />
                  </div>
                  <div>
                    <div className="text-[11px] text-zinc-500 mb-2 uppercase tracking-wide">Hypothesis — what you want to validate</div>
                    <input value={setupData.hypothesis} onChange={e => setSetupData({ ...setupData, hypothesis: e.target.value })} placeholder="e.g. Will solo founders pay for a decision engine?" className={inputCls} />
                  </div>
                  <div>
                    <div className="text-[11px] text-zinc-500 mb-2 uppercase tracking-wide">Who are you targeting?</div>
                    <input value={setupData.targetUser} onChange={e => setSetupData({ ...setupData, targetUser: e.target.value })} placeholder="e.g. SaaS founders under $5k MRR" className={inputCls} />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { setSetupMode(''); setSetupStep(0) }} className={btnSecondary}>← Back</button>
                  <button onClick={() => { if (setupData.name && setupData.hypothesis && setupData.targetUser) setSetupStep(2) }} disabled={!setupData.name || !setupData.hypothesis || !setupData.targetUser} className={btnPrimary}>Next →</button>
                </div>
              </div>
            )}

            {setupMode === 'SPRINT' && setupStep === 2 && (
              <div className="p-8">
                <div className="text-[11px] text-zinc-600 uppercase tracking-widest mb-5">Sprint Mode · Step 2 of 3</div>
                <div className="text-base font-semibold text-white mb-2">How will you create traffic?</div>
                <div className="text-xs text-zinc-500 mb-6">Growva will generate the exact action, script, and tracking link for your sprint.</div>
                <div className="flex flex-col gap-2 mb-8">
                  {([
                    { id: 'DM', icon: '💬', label: 'DM 20 people', desc: 'Personal outreach — best for B2B and niche communities' },
                    { id: 'X_POST', icon: '𝕏', label: 'Post on X', desc: 'Public validation — good if your audience is on Twitter' },
                    { id: 'REDDIT', icon: '↑', label: 'Post on Reddit', desc: 'Community validation — find the right subreddit first' },
                    { id: 'INTERVIEW', icon: '🎙', label: 'Interview 5 users', desc: '5 conversations — best for deep problem validation' },
                    { id: 'LANDING_SEND', icon: '🔗', label: 'Send page to 10 founders', desc: 'Direct link — get feedback on your landing or offer' },
                    { id: 'PAID_ACCESS', icon: '💳', label: 'Offer paid early access', desc: 'Ultimate test — people vote with their wallet' },
                  ] as const).map(opt => (
                    <button key={opt.id} onClick={() => setSetupData({ ...setupData, sprintType: opt.id })}
                      className={`text-left border-2 rounded-xl px-4 py-3 flex items-center gap-4 transition-all ${setupData.sprintType === opt.id ? 'bg-zinc-800 border-white' : 'bg-zinc-900 border-zinc-700 hover:border-zinc-500'}`}>
                      <span className="text-lg shrink-0 w-7 text-center">{opt.icon}</span>
                      <div>
                        <div className="text-sm font-semibold text-white">{opt.label}</div>
                        <div className="text-xs text-zinc-500">{opt.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setSetupStep(1)} className={btnSecondary}>← Back</button>
                  <button onClick={() => { if (setupData.sprintType) setSetupStep(3) }} disabled={!setupData.sprintType} className={btnPrimary}>Next →</button>
                </div>
              </div>
            )}

            {setupMode === 'SPRINT' && setupStep === 3 && (
              <div className="p-8">
                <div className="text-[11px] text-zinc-600 uppercase tracking-widest mb-5">Sprint Mode · Step 3 of 3</div>
                <div className="text-base font-semibold text-white mb-2">Do you have a page for this experiment?</div>
                <div className="text-xs text-zinc-500 mb-6 leading-relaxed">If yes, paste the URL — Growva will generate a tracking link. If no, the tracking link alone is enough to start.</div>
                <div className="mb-8">
                  <div className="text-[11px] text-zinc-600 mb-2 uppercase tracking-wide">Page URL <span className="normal-case text-zinc-700">(optional)</span></div>
                  <input value={setupData.url} onChange={e => setSetupData({ ...setupData, url: e.target.value })} placeholder="https://yourpage.com — leave blank if you don't have one yet" type="url" className={inputCls} />
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setSetupStep(2)} className={btnSecondary}>← Back</button>
                  <button onClick={runSprintSetup} disabled={setupLoading} className={btnPrimary}>
                    {setupLoading ? 'Generating sprint...' : '⚡ Generate sprint →'}
                  </button>
                </div>
                {!setupLoading && <div className="mt-4 text-xs text-zinc-600 leading-relaxed">Growva will create a 48-hour sprint plan, a tracking link, and the exact script to use.</div>}
              </div>
            )}

          </div>
        )}

        {/* ── Daily Brief ── */}
        {todayBrief && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="text-[11px] font-semibold text-zinc-600 uppercase tracking-widest mb-3">Today's Brief</div>
                <p className="text-sm text-zinc-300 leading-relaxed mb-3">{todayBrief.content}</p>
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 mb-4">
                  <span className="text-xs text-emerald-400 font-medium">Focus today →</span>
                  <span className="text-xs text-emerald-300">{todayBrief.topFocus}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {todayBrief.actions?.map((a, i) => (
                    <div key={i} className={`px-3 py-1.5 rounded-lg border text-xs ${a.priority === 'high' ? 'bg-red-500/10 border-red-500/30 text-red-300' : a.priority === 'medium' ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
                      <span className="font-medium">{a.product}: </span>{a.action}
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={generateBrief} disabled={briefLoading} className={btnSecondary + ' shrink-0 text-xs'}>
                {briefLoading ? 'Generating...' : 'Refresh brief'}
              </button>
            </div>
          </div>
        )}

        {/* ── Running experiment banner ── */}
        {productList.some(p => p.runningCount > 0) && (() => {
          const runningProduct = productList.find(p => p.runningCount > 0)
          const runningExp = runningProduct?.experiments.find(e => e.status === 'RUNNING' || e.status === 'ACTIVE')
          if (!runningProduct || !runningExp) return null
          const isReady = runningProduct.decisionReadyCount > 0
          const hoursLeft = runningExp.reviewDueAt && !isReady ? hoursUntil(runningExp.reviewDueAt) : 0
          return (
            <div className={`border rounded-2xl p-5 ${isReady ? 'bg-amber-500/5 border-amber-500/30' : 'bg-zinc-900 border-zinc-800'}`} key={runningExp.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-bold tracking-widest uppercase ${isReady ? 'text-amber-400' : 'text-emerald-400'}`}>{isReady ? 'Decision Ready' : 'Monitoring'}</span>
                    <span className="text-zinc-700">·</span>
                    <span className="text-xs text-zinc-500">{runningProduct.name}</span>
                  </div>
                  <div className="text-sm font-semibold text-white mb-1">{runningExp.headline}</div>
                  <div className="text-xs text-zinc-500 italic">{runningExp.angle}</div>
                </div>
                <div className="shrink-0">
                  {isReady ? (
                    <button onClick={() => router.push(`/products/${runningProduct.id}`)} className={btnPrimary}>Get verdict →</button>
                  ) : (
                    <div className="text-right">
                      <div className="text-sm font-semibold text-white">{hoursLeft}h left</div>
                      <div className="text-xs text-zinc-600 mt-0.5">in decision window</div>
                    </div>
                  )}
                </div>
              </div>
              {!isReady && (
                <div className="mt-3 text-xs text-zinc-600">
                  Signal: <span className="text-zinc-400">{runningExp.expectedKpi}</span>
                  {!runningExp.trackingId && <span className="ml-3 text-amber-500/70">· No tracking link yet — open the experiment to activate</span>}
                </div>
              )}
            </div>
          )
        })()}

        {/* ── Products table ── */}
        {productList.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <span className="text-sm font-semibold text-white">Products</span>
              <button onClick={() => setAdding(!adding)} className={btnSecondary + ' text-xs py-1.5'}>
                {adding ? 'Cancel' : '+ Add product'}
              </button>
            </div>

            {/* Add product form */}
            {adding && (
              <div className="p-6 bg-zinc-950 border-b border-zinc-800">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-[11px] text-zinc-500 mb-2 uppercase tracking-wide">What are you testing?</div>
                    <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Growva, SeatX, landing page v2" className={inputCls} />
                  </div>
                  <div>
                    <div className="text-[11px] text-zinc-500 mb-2 uppercase tracking-wide">Who is this for?</div>
                    <input value={form.targetUser} onChange={e => setForm({ ...form, targetUser: e.target.value })} placeholder="e.g. solo founders, ops teams, cafes" className={inputCls} />
                  </div>
                </div>
                <div className="mb-4">
                  <div className="text-[11px] text-zinc-500 mb-2 uppercase tracking-wide">What outcome matters most?</div>
                  <div className="flex gap-2 flex-wrap">
                    {[{ value: 'signups', label: 'Signups' }, { value: 'revenue', label: 'Revenue' }, { value: 'clicks', label: 'Clicks' }, { value: 'waitlist', label: 'Waitlist' }].map(opt => (
                      <button key={opt.value} onClick={() => setForm({ ...form, goal: opt.value })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${form.goal === opt.value ? 'bg-white text-black border-white' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500'}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mb-4">
                  <div className="text-[11px] text-zinc-500 mb-2 uppercase tracking-wide">Context <span className="normal-case text-zinc-700">(what's the product, what's failed, what's working)</span></div>
                  <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Brief description — the more context, the more targeted the experiments." rows={2} className={textareaCls} />
                </div>
                <div className="mb-5">
                  <div className="text-[11px] text-zinc-600 mb-2 uppercase tracking-wide">Product URL <span className="normal-case text-zinc-700">(optional)</span></div>
                  <input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://..." className={inputCls} />
                </div>
                <button onClick={addProduct} className={btnPrimary}>Add product →</button>
              </div>
            )}

            {/* Table header */}
            <div className="grid grid-cols-[1fr_180px_64px_80px] px-6 py-3 border-b border-zinc-800/50 gap-4">
              {['Product', 'Status', 'Tests', ''].map(h => (
                <div key={h} className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">{h}</div>
              ))}
            </div>

            {productList.map(p => {
              const state = productStateLabel(p)
              const isOpen = openProducts.has(p.id)
              return (
                <div key={p.id} className="border-b border-zinc-800/50 last:border-b-0">
                  <div onClick={() => toggleProduct(p.id)}
                    className="grid grid-cols-[1fr_180px_64px_80px] px-6 py-4 gap-4 items-center cursor-pointer hover:bg-zinc-800/40 transition-colors">
                    <div>
                      <div className="text-sm font-medium text-white mb-0.5">{p.name}</div>
                      <div className="text-xs text-zinc-500">{p.targetUser}</div>
                    </div>
                    <div onClick={e => e.stopPropagation()}>
                      {state ? (
                        <span className={`text-[11px] font-semibold border rounded-md px-2.5 py-1 inline-block whitespace-nowrap ${state.color} ${state.ringColor}`}>
                          {state.label}
                        </span>
                      ) : (
                        <button onClick={() => startGrowth(p.id)} disabled={startingId === p.id} className="text-xs font-medium bg-white text-black px-3 py-1.5 rounded-lg hover:bg-zinc-100 transition-all disabled:opacity-50">
                          {startingId === p.id ? 'Starting...' : 'Start growth'}
                        </button>
                      )}
                    </div>
                    <div className="text-sm text-zinc-600">{p.experiments.length > 0 ? p.experiments.length : '—'}</div>
                    <div onClick={e => e.stopPropagation()}>
                      <button onClick={() => router.push(`/products/${p.id}`)} className={btnSecondary + ' text-xs py-1.5 px-3'}>Open →</button>
                    </div>
                  </div>

                  {/* Expanded experiments */}
                  {isOpen && (
                    <div className="bg-zinc-950 border-t border-zinc-800/50 px-6 py-4">
                      {p.experiments.length === 0 && (
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between mb-3">
                          <div>
                            <div className="text-sm font-medium text-white mb-1">Generate your first 3 experiments</div>
                            <div className="text-xs text-zinc-500">Growva will structure 3 targeted experiments and open your first 48-hour decision window.</div>
                          </div>
                          <button onClick={() => startGrowth(p.id)} disabled={startingId === p.id} className={btnPrimary + ' ml-4 shrink-0 text-xs'}>
                            {startingId === p.id ? 'Generating...' : 'Generate experiments →'}
                          </button>
                        </div>
                      )}
                      {p.experiments.length > 0 && p.pendingCount > 0 && p.runningCount === 0 && (
                        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg px-4 py-2.5 mb-3 text-xs text-indigo-300">Activate one experiment to start monitoring. Growva will give you a decision in 48 hours.</div>
                      )}
                      {p.runningCount > 0 && p.decisionReadyCount === 0 && (
                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-2.5 mb-3 text-xs text-emerald-300">Growva is monitoring this experiment. Check back when the decision is ready.</div>
                      )}
                      {p.decisionReadyCount > 0 && (
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-2.5 mb-3 text-xs text-amber-300 font-medium">Decision ready — go to the product page to get Growva's recommendation.</div>
                      )}
                      <div className="space-y-2">
                        {p.experiments.map(exp => {
                          const isPending = exp.status === 'PENDING'
                          const isRunning = exp.status === 'RUNNING' || exp.status === 'ACTIVE'
                          const isReady = isRunning && exp.reviewDueAt != null && new Date(exp.reviewDueAt) <= new Date()
                          const statusColorMap: Record<string, string> = { PENDING: 'text-indigo-400', RUNNING: 'text-emerald-400', ACTIVE: 'text-amber-400', SCALED: 'text-emerald-400', KILLED: 'text-red-400', COMPLETED: 'text-zinc-500' }
                          return (
                            <div key={exp.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <span className={`text-[10px] font-bold uppercase tracking-wide ${statusColorMap[exp.status] || 'text-zinc-500'}`}>{exp.status}</span>
                                    <span className="text-zinc-700">·</span>
                                    <span className="text-[10px] text-zinc-600">{exp.type.replace('_', ' ')}</span>
                                    {isReady && <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded px-1.5 py-0.5">DECISION READY</span>}
                                  </div>
                                  <div className="text-sm font-medium text-white mb-0.5">{exp.headline}</div>
                                  <div className="text-xs text-zinc-500 italic">{exp.angle}</div>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                  {isPending && (
                                    <button onClick={() => activateExperiment(exp.id)} disabled={activatingId === exp.id}
                                      className="text-xs font-medium bg-indigo-500 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-400 transition-all disabled:opacity-50">
                                      {activatingId === exp.id ? 'Activating...' : 'I activated this'}
                                    </button>
                                  )}
                                  {isRunning && (
                                    <button onClick={() => triggerDecision(exp.id)} disabled={decidingId === exp.id} className={btnSecondary + ' text-xs py-1.5 px-3'}>
                                      {decidingId === exp.id ? 'Deciding...' : 'Decide'}
                                    </button>
                                  )}
                                  <button onClick={() => router.push(`/products/${p.id}`)} className="text-xs font-medium bg-white text-black px-3 py-1.5 rounded-lg hover:bg-zinc-100 transition-all">View →</button>
                                </div>
                              </div>
                              {isRunning && exp.trackingId && (
                                <div className="mt-3 text-xs text-zinc-600 flex items-center gap-2">
                                  <span className="text-emerald-400">🔗 Tracking link ready</span>
                                  <span>—</span>
                                  <a href={`/products/${p.id}`} className="text-indigo-400 hover:text-indigo-300 transition-colors">View link and monitoring →</a>
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

        {/* ── Chart + Decision log ── */}
        {(hasAnyEvents || recentDecisions.length > 0) && (
          <div className={`grid gap-4 ${hasAnyEvents && recentDecisions.length > 0 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {hasAnyEvents && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <div className="text-[11px] font-semibold text-zinc-600 uppercase tracking-widest mb-4">Activity — 7 days</div>
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={dailyData}>
                    <XAxis dataKey="date" tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={d => d.slice(5)} />
                    <YAxis tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12, color: '#fafafa' }} labelStyle={{ color: '#a1a1aa' }} />
                    <Line type="monotone" dataKey="events" stroke="#ffffff" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            {recentDecisions.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <div className="text-[11px] font-semibold text-zinc-600 uppercase tracking-widest mb-4">Decision log</div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {recentDecisions.map(d => (
                    <div key={d.id} className="flex items-start gap-3 py-2 border-b border-zinc-800/50 last:border-0">
                      <span className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-xs font-bold"
                        style={{ background: `${ACTION_COLOR[d.action]}20`, color: ACTION_COLOR[d.action] }}>
                        {ACTION_ICON[d.action]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium" style={{ color: ACTION_COLOR[d.action] }}>
                          {d.action} <span className="text-zinc-500 font-normal">· {d.product.name}</span>
                        </div>
                        <div className="text-[11px] text-zinc-600 truncate">{d.reason}</div>
                      </div>
                      <span className="text-[10px] text-zinc-700 shrink-0">{Math.round(d.confidence * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Brain ── */}
        {data.brainStats && (data.brainStats.collectiveDatapoints > 0 || data.brainStats.topPatterns?.length > 0) && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-zinc-800 flex items-center gap-3">
              <span className="text-sm font-medium text-white">Brain</span>
              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-2 py-0.5">Active</span>
              <span className="ml-auto text-xs text-zinc-600">{data.brainStats.collectiveDatapoints} collective datapoints</span>
            </div>
            {data.brainStats.topPatterns?.length > 0 && (
              <div className="p-5">
                <div className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-3">Top Collective Patterns</div>
                <div className="space-y-2">
                  {data.brainStats.topPatterns.slice(0, 3).map((p: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 text-xs">
                      <span className="text-emerald-400 font-semibold w-10">{(p.avgConversionRate * 100).toFixed(1)}%</span>
                      <span className="text-zinc-300 flex-1">{p.angle}</span>
                      <span className="text-zinc-600">{p.channel} · {p.sampleSize} experiments</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
