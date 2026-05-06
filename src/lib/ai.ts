import OpenAI from 'openai'

let _openai: OpenAI | undefined
function getOpenAI(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is required')
  }
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}

export interface ProductInput {
  name: string
  description: string
  price?: number
  targetUser: string
  goal: string
}

export interface ExperimentOutput {
  type: string
  angle: string
  headline: string
  copy: string
  cta: string
  distributionChannel: string
  expectedKpi: string
}

export interface ExperimentResult {
  experimentId: string
  angle: string
  type: string
  channel: string
  pageViews: number
  clicks: number
  signups: number
  revenue: number
  conversionRate: number
}

export interface DecisionOutput {
  action: 'KILL' | 'SCALE' | 'ITERATE' | 'CONTINUE'
  reason: string
  confidence: number
  nextExperiment?: Partial<ExperimentOutput>
}

export interface WinningPatternInput {
  type: string
  angle: string
  channel: string
  conversionRate: number
}

export interface DailyBriefInput {
  products: Array<{
    name: string
    activeExperiments: number
    conversions: number
    revenue: number
    topChannel?: string
    momentum: 'up' | 'down' | 'flat'
    winningPatterns: WinningPatternInput[]
  }>
}

// Generate 3 experiments — context-aware using winning patterns
export async function generateExperiments(
  product: ProductInput,
  pastWinners: WinningPatternInput[] = []
): Promise<ExperimentOutput[]> {
  const winnersContext = pastWinners.length
    ? `\n\nPast winning patterns for this product:\n${pastWinners
        .map(w => `- ${w.type} with "${w.angle}" on ${w.channel}: ${(w.conversionRate * 100).toFixed(1)}% conversion`)
        .join('\n')}\nBuild on what worked. Try new angles on winning channels.`
    : ''

  const prompt = `You are a revenue growth expert. Generate exactly 3 distinct experiments for this product.

Product: ${product.name}
Description: ${product.description}
Price: ${product.price ? `$${product.price}` : 'TBD'}
Target User: ${product.targetUser}
Goal: ${product.goal}${winnersContext}

Return ONLY a valid JSON object: { "experiments": [...] }
Each experiment must have:
- type: one of [LANDING_PAGE, PRICING_TEST, OFFER_TEST, CONTENT_ANGLE, AD_COPY]
- angle: psychological angle (specific, not generic)
- headline: under 10 words, compelling
- copy: 2 sentences max
- cta: under 5 words
- distributionChannel: one of [organic_social, paid_ads, email, seo, referral]
- expectedKpi: one of [signup_rate, click_rate, revenue, retention]

Make each experiment test a different hypothesis. Be specific to this product and audience.`

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.8,
  })

  const parsed = JSON.parse(response.choices[0].message.content || '{}')
  return parsed.experiments || []
}

// Context-aware decision engine
export async function decideExperiment(
  product: ProductInput,
  result: ExperimentResult,
  pastWinners: WinningPatternInput[] = []
): Promise<DecisionOutput> {
  const context = pastWinners.length
    ? `\nHistorical winners: ${pastWinners.map(w => `${w.type}/${w.channel}=${(w.conversionRate*100).toFixed(1)}%`).join(', ')}`
    : ''

  const prompt = `Analyze this growth experiment and decide next action.

Product: ${product.name} targeting ${product.targetUser}
Price point: ${product.price ? `$${product.price}` : 'free/TBD'}

Experiment:
- Type: ${result.type}
- Angle: "${result.angle}"
- Channel: ${result.channel}

Results:
- Page views: ${result.pageViews}
- Clicks: ${result.clicks}
- Signups: ${result.signups}
- Revenue: $${result.revenue.toFixed(0)}
- Conversion rate: ${(result.conversionRate * 100).toFixed(2)}%
${context}

Decision rules:
- CONTINUE: < 30 views (not enough data)
- KILL: < 0.5% conversion AND > 100 views
- SCALE: > 3% conversion OR strong revenue signal
- ITERATE: 0.5-3% conversion (promising but needs refinement)

Return ONLY valid JSON:
{
  "action": "KILL|SCALE|ITERATE|CONTINUE",
  "reason": "one direct sentence",
  "confidence": 0.0-1.0,
  "nextExperiment": { only if ITERATE: new angle/headline suggestion }
}`

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.2,
  })

  return JSON.parse(response.choices[0].message.content || '{}')
}

// Generate AI Daily Brief across all products
export async function generateDailyBrief(input: DailyBriefInput): Promise<{
  content: string
  topFocus: string
  actions: Array<{ product: string; action: string; reason: string; priority: 'high' | 'medium' | 'low' }>
}> {
  const prompt = `You are a growth advisor. Generate a concise daily brief for a founder managing multiple products.

Products status:
${input.products.map(p => `
${p.name}:
- Active experiments: ${p.activeExperiments}
- Conversions today: ${p.conversions}
- Revenue today: $${p.revenue.toFixed(0)}
- Momentum: ${p.momentum}
- Best channel: ${p.topChannel || 'unknown'}
- Winning patterns: ${p.winningPatterns.length ? p.winningPatterns.map(w => `${w.angle} on ${w.channel}`).join(', ') : 'none yet'}
`).join('\n')}

Return ONLY valid JSON:
{
  "content": "2-3 sentence overview of today's growth situation",
  "topFocus": "the ONE product to focus on today and why (1 sentence)",
  "actions": [
    {
      "product": "product name",
      "action": "specific action to take",
      "reason": "why this matters now",
      "priority": "high|medium|low"
    }
  ]
}

Be direct. Be specific. No fluff. Max 5 actions total.`

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.4,
  })

  return JSON.parse(response.choices[0].message.content || '{}')
}

// Calculate product score
export function calculateProductScore(data: {
  activeExperiments: number
  conversions7d: number
  conversions30d: number
  revenue7d: number
  revenue30d: number
  scaledExperiments: number
  killedExperiments: number
  totalExperiments: number
  winningPatterns: number
  avgConversionRate: number
  daysSinceLastConversion: number
}): {
  momentum: number
  conversionHealth: number
  revenueVelocity: number
  growthChance: number
  overall: number
  signal: 'accelerating' | 'steady' | 'slowing' | 'stalled'
  recommendation: string
} {
  // Momentum: are experiments running + growing?
  const expActivity = Math.min(40, data.activeExperiments * 10)
  const scaledBonus = Math.min(40, data.scaledExperiments * 20)
  const recentActivity = data.daysSinceLastConversion < 3 ? 20 : data.daysSinceLastConversion < 7 ? 10 : 0
  const momentum = Math.min(100, expActivity + scaledBonus + recentActivity)

  // Conversion Health: quality of experiments
  const winRate = data.totalExperiments > 0 ? data.scaledExperiments / data.totalExperiments : 0
  const avgConvBonus = Math.min(40, data.avgConversionRate * 1000)
  const patternBonus = Math.min(30, data.winningPatterns * 10)
  const conversionHealth = Math.min(100, Math.round(winRate * 100 * 2) + avgConvBonus + patternBonus)

  // Revenue Velocity: is revenue growing week over week?
  const revenueBase = Math.min(50, (data.revenue7d / 500) * 50)
  const revGrowth = data.revenue30d > 0
    ? Math.min(50, ((data.revenue7d * 4 - data.revenue30d) / Math.max(data.revenue30d, 1)) * 50)
    : 0
  const revenueVelocity = Math.min(100, Math.round(revenueBase + revGrowth))

  // Growth Chance: probability of meaningful growth in next 7 days
  const convMomentum = Math.min(40, data.conversions7d * 4)
  const experimentPipeline = Math.min(30, data.activeExperiments * 8)
  const patternLearning = Math.min(30, data.winningPatterns * 8)
  const growthChance = Math.min(100, convMomentum + experimentPipeline + patternLearning)

  const overall = Math.round((momentum * 0.25) + (conversionHealth * 0.3) + (revenueVelocity * 0.25) + (growthChance * 0.2))

  // Signal detection
  const weeklyGrowth = data.revenue30d > 0 ? (data.revenue7d * 4) / data.revenue30d : 1
  const signal: 'accelerating' | 'steady' | 'slowing' | 'stalled' =
    weeklyGrowth > 1.2 ? 'accelerating' :
    weeklyGrowth > 0.9 ? 'steady' :
    data.activeExperiments > 0 ? 'slowing' : 'stalled'

  // Recommendation
  let recommendation = ''
  if (signal === 'stalled') recommendation = 'No active experiments. Start growth mode immediately.'
  else if (signal === 'slowing') recommendation = 'Revenue declining. Kill weak experiments and test new angles.'
  else if (data.winningPatterns === 0) recommendation = 'Running experiments but no winners yet. Increase traffic volume.'
  else if (data.activeExperiments < 2) recommendation = 'Not enough experiments running. Launch 2-3 more.'
  else recommendation = 'On track. Focus on scaling winners.'

  return {
    momentum: Math.round(momentum),
    conversionHealth: Math.round(conversionHealth),
    revenueVelocity: Math.round(revenueVelocity),
    growthChance: Math.round(growthChance),
    overall,
    signal,
    recommendation,
  }
}

export async function generateDailySummary(
  productName: string,
  stats: {
    activeExperiments: number
    totalConversions: number
    totalRevenue: number
    decisions: Array<{ action: string; reason: string }>
  }
): Promise<string> {
  const prompt = `Write a 2-sentence daily growth summary for "${productName}".
Stats: ${stats.activeExperiments} active experiments, ${stats.totalConversions} conversions, $${stats.totalRevenue} revenue.
Decisions: ${stats.decisions.map(d => `${d.action}`).join(', ') || 'none'}
Be direct. No fluff.`

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.4,
    max_tokens: 100,
  })

  return response.choices[0].message.content || ''
}

// ─── PHASE 3: EXECUTION LAYER ────────────────────────────────────────────────

export interface ExecutionAssets {
  landingPage: {
    headline: string
    subheadline: string
    bodySection1: string
    bodySection2: string
    cta: string
    socialProof: string
    urgencyLine: string
    htmlTemplate: string
  }
  ads: Array<{
    platform: string
    headline: string
    body: string
    cta: string
    hook: string
  }>
  hooks: string[]
  campaignKit: {
    emailSubject: string
    emailBody: string
    tweetThread: string[]
    linkedinPost: string
    whatsappMessage: string
  }
}

export async function generateExecutionAssets(
  product: ProductInput,
  experiment: {
    type: string
    angle: string
    headline: string
    copy: string
    cta: string
    channel: string
  }
): Promise<ExecutionAssets> {
  const prompt = `You are a conversion copywriter. Generate complete execution assets for this growth experiment.

Product: ${product.name}
Description: ${product.description}
Price: ${product.price ? `$${product.price}` : 'Free/TBD'}
Target User: ${product.targetUser}

Experiment:
- Type: ${experiment.type}
- Angle: "${experiment.angle}"
- Core headline: "${experiment.headline}"
- Core copy: "${experiment.copy}"
- CTA: "${experiment.cta}"
- Primary channel: ${experiment.channel}

Return ONLY valid JSON with this exact structure:
{
  "landingPage": {
    "headline": "main headline (under 8 words, powerful)",
    "subheadline": "supporting line (1 sentence, benefit-focused)",
    "bodySection1": "problem section (2-3 sentences)",
    "bodySection2": "solution section (2-3 sentences)",
    "cta": "button text (under 5 words)",
    "socialProof": "one social proof line",
    "urgencyLine": "urgency/scarcity line",
    "htmlTemplate": "complete minimal HTML landing page (inline CSS, no external deps, mobile-friendly, dark theme)"
  },
  "ads": [
    { "platform": "Meta", "headline": "...", "body": "2-3 sentences", "cta": "...", "hook": "first line that stops scroll" },
    { "platform": "Google", "headline": "...", "body": "...", "cta": "...", "hook": "..." },
    { "platform": "Twitter/X", "headline": "...", "body": "...", "cta": "...", "hook": "..." }
  ],
  "hooks": ["hook1", "hook2", "hook3", "hook4", "hook5"],
  "campaignKit": {
    "emailSubject": "subject line",
    "emailBody": "short cold email (5-6 sentences max)",
    "tweetThread": ["tweet1", "tweet2", "tweet3"],
    "linkedinPost": "linkedin post (3-4 short paragraphs)",
    "whatsappMessage": "short whatsapp message (2-3 sentences, arabic-friendly tone)"
  }
}

Be specific to this product and audience. No generic copy.`

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.7,
    max_tokens: 3000,
  })

  return JSON.parse(response.choices[0].message.content || '{}')
}
