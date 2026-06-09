// ─────────────────────────────────────────────────────────────────────────────
// decide.ts — Growva 6-part Decision Engine (deterministic, rules + data only)
//
// SCOPE (locked): no AI, no network, no brain.ts, no decision-v2, no monopoly.
// Real signals only. Rules and data decide the verdict, diagnosis, and confidence.
// Text is templated deterministically — no model call.
//
// Output is a 6-part founder decision:
//   1. verdict        STOP / CONTINUE / SCALE
//   2. why            the direct numeric reason
//   3. confidence     LOW / MEDIUM / HIGH  (from sample size, not a fake AI number)
//   4. diagnosis      one of the fixed buckets below
//   5. nextAction     one clear step to take now
//   6. nextExperiment one suggested test, derived from the diagnosis
// ─────────────────────────────────────────────────────────────────────────────

export type Verdict = 'STOP' | 'CONTINUE' | 'SCALE'
export type Confidence = 'LOW' | 'MEDIUM' | 'HIGH'
export type Diagnosis =
  | 'no_traffic'
  | 'weak_traffic'
  | 'weak_conversion'
  | 'weak_offer'
  | 'wrong_audience'
  | 'tracking_issue'
  | 'promising_under_sampled'
  | 'validated'

// DecisionAction enum in the DB. We only ever emit these three from decide().
export type DecisionActionOut = 'KILL' | 'CONTINUE' | 'SCALE'

export interface DecideInput {
  pageViews: number
  clicks: number
  signups: number
  purchases: number
  revenue: number
  goal?: string | null
  windowClosed: boolean
}

export interface DecisionV6 {
  verdict: Verdict
  why: string
  confidence: Confidence
  diagnosis: Diagnosis
  nextAction: string
  nextExperiment: string
  signals: {
    pageViews: number
    clicks: number
    signups: number
    purchases: number
    conversionRate: number // primary conversions / pageViews (0..1)
    clickThroughRate: number // clicks / pageViews (0..1)
    primaryMetric: 'purchases' | 'signups'
  }
  // Derived fields for the existing Decision row (kept in sync with the verdict):
  action: DecisionActionOut
  confidenceScore: number // for the legacy `confidence` Float column
}

// ─── Thresholds (transparent, shown to the founder) ─────────────────────────────
export const MIN_VIEWS = 300
export const MIN_SIGNUPS = 10
const VIABLE_RATE = 0.03 // 3% — viable conversion
const STRONG_RATE = 0.05 // 5% — strong, scale-worthy
const LOW_CTR = 0.02 // 2% — below this, people aren't even clicking
const MIN_TRAFFIC_FLOOR = 100 // window closed under this = traffic never arrived

const pct = (x: number) => `${(x * 100).toFixed(1)}%`

function isPurchaseGoal(goal?: string | null): boolean {
  return /revenue|purchase|sale|pay|buy/i.test(goal ?? '')
}

function computeConfidence(
  pageViews: number,
  primary: number,
  purchases: number,
): Confidence {
  if (pageViews >= MIN_VIEWS || primary >= MIN_SIGNUPS || purchases >= 3) return 'HIGH'
  if (pageViews >= 100 || primary >= 5) return 'MEDIUM'
  return 'LOW'
}

const ACTION_BY_VERDICT: Record<Verdict, DecisionActionOut> = {
  STOP: 'KILL',
  CONTINUE: 'CONTINUE',
  SCALE: 'SCALE',
}
const SCORE_BY_CONFIDENCE: Record<Confidence, number> = {
  HIGH: 0.85,
  MEDIUM: 0.55,
  LOW: 0.3,
}

// ─── The decision ───────────────────────────────────────────────────────────────
export function decide(input: DecideInput): DecisionV6 {
  const pageViews = Math.max(0, input.pageViews | 0)
  const clicks = Math.max(0, input.clicks | 0)
  const signups = Math.max(0, input.signups | 0)
  const purchases = Math.max(0, input.purchases | 0)
  const windowClosed = !!input.windowClosed
  const purchaseGoal = isPurchaseGoal(input.goal)

  const primaryMetric: 'purchases' | 'signups' = purchaseGoal ? 'purchases' : 'signups'
  const primary = purchaseGoal ? purchases : signups

  const conversionRate = pageViews > 0 ? primary / pageViews : 0
  const ctr = pageViews > 0 ? clicks / pageViews : 0
  const unit = purchaseGoal ? 'purchases' : 'signups'

  const sampleReached = pageViews >= MIN_VIEWS || primary >= MIN_SIGNUPS
  const belowThreshold = !sampleReached

  let verdict: Verdict
  let diagnosis: Diagnosis
  let why: string
  let nextAction: string
  let nextExperiment: string

  // R1 — tracking issue: an impossible funnel (downstream exceeds upstream)
  if (signups > pageViews || clicks > pageViews) {
    verdict = 'CONTINUE'
    diagnosis = 'tracking_issue'
    why = `Your numbers don't add up: ${signups} signups and ${clicks} clicks against only ${pageViews} views. Tracking is likely misconfigured.`
    nextAction = `Check your tracking setup — confirm a PAGE_VIEW fires before a click or signup. Re-run once views register correctly.`
    nextExperiment = `Re-launch the same experiment after verifying the snippet/link — no new idea needed yet.`
  }
  // R2 — no traffic at all
  else if (pageViews === 0 && clicks === 0 && signups === 0 && purchases === 0) {
    verdict = 'CONTINUE'
    diagnosis = 'no_traffic'
    why = `No traffic reached this experiment yet — 0 views, 0 clicks, 0 ${unit}. There's nothing to judge.`
    nextAction = `Drive traffic first: share the tracking link in 3–5 relevant places, or install the snippet on a live page.`
    nextExperiment = `Run one small community/paid push (e.g. a Reddit or X post + 10 DMs) purely to generate the first 100+ views.`
  }
  // R3 — some signal, below threshold, window still open: too early
  else if (belowThreshold && !windowClosed) {
    verdict = 'CONTINUE'
    diagnosis = 'promising_under_sampled'
    why = `${pageViews} views and ${primary} ${unit} so far — promising, but below the ${MIN_VIEWS}-view / ${MIN_SIGNUPS}-${unit} bar needed for a reliable call.`
    nextAction = `Keep the experiment running and send more traffic until you reach ${MIN_VIEWS} views or ${MIN_SIGNUPS} ${unit}.`
    nextExperiment = `Same experiment, wider distribution — add one more channel to reach the threshold faster.`
  }
  // R4 — enough sample, strong conversion: scale
  else if (sampleReached && conversionRate >= STRONG_RATE) {
    verdict = 'SCALE'
    diagnosis = 'validated'
    why = `${pct(conversionRate)} conversion across ${pageViews} views — above the ${pct(STRONG_RATE)} strong bar. This is working.`
    nextAction = `Scale it: increase budget/reach on this exact angle and channel, and lock the winning copy.`
    nextExperiment = `Test a higher-intent variant (add price or urgency) to see if you can lift conversion further while scaling.`
  }
  // R5 — enough sample, viable conversion: keep going
  else if (sampleReached && conversionRate >= VIABLE_RATE) {
    verdict = 'CONTINUE'
    diagnosis = 'validated'
    why = `${pct(conversionRate)} conversion across ${pageViews} views — viable (above ${pct(VIABLE_RATE)}) but below the ${pct(STRONG_RATE)} scale bar.`
    nextAction = `Keep it live and push more volume — you're close to scale-worthy. Don't change the offer yet.`
    nextExperiment = `A/B the CTA or headline to nudge conversion past ${pct(STRONG_RATE)}.`
  }
  // R6 — window closed with almost no traffic: it never got a fair test
  else if (windowClosed && pageViews < MIN_TRAFFIC_FLOOR) {
    verdict = 'STOP'
    diagnosis = 'weak_traffic'
    why = `The decision window closed with only ${pageViews} views. Not enough traffic ever arrived to test the idea.`
    nextAction = `Stop this run. Before retrying, fix distribution — pick one channel where your audience actually is.`
    nextExperiment = `Single-channel concentration test: one audience, one channel, enough budget to clear ${MIN_VIEWS} views.`
  }
  // R7 — purchase goal: got signups/leads but nobody paid
  else if (purchaseGoal && signups >= MIN_SIGNUPS && purchases === 0) {
    verdict = 'STOP'
    diagnosis = 'weak_conversion'
    why = `${signups} signups but 0 purchases. People show interest but won't pay at this offer.`
    nextAction = `Stop and rework the offer/price. Talk to 3 signups who didn't buy and ask what blocked them.`
    nextExperiment = `Test a lower price point or a stronger guarantee against the same audience.`
  }
  // R8 — enough views, weak conversion, low click-through: wrong people
  else if (pageViews >= MIN_VIEWS && conversionRate < VIABLE_RATE && ctr < LOW_CTR) {
    verdict = 'STOP'
    diagnosis = 'wrong_audience'
    why = `${pageViews} views but only ${pct(ctr)} clicked (${clicks} clicks) and ${pct(conversionRate)} converted. The people seeing this aren't the right audience.`
    nextAction = `Stop this targeting. Redefine who you're reaching before spending more.`
    nextExperiment = `Test the same offer on a different, sharper audience segment.`
  }
  // R9 — enough views, weak conversion, healthy click-through: offer doesn't close
  else if (pageViews >= MIN_VIEWS && conversionRate < VIABLE_RATE && ctr >= LOW_CTR) {
    verdict = 'STOP'
    diagnosis = 'weak_offer'
    why = `${pageViews} views, ${pct(ctr)} clicked, but only ${pct(conversionRate)} converted. They're interested enough to click — the offer isn't closing them.`
    nextAction = `Stop and rewrite the offer. The hook works; the promise, price, or proof doesn't.`
    nextExperiment = `Test a new angle/headline on the same audience — change the promise, keep the traffic source.`
  }
  // Fallback — window closed with modest traffic (100–300) and weak conversion
  else {
    const wrongAudience = ctr < LOW_CTR
    verdict = 'STOP'
    diagnosis = wrongAudience ? 'wrong_audience' : 'weak_offer'
    why = `Window closed with ${pageViews} views, ${pct(ctr)} click-through, and ${pct(conversionRate)} conversion — below the ${pct(VIABLE_RATE)} viable bar.`
    nextAction = wrongAudience
      ? `Stop this targeting. Redefine who you're reaching before spending more.`
      : `Stop and rewrite the offer — the traffic came but didn't convert.`
    nextExperiment = wrongAudience
      ? `Test the same offer on a different, sharper audience segment.`
      : `Test a new angle/headline on the same audience — change the promise, keep the traffic source.`
  }

  const confidence = computeConfidence(pageViews, primary, purchases)

  return {
    verdict,
    why,
    confidence,
    diagnosis,
    nextAction,
    nextExperiment,
    signals: {
      pageViews,
      clicks,
      signups,
      purchases,
      conversionRate,
      clickThroughRate: ctr,
      primaryMetric,
    },
    action: ACTION_BY_VERDICT[verdict],
    confidenceScore: SCORE_BY_CONFIDENCE[confidence],
  }
}
