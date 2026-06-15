'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface Brief {
  content: string
  topFocus: string
  actions: Array<{ product: string; action: string; reason: string; priority: 'high' | 'medium' | 'low' }>
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
  score: null
  winningPatterns: []
  conversions7d: number
  revenue7d: number
  pendingCount: number
  runningCount: number
  decisionReadyCount: number
  _count: { events: number }
}

interface DecisionV6 {
  verdict: 'STOP' | 'CONTINUE' | 'SCALE'
  why: string
  confidence: 'LOW' | 'MEDIUM' | 'HIGH'
  diagnosis: string
  nextAction: string
  nextExperiment: string
}

interface Decision {
  id: string
  productId: string
  action: string
  reason: string
  confidence: number
  createdAt: string
  product: { id: string; name: string }
  experiment: { id: string; angle: string } | null
  metadata?: { v6?: DecisionV6 } | null
}

interface Roi {
  decisionsMade: number; stop: number; continue: number; scale: number
  weeksPerStop: number; weeksSaved: number
  views: number; clicks: number; signups: number
}
interface DashData {
  roi: Roi
  overview: { products: number; activeExperiments: number; totalRevenue: number; totalConversions: number; scaledTotal: number; killedTotal: number }
  productList: Product[]
  recentDecisions: Decision[]
  dailyData: Array<{ date: string; events: number }>
  hasAnyEvents: boolean
  todayBrief: Brief | null
}

const ACTION_COLOR: Record<string, string> = { KILL: '#ef4444', SCALE: '#22c55e', ITERATE: '#f59e0b', CONTINUE: '#3b82f6', RESTART: '#f59e0b' }
const ACTION_ICON: Record<string, string> = { KILL: '—', SCALE: '↑', ITERATE: '↻', CONTINUE: '→', RESTART: '↻' }

const DIAGNOSIS_LABEL: Record<string, string> = {
  no_traffic: 'No traffic', weak_traffic: 'Weak traffic', weak_conversion: 'Weak conversion',
  weak_offer: 'Weak offer', wrong_audience: 'Wrong audience', tracking_issue: 'Tracking issue',
  promising_under_sampled: 'Promising — under-sampled', validated: 'Validated',
}

// Verdict → human decision question + theme
function verdictTheme(verdict: string) {
  const v = verdict === 'KILL' ? 'STOP' : verdict
  if (v === 'SCALE') return { label: 'SCALE', text: 'text-emerald-300', dot: 'bg-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/[0.06]' }
  if (v === 'STOP') return { label: 'STOP', text: 'text-red-300', dot: 'bg-red-400', border: 'border-red-500/30', bg: 'bg-red-500/[0.06]' }
  return { label: 'CONTINUE', text: 'text-blue-300', dot: 'bg-blue-400', border: 'border-blue-500/30', bg: 'bg-blue-500/[0.06]' }
}

function hoursUntil(dateStr: string) {
  return Math.max(0, Math.round((new Date(dateStr).getTime() - Date.now()) / 36e5))
}

function productStateLabel(p: Product): { label: string; color: string; ringColor: string } {
  if (p.decisionReadyCount > 0) return { label: 'Verdict ready', color: 'text-amber-400', ringColor: 'border-amber-500/40 bg-amber-500/10' }
  if (p.runningCount > 0) {
    const running = p.experiments.find(e => (e.status === 'RUNNING' || e.status === 'ACTIVE') && e.reviewDueAt)
    const hours = running?.reviewDueAt ? hoursUntil(running.reviewDueAt) : null
    return { label: hours != null ? `Collecting · ${hours}h` : 'Collecting', color: 'text-emerald-400', ringColor: 'border-emerald-500/40 bg-emerald-500/10' }
  }
  if (p.pendingCount > 0) return { label: 'Ready to activate', color: 'text-indigo-400', ringColor: 'border-indigo-500/40 bg-indigo-500/10' }
  if (p.experiments.length === 0) return { label: 'No experiment yet', color: 'text-zinc-400', ringColor: 'border-zinc-700 bg-zinc-800' }
  return { label: 'Decided', color: 'text-zinc-400', ringColor: 'border-zinc-700 bg-zinc-800' }
}

const inputCls = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/10 transition-all'
const textareaCls = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/10 resize-none transition-all'
const btnPrimary = 'w-full sm:w-auto bg-white text-black text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-zinc-100 active:scale-[.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed text-center'
const btnSecondary = 'w-full sm:w-auto bg-transparent text-zinc-400 text-sm border border-zinc-700 px-4 py-2.5 rounded-lg hover:bg-zinc-800 hover:text-zinc-200 transition-all text-center'

export default function Dashboard() {
  const [data, setData] = useState<DashData | null>(null)
  const [briefLoading, setBriefLoading] = useState(false)
  const [startingId, setStartingId] = useState<string | null>(null)
  const [activatingId, setActivatingId] = useState<string | null>(null)
  const [onboardingProductId, setOnboardingProductId] = useState<string | null>(null)
  const router = useRouter()

  // New decision wizard
  const [showNewExp, setShowNewExp] = useState(false)
  const [setupMode, setSetupMode] = useState<'' | 'TRAFFIC' | 'SPRINT'>('')
  const [setupStep, setSetupStep] = useState(0)
  const [setupData, setSetupData] = useState({ name: '', targetUser: '', goal: 'signups', url: '', context: '', trackingMethod: '', hypothesis: '', sprintType: '' })
  const [setupLoading, setSetupLoading] = useState(false)

  const load = useCallback(async () => {
    const dash = await fetch('/api/dashboard').then(r => r.json())
    setData(dash)
  }, [])

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t) }, [load])

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

  const resetSetup = () => { setSetupMode(''); setSetupStep(0); setShowNewExp(false); setSetupData({ name: '', targetUser: '', goal: 'signups', url: '', context: '', trackingMethod: '', hypothesis: '', sprintType: '' }) }

  const logout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }) } catch {}
    window.location.href = '/login'
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

  const { roi, overview, productList, recentDecisions, dailyData, hasAnyEvents, todayBrief } = data

  const isFirstRun = productList.length === 0
  const showSetupCard = isFirstRun || showNewExp

  // ── Decision Room state machine ───────────────────────────────────────────
  const verdictReadyProduct = productList.find(p => p.decisionReadyCount > 0)
  const runningProduct = productList.find(p => p.runningCount > 0)
  const latestDecision = recentDecisions[0] || null

  return (
    <div className="min-h-screen bg-[#09090B] text-white" style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>

      {/* ── Tracking method modal ── */}
      {onboardingProductId && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="text-base font-semibold text-white mb-1">How should Growva measure your results?</div>
            <div className="text-xs text-zinc-500 mb-6">Choose how you&apos;ll track experiment performance. You can change this later.</div>
            <div className="flex flex-col gap-3">
              {[
                { id: 'tracking_links', label: 'Use Growva tracking links', description: 'Best for posts, DMs, emails, and campaigns. Growva generates a unique link per experiment.', status: 'available' as const, icon: '🔗' },
                { id: 'analytics', label: 'Connect analytics', description: 'Google Analytics, Plausible — helps Growva understand visits.', status: 'coming_soon' as const, icon: '📊' },
                { id: 'payments', label: 'Connect payments', description: 'Stripe, Lemon Squeezy, Gumroad — helps Growva see which experiments drive revenue.', status: 'coming_soon' as const, icon: '💳' },
                { id: 'skip', label: "I don't track results yet", description: 'Growva will still guide you with tracking links and check-ins.', status: 'available' as const, icon: '→' },
              ].map(opt => (
                <button key={opt.id} onClick={() => saveTrackingMethod(onboardingProductId, opt.id)} disabled={opt.status === 'coming_soon'}
                  className={`text-left border rounded-xl p-4 flex items-start gap-3 transition-all ${opt.status === 'available' ? 'bg-zinc-800 border-zinc-700 hover:border-zinc-500 cursor-pointer' : 'bg-zinc-900 border-zinc-800 opacity-50 cursor-default'}`}>
                  <span className="text-lg shrink-0 mt-0.5">{opt.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-white">{opt.label}</span>
                      {opt.status === 'coming_soon' && <span className="text-[10px] font-semibold text-zinc-500 bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 uppercase tracking-wide">Soon</span>}
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
      <div className="bg-zinc-950 border-b border-zinc-800 px-4 sm:px-6 h-14 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-white rounded-md flex items-center justify-center">
            <div className="w-2 h-2 rounded-sm bg-black" />
          </div>
          <span className="text-sm font-semibold text-white tracking-tight">Growva</span>
          <span className="hidden sm:inline text-xs text-zinc-600 ml-1">Decision Room</span>
        </div>
        <div className="flex items-center gap-3 sm:gap-5 text-xs text-zinc-500">
          {overview.activeExperiments > 0 && <span className="text-emerald-400 font-medium">{overview.activeExperiments} running</span>}
          <button onClick={logout}
            className="text-zinc-500 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-600 rounded-lg px-2.5 py-1 transition-all">
            Sign out
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-4">

        {/* ══════════════════════════════════════════════════════════════
            WIZARD — Start a new decision (shown alone when open)
        ══════════════════════════════════════════════════════════════ */}
        {showSetupCard && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">

            {/* Path selection — step 0 */}
            {setupStep === 0 && (
              <div className="p-6 sm:p-8">
                {!isFirstRun && (
                  <div className="flex items-center justify-between mb-6">
                    <div className="text-[11px] text-zinc-600 uppercase tracking-widest">Start a new decision</div>
                    <button onClick={resetSetup} className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors">✕ Cancel</button>
                  </div>
                )}
                {isFirstRun && (
                  <div className="text-[11px] text-zinc-600 uppercase tracking-widest mb-5">Welcome to Growva</div>
                )}
                <div className="text-lg font-semibold text-white mb-2">What are you trying to decide?</div>
                <div className="text-sm text-zinc-500 mb-8 leading-relaxed">Choose how you want to validate this experiment.</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button onClick={() => { setSetupMode('SPRINT'); setSetupStep(1) }}
                    className="relative bg-amber-500/[0.07] border-2 border-amber-500/40 hover:border-amber-400/70 rounded-xl p-6 text-left transition-all">
                    <span className="absolute top-3 right-3 text-[10px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 rounded-full px-2 py-0.5 uppercase tracking-wide">Start here</span>
                    <div className="text-xl mb-3">⚡</div>
                    <div className="text-sm font-semibold text-white mb-1">I need traffic</div>
                    <div className="text-xs text-zinc-400 leading-relaxed">No traffic yet? Growva builds a 48-hour action plan, script, and tracking link to create real signal fast.</div>
                    <div className="text-xs text-amber-400/80 mt-3 font-medium">→ Validation sprint</div>
                  </button>
                  <button onClick={() => { setSetupMode('TRAFFIC'); setSetupStep(1) }}
                    className="bg-zinc-800 border-2 border-zinc-700 hover:border-zinc-500 rounded-xl p-6 text-left transition-all">
                    <div className="text-xl mb-3">📊</div>
                    <div className="text-sm font-semibold text-white mb-1">I have traffic</div>
                    <div className="text-xs text-zinc-500 leading-relaxed">Already have a landing page, campaign, or launch? Growva tracks signal and tells you when to scale or stop.</div>
                    <div className="text-xs text-zinc-600 mt-3 font-medium">→ Track existing traffic</div>
                  </button>
                </div>
              </div>
            )}

            {/* ── TRAFFIC STEPS ── */}
            {setupMode === 'TRAFFIC' && setupStep === 1 && (
              <div className="p-6 sm:p-8">
                <div className="text-[11px] text-zinc-600 uppercase tracking-widest mb-5">I have traffic · Step 1 of 4</div>
                <div className="text-base font-semibold text-white mb-6">What are you testing, and who is it for?</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                  <div>
                    <div className="text-[11px] text-zinc-500 mb-2 uppercase tracking-wide">What are you testing?</div>
                    <input value={setupData.name} onChange={e => setSetupData({ ...setupData, name: e.target.value })} placeholder="e.g. Pricing page headline" className={inputCls} />
                  </div>
                  <div>
                    <div className="text-[11px] text-zinc-500 mb-2 uppercase tracking-wide">Who is this for?</div>
                    <input value={setupData.targetUser} onChange={e => setSetupData({ ...setupData, targetUser: e.target.value })} placeholder="e.g. Solo founders, ops teams" className={inputCls} />
                  </div>
                </div>
                <div className="mb-6">
                  <div className="text-[11px] text-zinc-600 mb-2 uppercase tracking-wide">Context for Growva <span className="normal-case text-zinc-700">(optional)</span></div>
                  <textarea value={setupData.context} onChange={e => setSetupData({ ...setupData, context: e.target.value })} placeholder="What has been tried, what is working, what is the product." rows={2} className={textareaCls} />
                </div>
                <div className="flex flex-col-reverse sm:flex-row gap-3">
                  <button onClick={resetSetup} className={btnSecondary}>Cancel</button>
                  <button onClick={() => { if (setupData.name && setupData.targetUser) setSetupStep(2) }} disabled={!setupData.name || !setupData.targetUser} className={btnPrimary}>Next →</button>
                </div>
              </div>
            )}

            {setupMode === 'TRAFFIC' && setupStep === 2 && (
              <div className="p-6 sm:p-8">
                <div className="text-[11px] text-zinc-600 uppercase tracking-widest mb-5">I have traffic · Step 2 of 4</div>
                <div className="text-base font-semibold text-white mb-2">What outcome matters most?</div>
                <div className="text-xs text-zinc-500 mb-6">Growva will watch for this signal and use it in its verdict.</div>
                <div className="flex flex-wrap gap-2 mb-8">
                  {[{ value: 'signups', label: 'Signups', desc: 'Email captures, waitlist joins' }, { value: 'revenue', label: 'Revenue', desc: 'Sales, purchases, payments' }, { value: 'clicks', label: 'Clicks', desc: 'Link clicks, CTA engagement' }, { value: 'activation', label: 'Activation', desc: 'First meaningful action' }].map(opt => (
                    <button key={opt.value} onClick={() => setSetupData({ ...setupData, goal: opt.value })}
                      className={`px-4 py-3 rounded-lg text-sm font-medium text-left border transition-all flex-1 min-w-[140px] ${setupData.goal === opt.value ? 'bg-white text-black border-white' : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-zinc-500'}`}>
                      <div>{opt.label}</div>
                      <div className="text-[11px] mt-0.5 opacity-60">{opt.desc}</div>
                    </button>
                  ))}
                </div>
                <div className="flex flex-col-reverse sm:flex-row gap-3">
                  <button onClick={() => setSetupStep(1)} className={btnSecondary}>← Back</button>
                  <button onClick={() => setSetupStep(3)} className={btnPrimary}>Next →</button>
                </div>
              </div>
            )}

            {setupMode === 'TRAFFIC' && setupStep === 3 && (
              <div className="p-6 sm:p-8">
                <div className="text-[11px] text-zinc-600 uppercase tracking-widest mb-5">I have traffic · Step 3 of 4</div>
                <div className="text-base font-semibold text-white mb-2">Where is this experiment running?</div>
                <div className="text-xs text-zinc-500 mb-6">Growva needs the URL for context and attribution.</div>
                <div className="mb-8">
                  <div className="text-[11px] text-zinc-500 mb-2 uppercase tracking-wide">Product or page URL <span className="text-red-500 font-bold">*</span></div>
                  <input value={setupData.url} onChange={e => setSetupData({ ...setupData, url: e.target.value })} placeholder="https://yourproduct.com" type="url" className={inputCls} />
                  {!setupData.url && <div className="text-xs text-red-500 mt-1.5">URL is required to track your experiment</div>}
                </div>
                <div className="flex flex-col-reverse sm:flex-row gap-3">
                  <button onClick={() => setSetupStep(2)} className={btnSecondary}>← Back</button>
                  <button onClick={() => { if (setupData.url) setSetupStep(4) }} disabled={!setupData.url} className={btnPrimary}>Next →</button>
                </div>
              </div>
            )}

            {setupMode === 'TRAFFIC' && setupStep === 4 && (
              <div className="p-6 sm:p-8">
                <div className="text-[11px] text-zinc-600 uppercase tracking-widest mb-5">I have traffic · Step 4 of 4</div>
                <div className="text-base font-semibold text-white mb-2">How should Growva collect signal?</div>
                <div className="text-xs text-zinc-500 mb-6">You need at least one method for Growva to make a reliable decision.</div>
                <div className="flex flex-col gap-3 mb-8">
                  {[
                    { id: 'tracking_links', icon: '🔗', label: 'Tracking links', desc: 'Best for posts, DMs, emails, and campaigns.', tracks: 'Tracks: clicks, source, referrer' },
                    { id: 'site_snippet', icon: '</>', label: 'Site snippet', desc: 'Paste a small script on your page. Auto-tracks page views.', tracks: 'Tracks: page views, signups, purchases' },
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
                <div className="flex flex-col-reverse sm:flex-row gap-3 items-stretch sm:items-center">
                  <button onClick={() => setSetupStep(3)} className={btnSecondary}>← Back</button>
                  <button onClick={runTrafficSetup} disabled={!setupData.trackingMethod || setupLoading} className={btnPrimary}>
                    {setupLoading ? 'Setting up...' : 'Start experiment →'}
                  </button>
                </div>
              </div>
            )}

            {/* ── SPRINT STEPS ── */}
            {setupMode === 'SPRINT' && setupStep === 1 && (
              <div className="p-6 sm:p-8">
                <div className="text-[11px] text-zinc-600 uppercase tracking-widest mb-5">I need traffic · Step 1 of 3</div>
                <div className="text-base font-semibold text-white mb-6">What are you trying to validate?</div>
                <div className="space-y-4 mb-6">
                  <div>
                    <div className="text-[11px] text-zinc-500 mb-2 uppercase tracking-wide">Product or experiment name</div>
                    <input value={setupData.name} onChange={e => setSetupData({ ...setupData, name: e.target.value })} placeholder="e.g. Growva, pricing page" className={inputCls} />
                  </div>
                  <div>
                    <div className="text-[11px] text-zinc-500 mb-2 uppercase tracking-wide">Hypothesis — what do you want to validate?</div>
                    <input value={setupData.hypothesis} onChange={e => setSetupData({ ...setupData, hypothesis: e.target.value })} placeholder="e.g. Will solo founders pay for a decision engine?" className={inputCls} />
                  </div>
                  <div>
                    <div className="text-[11px] text-zinc-500 mb-2 uppercase tracking-wide">Who are you targeting?</div>
                    <input value={setupData.targetUser} onChange={e => setSetupData({ ...setupData, targetUser: e.target.value })} placeholder="e.g. SaaS founders under $5k MRR" className={inputCls} />
                  </div>
                </div>
                <div className="flex flex-col-reverse sm:flex-row gap-3">
                  <button onClick={resetSetup} className={btnSecondary}>Cancel</button>
                  <button onClick={() => { if (setupData.name && setupData.hypothesis && setupData.targetUser) setSetupStep(2) }} disabled={!setupData.name || !setupData.hypothesis || !setupData.targetUser} className={btnPrimary}>Next →</button>
                </div>
              </div>
            )}

            {setupMode === 'SPRINT' && setupStep === 2 && (
              <div className="p-6 sm:p-8">
                <div className="text-[11px] text-zinc-600 uppercase tracking-widest mb-5">I need traffic · Step 2 of 3</div>
                <div className="text-base font-semibold text-white mb-2">How will you create signal?</div>
                <div className="text-xs text-zinc-500 mb-6">Growva generates the exact action, script, and tracking link for your sprint.</div>
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
                <div className="flex flex-col-reverse sm:flex-row gap-3">
                  <button onClick={() => setSetupStep(1)} className={btnSecondary}>← Back</button>
                  <button onClick={() => { if (setupData.sprintType) setSetupStep(3) }} disabled={!setupData.sprintType} className={btnPrimary}>Next →</button>
                </div>
              </div>
            )}

            {setupMode === 'SPRINT' && setupStep === 3 && (
              <div className="p-6 sm:p-8">
                <div className="text-[11px] text-zinc-600 uppercase tracking-widest mb-5">I need traffic · Step 3 of 3</div>
                <div className="text-base font-semibold text-white mb-2">Do you have a page for this experiment?</div>
                <div className="text-xs text-zinc-500 mb-6 leading-relaxed">If yes, paste the URL — Growva will generate a tracking link pointing to it. If no, the tracking link alone is enough to start.</div>
                <div className="mb-8">
                  <div className="text-[11px] text-zinc-600 mb-2 uppercase tracking-wide">Page URL <span className="normal-case text-zinc-700">(optional)</span></div>
                  <input value={setupData.url} onChange={e => setSetupData({ ...setupData, url: e.target.value })} placeholder="https://yourpage.com — leave blank if none yet" type="url" className={inputCls} />
                </div>
                <div className="flex flex-col-reverse sm:flex-row gap-3">
                  <button onClick={() => setSetupStep(2)} className={btnSecondary}>← Back</button>
                  <button onClick={runSprintSetup} disabled={setupLoading} className={btnPrimary}>
                    {setupLoading ? 'Generating sprint...' : '⚡ Start sprint →'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            ① CURRENT DECISION — the hero. Only when wizard is closed.
        ══════════════════════════════════════════════════════════════ */}
        {!showSetupCard && (() => {
          // Priority: verdict ready > collecting > latest decision > empty
          if (verdictReadyProduct) {
            const exp = verdictReadyProduct.experiments.find(e => (e.status === 'RUNNING' || e.status === 'ACTIVE'))
            return (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-5 sm:p-6">
                <div className="text-[11px] text-zinc-500 uppercase tracking-widest mb-3">Current decision</div>
                <div className="text-lg font-semibold text-white mb-1">Is it time to scale, continue, or stop?</div>
                <div className="text-sm text-zinc-400 mb-1">{verdictReadyProduct.name} — {exp?.headline}</div>
                <div className="inline-flex items-center gap-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-1.5 my-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Verdict ready — enough signal collected
                </div>
                <div className="flex flex-col sm:flex-row gap-2 mt-2">
                  <button onClick={() => router.push(`/products/${verdictReadyProduct.id}`)} className={btnPrimary}>Get verdict →</button>
                </div>
              </div>
            )
          }
          if (runningProduct) {
            const exp = runningProduct.experiments.find(e => (e.status === 'RUNNING' || e.status === 'ACTIVE') && e.reviewDueAt)
            const hours = exp?.reviewDueAt ? hoursUntil(exp.reviewDueAt) : null
            return (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
                <div className="text-[11px] text-zinc-500 uppercase tracking-widest mb-3">Current decision</div>
                <div className="text-lg font-semibold text-white mb-1">Should we keep pushing this experiment?</div>
                <div className="text-sm text-zinc-400 mb-3">{runningProduct.name} — {runningProduct.experiments.find(e => e.status === 'RUNNING' || e.status === 'ACTIVE')?.headline}</div>
                <div className="inline-flex items-center gap-2 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5 mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Collecting signal{hours != null ? ` · ${hours}h left in window` : ''}
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button onClick={() => router.push(`/products/${runningProduct.id}`)} className={btnPrimary}>Continue current experiment →</button>
                </div>
              </div>
            )
          }
          if (latestDecision) {
            const v6 = latestDecision.metadata?.v6
            const theme = verdictTheme(v6?.verdict || latestDecision.action)
            return (
              <div className={`rounded-2xl border ${theme.border} ${theme.bg} p-5 sm:p-6`}>
                <div className="text-[11px] text-zinc-500 uppercase tracking-widest mb-3">Current decision</div>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${theme.dot}`} />
                    <span className={`text-base font-bold tracking-wide ${theme.text}`}>{theme.label}</span>
                    {v6 && <><span className="text-xs text-zinc-600">·</span><span className="text-xs text-zinc-500">{DIAGNOSIS_LABEL[v6.diagnosis] || v6.diagnosis}</span></>}
                  </div>
                  {v6 && <span className={`text-xs font-semibold ${v6.confidence === 'HIGH' ? 'text-emerald-400' : v6.confidence === 'MEDIUM' ? 'text-amber-400' : 'text-zinc-500'}`}>{v6.confidence}</span>}
                </div>
                <div className="text-sm text-zinc-300 mb-1">{latestDecision.product.name}</div>
                <p className="text-sm text-zinc-200 leading-relaxed mb-3">{v6?.why || latestDecision.reason}</p>
                {v6?.nextAction && (
                  <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-3 mb-4">
                    <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">Next action</div>
                    <div className="text-sm text-zinc-300 leading-relaxed">{v6.nextAction}</div>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-2">
                  <button onClick={() => { setShowNewExp(true); setSetupStep(0) }} className={btnPrimary}>Start next experiment →</button>
                  <button onClick={() => router.push(`/products/${latestDecision.productId}`)} className={btnSecondary}>View verdict</button>
                </div>
              </div>
            )
          }
          // Empty state
          return (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 sm:p-8 text-center">
              <div className="text-[11px] text-zinc-600 uppercase tracking-widest mb-3">Current decision</div>
              <div className="text-lg font-semibold text-white mb-1">No decision yet</div>
              <div className="text-sm text-zinc-500 mb-5">Start your first decision and Growva will tell you what to test, stop, continue, or scale.</div>
              <button onClick={() => { setShowNewExp(true); setSetupStep(0) }} className={`${btnPrimary} sm:!w-auto sm:inline-block mx-auto`}>Start your first decision →</button>
            </div>
          )
        })()}

        {/* ② START NEW DECISION (compact entry) — hidden when wizard open */}
        {!showSetupCard && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-white">Start a new decision</div>
              <div className="text-xs text-zinc-500 mt-0.5">Track existing traffic, or run a 48-hour validation sprint</div>
            </div>
            <button onClick={() => { setShowNewExp(true); setSetupStep(0) }}
              className="w-full sm:w-auto text-sm font-medium bg-zinc-800 text-zinc-200 border border-zinc-700 px-4 py-2.5 rounded-lg hover:border-zinc-500 hover:text-white transition-all text-center">
              New decision
            </button>
          </div>
        )}

        {/* ③ RECENT EXPERIMENTS — compact cards, not a products table */}
        {!showSetupCard && productList.length > 0 && (
          <div className="space-y-2">
            <div className="text-[11px] text-zinc-600 uppercase tracking-widest px-1">Recent experiments</div>
            {productList.map(p => {
              const state = productStateLabel(p)
              const headExp = p.experiments[0]
              return (
                <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-sm font-medium text-white truncate">{headExp?.headline || p.name}</span>
                        <span className={`text-[10px] font-semibold border rounded px-1.5 py-0.5 whitespace-nowrap ${state.color} ${state.ringColor}`}>{state.label}</span>
                      </div>
                      <div className="text-xs text-zinc-500 truncate">{p.name} · {p.targetUser}</div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {p.experiments.length === 0 ? (
                        <button onClick={() => startGrowth(p.id)} disabled={startingId === p.id}
                          className="flex-1 sm:flex-none text-xs font-medium bg-white text-black px-3 py-2 rounded-lg hover:bg-zinc-100 transition-all disabled:opacity-50 text-center">
                          {startingId === p.id ? 'Starting...' : 'Start experiment'}
                        </button>
                      ) : (
                        <button onClick={() => router.push(`/products/${p.id}`)}
                          className="flex-1 sm:flex-none text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700 px-3 py-2 rounded-lg hover:border-zinc-500 hover:text-white transition-all text-center">
                          Open →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ④ IMPACT — moved below the decision, never above it */}
        {!showSetupCard && productList.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="px-5 sm:px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <span className="text-sm font-semibold text-white">Impact with Growva</span>
              <span className="text-[10px] text-zinc-600 uppercase tracking-widest">Real data</span>
            </div>
            {roi.decisionsMade === 0 ? (
              <div className="px-6 py-8 text-center">
                <div className="text-sm text-zinc-400 mb-1">Your first decision unlocks this report.</div>
                <div className="text-xs text-zinc-600">Once Growva judges an experiment, you&apos;ll see how much time it saved you here.</div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-zinc-800">
                  <div className="bg-zinc-900 px-5 sm:px-6 py-5">
                    <div className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-1.5">Decisions made</div>
                    <div className="text-2xl font-semibold text-white">{roi.decisionsMade}</div>
                  </div>
                  <div className="bg-zinc-900 px-5 sm:px-6 py-5">
                    <div className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-1.5">Breakdown</div>
                    <div className="flex items-center gap-3 text-sm font-medium pt-1">
                      <span className="text-red-400">{roi.stop} stop</span>
                      <span className="text-blue-400">{roi.continue} continue</span>
                      <span className="text-emerald-400">{roi.scale} scale</span>
                    </div>
                  </div>
                  <div className="bg-zinc-900 px-5 sm:px-6 py-5">
                    <div className="text-[10px] font-semibold text-amber-500/80 uppercase tracking-widest mb-1.5">⭐ Time saved</div>
                    <div className="text-2xl font-semibold text-amber-300">~{roi.weeksSaved} {roi.weeksSaved === 1 ? 'week' : 'weeks'}</div>
                    <div className="text-[10px] text-zinc-600 mt-1">{roi.stop} early stop{roi.stop === 1 ? '' : 's'} × ~{roi.weeksPerStop} weeks of building avoided</div>
                  </div>
                </div>
                <div className="px-5 sm:px-6 py-4 border-t border-zinc-800 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-zinc-500">
                  <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Real signal collected</span>
                  <span><span className="text-zinc-300 font-medium">{roi.views.toLocaleString()}</span> views</span>
                  <span><span className="text-zinc-300 font-medium">{roi.clicks.toLocaleString()}</span> clicks</span>
                  <span><span className="text-zinc-300 font-medium">{roi.signups.toLocaleString()}</span> signups</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Secondary: history + brief (bottom, collapsed feel) ── */}
        {!showSetupCard && (hasAnyEvents || recentDecisions.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentDecisions.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 sm:p-6">
                <div className="text-[11px] font-semibold text-zinc-600 uppercase tracking-widest mb-4">Decision history</div>
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
                        <div className="text-[11px] text-zinc-600 truncate">{d.metadata?.v6?.why || d.reason}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {hasAnyEvents && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 sm:p-6">
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
          </div>
        )}

        {/* ── Today's brief (lowest priority, optional) ── */}
        {!showSetupCard && todayBrief && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="text-[11px] font-semibold text-zinc-600 uppercase tracking-widest mb-3">Today&apos;s brief</div>
                <p className="text-sm text-zinc-300 leading-relaxed mb-3">{todayBrief.content}</p>
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                  <span className="text-xs text-emerald-400 font-medium">Focus today →</span>
                  <span className="text-xs text-emerald-300">{todayBrief.topFocus}</span>
                </div>
              </div>
              <button onClick={generateBrief} disabled={briefLoading} className="shrink-0 text-xs text-zinc-500 border border-zinc-700 rounded-lg px-3 py-1.5 hover:text-zinc-300 hover:border-zinc-500 transition-all">
                {briefLoading ? '...' : 'Refresh'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
