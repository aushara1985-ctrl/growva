'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

const BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://growva-production.up.railway.app'

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

interface EventRecord {
  type: string
  value: number
  experimentId?: string | null
}

interface Product {
  id: string
  name: string
  description: string
  targetUser: string
  apiKey: string
  url: string | null
  experiments: Experiment[]
  events: EventRecord[]
}

// ─── State machine ────────────────────────────────────────────────────────────
type ExpUXState = 'pending' | 'no_data' | 'collecting' | 'ready' | 'early' | 'decided'

function getExpUXState(
  exp: Experiment,
  clicks: number,
  pageViews: number,
  signups: number,
): ExpUXState {
  if (['KILLED', 'SCALED', 'COMPLETED'].includes(exp.status)) return 'decided'
  if (exp.status === 'PENDING') return 'pending'
  const isRunning = exp.status === 'RUNNING' || exp.status === 'ACTIVE'
  if (!isRunning) return 'decided'
  const thresholdReached = pageViews >= 300 || signups >= 10
  const windowClosed = exp.reviewDueAt != null && new Date(exp.reviewDueAt) <= new Date()
  if (thresholdReached) return 'ready'
  if (windowClosed) return 'early'
  if (clicks === 0 && pageViews === 0 && signups === 0) return 'no_data'
  return 'collecting'
}

const MIN_VIEWS = 300
const MIN_SIGNUPS = 10

function hoursUntil(dateStr: string) {
  return Math.max(0, Math.round((new Date(dateStr).getTime() - Date.now()) / 36e5))
}

// ─── CopyButton ───────────────────────────────────────────────────────────────
function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className={`text-xs px-3 py-1.5 rounded-lg border transition-all font-medium shrink-0 ${
        copied
          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
          : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white'
      }`}
    >
      {copied ? 'Copied!' : label}
    </button>
  )
}

// ─── Signal bar ───────────────────────────────────────────────────────────────
function SignalBar({ value, max, label, color }: { value: number; max: number; label: string; color: string }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-zinc-500">{label}</span>
        <span className="text-white font-medium">{value} <span className="text-zinc-600">/ {max}</span></span>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ProductPage() {
  const params = useParams()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [activating, setActivating] = useState<string | null>(null)
  const [deciding, setDeciding] = useState<string | null>(null)
  const [trackingTab, setTrackingTab] = useState<'link' | 'snippet'>('link')
  const [sprintResult, setSprintResult] = useState({ replies: 0, paidInterest: 0, objections: '', notes: '' })
  const [sprintEvidenceOpen, setSprintEvidenceOpen] = useState(false)
  const [savingEvidence, setSavingEvidence] = useState(false)

  const fetchProduct = async () => {
    const res = await fetch(`/api/products/${params.id}`)
    setProduct(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetchProduct() }, [params.id])

  const activate = async (expId: string) => {
    setActivating(expId)
    await fetch(`/api/experiments/${expId}/activate`, { method: 'POST' })
    setActivating(null); fetchProduct()
  }

  const saveSprintEvidence = async (experimentId: string) => {
    setSavingEvidence(true)
    await fetch(`/api/experiments/${experimentId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sprintResult }) })
    setSavingEvidence(false)
  }

  const triggerDecision = async (experimentId: string, isSprint = false) => {
    setDeciding(experimentId)
    if (isSprint && (sprintResult.replies > 0 || sprintResult.paidInterest > 0 || sprintResult.objections || sprintResult.notes)) {
      await saveSprintEvidence(experimentId)
    }
    await fetch('/api/decisions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ experimentId }) })
    setDeciding(null); fetchProduct()
  }

  if (loading) return (
    <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
    </div>
  )

  if (!product) return (
    <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
      <p className="text-zinc-500 text-sm">Product not found</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#09090B] text-white" style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>

      {/* Header */}
      <div className="border-b border-zinc-800 px-6 py-4 flex items-center gap-4">
        <a href="/dashboard" className="text-zinc-600 hover:text-zinc-400 text-sm transition-colors">← Back</a>
        <div className="w-px h-4 bg-zinc-800" />
        <span className="font-semibold text-white">{product.name}</span>
        <span className="text-xs text-zinc-600">{product.targetUser}</span>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-5">

        {product.experiments.length === 0 && (
          <div className="border border-dashed border-zinc-800 rounded-2xl p-16 text-center">
            <p className="text-zinc-600 text-sm">No experiments yet.</p>
            <p className="text-zinc-700 text-xs mt-1">Go back to dashboard → Generate experiments.</p>
          </div>
        )}

        {product.experiments.map(exp => {
          const expEvents = product.events?.filter(e => (e as any).experimentId === exp.id) ?? []
          const clicks    = expEvents.filter(e => e.type === 'CLICK').length
          const pageViews = expEvents.filter(e => e.type === 'PAGE_VIEW').length
          const signups   = expEvents.filter(e => e.type === 'SIGNUP').length
          const revenue   = expEvents.filter(e => e.type === 'PURCHASE').reduce((s, e) => s + e.value, 0)
          const convRate  = pageViews > 0 ? ((signups / pageViews) * 100).toFixed(1) : '0.0'
          const trackingUrl = exp.trackingId ? `${BASE_URL}/api/track/${exp.trackingId}` : null
          const snippetCode = `<script src="${BASE_URL}/api/g.js"\n  data-key="${product.apiKey}"\n  data-experiment="${exp.trackingId || ''}"></script>`

          // ── SPRINT VIEW ─────────────────────────────────────────────────────
          if (exp.mode === 'SPRINT' || exp.metadata?.mode === 'SPRINT') {
            const plan       = exp.metadata?.sprintPlan
            const hypothesis = exp.metadata?.hypothesis || exp.headline
            const sprintType = exp.metadata?.sprintType || ''
            const windowClosed = exp.reviewDueAt != null && new Date(exp.reviewDueAt) <= new Date()
            const hoursLeft  = exp.reviewDueAt && !windowClosed ? hoursUntil(exp.reviewDueAt) : 0
            const isRunning  = exp.status === 'RUNNING' || exp.status === 'ACTIVE'
            const isDecided  = ['KILLED', 'SCALED'].includes(exp.status)
            const hasData    = clicks > 0 || signups > 0 || pageViews > 0
            const canDecide  = isRunning && (windowClosed || clicks >= 3 || signups >= 1)
            const scriptWithLink = plan?.script?.replace('{trackingLink}', trackingUrl || '[tracking link]') ?? ''

            // Sprint UX state
            const sprintUXState: ExpUXState = isDecided ? 'decided'
              : !isRunning ? 'pending'
              : !hasData ? 'no_data'
              : canDecide ? 'ready'
              : 'collecting'

            return (
              <div key={exp.id} className="bg-zinc-900 border border-amber-500/20 rounded-2xl overflow-hidden">

                {/* Sprint status bar */}
                <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded px-2 py-0.5">⚡ SPRINT</span>
                    {!isDecided && !windowClosed && isRunning && (
                      <span className="text-xs text-emerald-400">{hoursLeft}h left</span>
                    )}
                    {windowClosed && !isDecided && (
                      <span className="text-xs text-amber-400 font-medium">Window closed</span>
                    )}
                    {isDecided && (
                      <span className={`text-xs font-medium ${exp.status === 'SCALED' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {exp.status === 'SCALED' ? 'Scaled ↑' : 'Stopped'}
                      </span>
                    )}
                  </div>
                  {isRunning && (
                    <button
                      onClick={() => triggerDecision(exp.id, true)}
                      disabled={deciding === exp.id || !canDecide}
                      className={`text-xs font-semibold px-4 py-2 rounded-lg border transition-all ${
                        deciding === exp.id ? 'opacity-50 cursor-not-allowed bg-zinc-800 border-zinc-700 text-zinc-500'
                        : canDecide ? 'bg-white text-black border-white hover:bg-zinc-100'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-500 cursor-not-allowed'
                      }`}
                    >
                      {deciding === exp.id ? 'Deciding...' : canDecide ? 'Get verdict' : 'Not enough signal yet'}
                    </button>
                  )}
                </div>

                <div className="p-6 space-y-5">
                  {/* Hypothesis */}
                  <div>
                    <div className="text-xs text-zinc-600 uppercase tracking-widest mb-2">Hypothesis</div>
                    <div className="text-base font-semibold text-white leading-snug">{hypothesis}</div>
                    {sprintType && <div className="text-xs text-zinc-500 mt-1">Sprint type: {sprintType.toLowerCase().replace('_', ' ')}</div>}
                  </div>

                  {/* Status block */}
                  {!isDecided && (
                    <div className={`rounded-xl border px-4 py-3 ${
                      sprintUXState === 'no_data' ? 'bg-zinc-800/50 border-zinc-700'
                      : sprintUXState === 'ready' ? 'bg-white/5 border-white/20'
                      : 'bg-amber-500/5 border-amber-500/20'
                    }`}>
                      <div className={`text-sm font-medium mb-0.5 ${
                        sprintUXState === 'no_data' ? 'text-zinc-400'
                        : sprintUXState === 'ready' ? 'text-white'
                        : 'text-amber-300'
                      }`}>
                        {sprintUXState === 'no_data' ? 'Tracking not started'
                          : sprintUXState === 'collecting' ? 'Collecting signal'
                          : sprintUXState === 'ready' ? 'Enough signal — verdict ready'
                          : 'Early verdict available'}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {sprintUXState === 'no_data' ? 'Share the tracking link to start measuring responses.'
                          : sprintUXState === 'collecting' ? `${clicks} clicks, ${signups} signups so far. Keep sharing.`
                          : sprintUXState === 'ready' ? 'Growva has enough signal to give a reliable recommendation.'
                          : 'Window closed. Signal is weak — verdict may be less reliable.'}
                      </div>
                    </div>
                  )}

                  {/* Sprint plan */}
                  {plan && (
                    <div className="space-y-3">
                      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
                        <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-2">Your action</div>
                        <div className="text-sm text-zinc-200 leading-relaxed">{plan.action}</div>
                      </div>

                      {scriptWithLink && (
                        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="text-[10px] text-zinc-600 uppercase tracking-widest">Script — copy and use</div>
                            <CopyButton text={scriptWithLink} />
                          </div>
                          <pre className="text-sm text-indigo-300 leading-relaxed whitespace-pre-wrap break-words font-mono">{scriptWithLink}</pre>
                        </div>
                      )}

                      {trackingUrl && (
                        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-[10px] text-zinc-600 uppercase tracking-widest">Tracking link</div>
                            <CopyButton text={trackingUrl} label="Copy link" />
                          </div>
                          <code className="text-sm text-emerald-400 break-all">{trackingUrl}</code>
                          <div className="text-xs text-zinc-600 mt-2">Every click is measured. Share this in DMs, posts, or emails.</div>
                        </div>
                      )}

                      {/* Thresholds */}
                      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                        <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-3">Signal thresholds</div>
                        <div className="space-y-2">
                          {[
                            { label: 'Scale →', color: 'text-emerald-400', threshold: plan.successThreshold },
                            { label: 'Continue →', color: 'text-amber-400', threshold: plan.weakThreshold },
                            { label: 'Stop →', color: 'text-red-400', threshold: plan.killSignal },
                          ].map(t => (
                            <div key={t.label} className="flex gap-3 text-xs">
                              <span className={`font-bold w-16 shrink-0 ${t.color}`}>{t.label}</span>
                              <span className="text-zinc-500 leading-relaxed">{t.threshold}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Live signals */}
                  <div className="flex gap-5 text-xs pt-3 border-t border-zinc-800">
                    <span className="text-zinc-500">Clicks: <span className="text-emerald-400 font-semibold">{clicks}</span></span>
                    <span className="text-zinc-500">Views: <span className="text-white">{pageViews}</span></span>
                    <span className="text-zinc-500">Signups: <span className="text-emerald-400">{signups}</span></span>
                    {revenue > 0 && <span className="text-zinc-500">Revenue: <span className="text-emerald-400">${revenue.toFixed(0)}</span></span>}
                    {!clicks && !signups && !pageViews && (
                      <span className="text-zinc-600 italic">No signal yet — share the tracking link to start</span>
                    )}
                  </div>

                  {/* Manual evidence */}
                  {isRunning && (
                    <div>
                      <button
                        onClick={() => setSprintEvidenceOpen(!sprintEvidenceOpen)}
                        className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors flex items-center gap-1.5"
                      >
                        <span>{sprintEvidenceOpen ? '▾' : '▸'}</span>
                        Can't track everything automatically? Log evidence manually
                      </button>
                      {sprintEvidenceOpen && (
                        <div className="mt-3 bg-zinc-800 border border-zinc-700 rounded-xl p-4 space-y-3">
                          <div className="text-[10px] text-zinc-600 uppercase tracking-widest">Manual evidence</div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <div className="text-xs text-zinc-500 mb-1.5">Replies received</div>
                              <input type="number" min={0} value={sprintResult.replies}
                                onChange={e => setSprintResult({ ...sprintResult, replies: parseInt(e.target.value) || 0 })}
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/10" />
                            </div>
                            <div>
                              <div className="text-xs text-zinc-500 mb-1.5">Paid interest</div>
                              <input type="number" min={0} value={sprintResult.paidInterest}
                                onChange={e => setSprintResult({ ...sprintResult, paidInterest: parseInt(e.target.value) || 0 })}
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/10" />
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-zinc-500 mb-1.5">Most common objection</div>
                            <input value={sprintResult.objections}
                              onChange={e => setSprintResult({ ...sprintResult, objections: e.target.value })}
                              placeholder="e.g. Price too high, already have a solution"
                              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/10" />
                          </div>
                          <div>
                            <div className="text-xs text-zinc-500 mb-1.5">Notes</div>
                            <textarea value={sprintResult.notes}
                              onChange={e => setSprintResult({ ...sprintResult, notes: e.target.value })}
                              placeholder="Reactions, quotes, surprises"
                              rows={2}
                              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/10 resize-none" />
                          </div>
                          <button onClick={() => saveSprintEvidence(exp.id)} disabled={savingEvidence}
                            className="text-xs font-medium bg-zinc-700 text-white px-4 py-2 rounded-lg hover:bg-zinc-600 transition-all disabled:opacity-50">
                            {savingEvidence ? 'Saving...' : 'Save evidence'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          }
          // ── END SPRINT VIEW ─────────────────────────────────────────────────

          // ── TRAFFIC MODE — Experiment Command Center ────────────────────────
          const uxState = getExpUXState(exp, clicks, pageViews, signups)
          const isRunning = exp.status === 'RUNNING' || exp.status === 'ACTIVE'
          const isPending = exp.status === 'PENDING'
          const hoursLeft = exp.reviewDueAt && uxState !== 'decided' ? hoursUntil(exp.reviewDueAt) : 0

          // Status config
          const statusConfig = {
            pending:    { title: 'Ready to activate', dot: 'bg-indigo-400', titleColor: 'text-indigo-300', bannerBg: 'bg-indigo-500/10 border-indigo-500/20' },
            no_data:    { title: 'Tracking not started', dot: 'bg-zinc-500', titleColor: 'text-zinc-400', bannerBg: 'bg-zinc-800/60 border-zinc-700' },
            collecting: { title: 'Collecting signal', dot: 'bg-emerald-400 animate-pulse', titleColor: 'text-emerald-300', bannerBg: 'bg-emerald-500/10 border-emerald-500/20' },
            ready:      { title: 'Enough signal — decision ready', dot: 'bg-white', titleColor: 'text-white', bannerBg: 'bg-white/5 border-white/20' },
            early:      { title: 'Early verdict available', dot: 'bg-amber-400', titleColor: 'text-amber-300', bannerBg: 'bg-amber-500/10 border-amber-500/20' },
            decided:    { title: exp.status === 'SCALED' ? 'Experiment scaled ↑' : exp.status === 'KILLED' ? 'Experiment stopped' : 'Experiment completed', dot: exp.status === 'SCALED' ? 'bg-emerald-400' : 'bg-red-400', titleColor: exp.status === 'SCALED' ? 'text-emerald-300' : 'text-red-300', bannerBg: 'bg-zinc-800/60 border-zinc-700' },
          }[uxState]

          // Status subtitle
          const statusSubtitle = {
            pending: 'Launch this externally, then click below to tell Growva.',
            no_data: 'Share the tracking link or install the snippet on your page.',
            collecting: `${pageViews} views · ${signups} signups so far. ${
              MIN_VIEWS - pageViews > 0 ? `${MIN_VIEWS - pageViews} more views` : `${MIN_SIGNUPS - signups} more signups`
            } to reach the signal threshold.`,
            ready: 'Growva has enough data to make a reliable recommendation.',
            early: `Decision window closed. Only ${pageViews} views and ${signups} signups — signal is weak. Verdict may be less reliable.`,
            decided: '',
          }[uxState]

          return (
            <div key={exp.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">

              {/* Experiment name + type */}
              <div className="px-6 py-4 border-b border-zinc-800">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">
                    {exp.type?.replace('_', ' ') || 'Experiment'}
                  </span>
                </div>
                <div className="text-base font-semibold text-white">{exp.headline}</div>
                {exp.angle && <div className="text-xs text-zinc-500 mt-0.5 italic">{exp.angle}</div>}
              </div>

              <div className="p-6 space-y-5">

                {/* ── 1. Status block ── */}
                <div className={`rounded-xl border px-5 py-4 ${statusConfig.bannerBg}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${statusConfig.dot}`} />
                        <div className={`text-sm font-semibold ${statusConfig.titleColor}`}>{statusConfig.title}</div>
                      </div>
                      {statusSubtitle && <div className="text-xs text-zinc-500 leading-relaxed ml-4">{statusSubtitle}</div>}
                      {isRunning && !['ready', 'early'].includes(uxState) && exp.reviewDueAt && (
                        <div className="text-xs text-zinc-600 ml-4 mt-1">Decision window: {hoursLeft}h remaining</div>
                      )}
                    </div>
                    {/* Timer for collecting state */}
                    {uxState === 'collecting' && hoursLeft > 0 && (
                      <div className="text-right shrink-0">
                        <div className="text-lg font-bold text-white tabular-nums">{hoursLeft}h</div>
                        <div className="text-[10px] text-zinc-600">remaining</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── 2. What to do now ── */}
                {uxState === 'pending' && (
                  <div className="space-y-3">
                    <div className="text-xs text-zinc-600 uppercase tracking-widest">What to do now</div>
                    <div className="text-sm text-zinc-300 leading-relaxed bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3">
                      Launch this experiment externally (run the ad, send the email, post on social), then click below to tell Growva it's live.
                    </div>
                    <button
                      onClick={() => activate(exp.id)}
                      disabled={activating === exp.id}
                      className="text-sm font-semibold bg-indigo-500 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-400 transition-all disabled:opacity-50"
                    >
                      {activating === exp.id ? 'Activating...' : 'I activated this experiment'}
                    </button>
                  </div>
                )}

                {uxState === 'no_data' && (
                  <div className="space-y-3">
                    <div className="text-xs text-zinc-600 uppercase tracking-widest">What to do now</div>
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      Growva needs signals before giving a reliable decision. Share the tracking link in posts, DMs, or emails — or install the site snippet on your page.
                    </p>
                    {trackingUrl && (
                      <div className="flex gap-2">
                        <CopyButton text={trackingUrl} label="Copy tracking link" />
                        <button onClick={() => setTrackingTab('snippet')} className="text-xs px-3 py-1.5 rounded-lg border bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white transition-all">
                          Install snippet
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {uxState === 'collecting' && (
                  <div className="space-y-3">
                    <div className="text-xs text-zinc-600 uppercase tracking-widest">What to do now</div>
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      Keep sharing the tracking link to collect more signal. Growva will decide when you reach 300 visits or 10 signups — or when the window closes.
                    </p>
                    {trackingUrl && (
                      <div className="flex gap-2">
                        <CopyButton text={trackingUrl} label="Copy tracking link" />
                        <button
                          onClick={() => triggerDecision(exp.id)}
                          disabled={deciding === exp.id}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg border bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-all disabled:opacity-50"
                        >
                          {deciding === exp.id ? 'Deciding...' : 'Get early verdict'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {uxState === 'ready' && (
                  <div className="space-y-3">
                    <div className="text-xs text-zinc-600 uppercase tracking-widest">What to do now</div>
                    <p className="text-sm text-zinc-300 leading-relaxed">
                      Growva has enough signal. Get the recommendation — it will tell you to scale, continue, or stop this experiment.
                    </p>
                    <button
                      onClick={() => triggerDecision(exp.id)}
                      disabled={deciding === exp.id}
                      className="text-sm font-semibold bg-white text-black px-5 py-2.5 rounded-lg hover:bg-zinc-100 active:scale-[.99] transition-all disabled:opacity-50"
                    >
                      {deciding === exp.id ? 'Getting verdict...' : 'Get verdict →'}
                    </button>
                  </div>
                )}

                {uxState === 'early' && (
                  <div className="space-y-3">
                    <div className="text-xs text-zinc-600 uppercase tracking-widest">What to do now</div>
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">
                      <p className="text-sm text-amber-300 leading-relaxed">
                        Signal is weak — only {pageViews} views and {signups} signups. An early verdict is available, but it may be less reliable than a full decision.
                      </p>
                    </div>
                    <button
                      onClick={() => triggerDecision(exp.id)}
                      disabled={deciding === exp.id}
                      className="text-sm font-medium bg-amber-500/20 text-amber-300 border border-amber-500/40 px-5 py-2.5 rounded-lg hover:bg-amber-500/30 transition-all disabled:opacity-50"
                    >
                      {deciding === exp.id ? 'Getting verdict...' : 'Get early verdict'}
                    </button>
                  </div>
                )}

                {/* ── 3. Signal progress ── */}
                {isRunning && (
                  <div className="space-y-3">
                    <div className="text-xs text-zinc-600 uppercase tracking-widest">Signal progress</div>
                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-4">
                      <div className="flex gap-6 text-xs">
                        <span className="text-zinc-500">Clicks: <span className="text-emerald-400 font-semibold">{clicks}</span></span>
                        <span className="text-zinc-500">Conv: <span className={parseFloat(convRate) > 3 ? 'text-emerald-400' : parseFloat(convRate) > 1 ? 'text-amber-400' : 'text-zinc-400'}>{convRate}%</span></span>
                        {revenue > 0 && <span className="text-zinc-500">Revenue: <span className="text-emerald-400">${revenue.toFixed(0)}</span></span>}
                      </div>
                      <SignalBar value={pageViews} max={MIN_VIEWS} label="Page views" color="#3b82f6" />
                      <SignalBar value={signups} max={MIN_SIGNUPS} label="Signups" color="#22c55e" />
                      <div className="text-xs text-zinc-700 pt-1">
                        Decision triggers when: {MIN_VIEWS} visits OR {MIN_SIGNUPS} signups OR decision window closes
                      </div>
                    </div>
                  </div>
                )}

                {/* Stats for decided experiments */}
                {uxState === 'decided' && (
                  <div className="flex gap-6 text-xs py-3 border-t border-zinc-800">
                    <span className="text-zinc-500">Views: <span className="text-white">{pageViews}</span></span>
                    <span className="text-zinc-500">Signups: <span className="text-emerald-400">{signups}</span></span>
                    {revenue > 0 && <span className="text-zinc-500">Revenue: <span className="text-emerald-400">${revenue.toFixed(0)}</span></span>}
                    <span className="text-zinc-500">Conv: <span className="text-zinc-400">{convRate}%</span></span>
                  </div>
                )}

                {/* ── 4. Tracking ── */}
                {isRunning && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-zinc-600 uppercase tracking-widest">Tracking</div>
                      <div className="flex gap-1">
                        {(['link', 'snippet'] as const).map(tab => (
                          <button key={tab} onClick={() => setTrackingTab(tab)}
                            className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                              trackingTab === tab
                                ? 'bg-zinc-700 border-zinc-600 text-white'
                                : 'bg-transparent border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                            }`}>
                            {tab === 'link' ? '🔗 Link' : '</> Snippet'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {trackingTab === 'link' && trackingUrl && (
                      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                        <div className="text-xs text-zinc-600 mb-3 leading-relaxed">
                          Use in posts, DMs, emails, X, Reddit, or any campaign. Growva measures clicks and traffic source.
                        </div>
                        <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5">
                          <code className="text-sm text-emerald-400 flex-1 break-all">{trackingUrl}</code>
                          <CopyButton text={trackingUrl} label="Copy" />
                        </div>
                      </div>
                    )}

                    {trackingTab === 'snippet' && (
                      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-4">
                        <div className="text-xs text-zinc-500 leading-relaxed">
                          Install on your page to track views automatically. Call <code className="text-zinc-400">growva.track()</code> for signups and purchases.
                        </div>
                        <div>
                          <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-2">Install</div>
                          <div className="flex items-start gap-3 bg-zinc-900 border border-zinc-700 rounded-lg p-3">
                            <code className="text-xs text-blue-400 flex-1 whitespace-pre font-mono leading-relaxed">{snippetCode}</code>
                            <CopyButton text={snippetCode} />
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-2">Manual events</div>
                          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 space-y-2">
                            {[
                              { label: 'Signup', code: "growva.track('SIGNUP')" },
                              { label: 'Purchase', code: "growva.track('PURCHASE', { amount: 29, currency: 'USD' })" },
                              { label: 'Custom', code: "growva.track('CUSTOM', { name: 'demo_booked' })" },
                            ].map(({ label, code }) => (
                              <div key={label} className="flex items-center gap-3">
                                <code className="text-xs text-violet-400 flex-1 font-mono">{code}</code>
                                <CopyButton text={code} />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── 5. Experiment details (deemphasized) ── */}
                <details className="group">
                  <summary className="text-xs text-zinc-700 hover:text-zinc-500 cursor-pointer transition-colors list-none flex items-center gap-1">
                    <span className="group-open:rotate-90 transition-transform inline-block">▸</span>
                    Experiment details
                  </summary>
                  <div className="mt-3 pl-3 border-l border-zinc-800 flex flex-wrap gap-x-6 gap-y-2 text-xs">
                    {exp.type && (
                      <span className="text-zinc-600">Experiment type: <span className="text-zinc-400">{exp.type.replace(/_/g, ' ')}</span></span>
                    )}
                    {product.targetUser && (
                      <span className="text-zinc-600">Target audience: <span className="text-zinc-400">{product.targetUser}</span></span>
                    )}
                    {exp.expectedKpi && (
                      <span className="text-zinc-600">Primary signal: <span className="text-zinc-400">{exp.expectedKpi}</span></span>
                    )}
                    {exp.reviewDueAt && (
                      <span className="text-zinc-600">Decision window: <span className="text-zinc-400">{new Date(exp.reviewDueAt).toLocaleDateString()}</span></span>
                    )}
                    {exp.distributionChannel && (
                      <span className="text-zinc-600">Tracking method: <span className="text-zinc-400">{exp.distributionChannel}</span></span>
                    )}
                    {exp.startedAt && (
                      <span className="text-zinc-600">Created: <span className="text-zinc-400">{new Date(exp.startedAt).toLocaleDateString()}</span></span>
                    )}
                  </div>
                </details>

              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
