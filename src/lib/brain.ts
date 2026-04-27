import OpenAI from 'openai'
import { prisma } from '@/lib/db'
import { detectCategory } from '@/lib/templates'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'placeholder' })

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface BrainInsight {
  topAngles: Array<{ angle: string; channel: string; avgConv: number; confidence: number }>
  weakChannels: string[]
  marketTiming: string[]
  crossProductWins: Array<{ insight: string; confidence: number }>
  recommendation: string
}

export interface ProductLearnings {
  bestChannel: string | null
  bestAngle: string | null
  avgConversionRate: number
  totalExperiments: number
  totalWins: number
  winRate: number
  priceInsight: string | null
  audienceInsight: string | null
  lastUpdated: string
}

// ─── MARKET CONTEXT (SAUDI/MENA) ─────────────────────────────────────────────

export const SAUDI_MARKET_CONTEXT = [
  { month: 3, contextType: 'seasonal', insight: 'Ramadan: engagement spikes 40% but purchase decisions slow. Focus on awareness experiments, not conversion.', impact: 'high' },
  { month: 4, contextType: 'seasonal', insight: 'Post-Ramadan Eid: highest purchase intent of the year. Launch best offers now.', impact: 'high' },
  { month: 6, contextType: 'behavioral', insight: 'Summer school holidays: B2C spikes, B2B slows. Adjust targeting.', impact: 'medium' },
  { month: 9, contextType: 'behavioral', insight: 'Back to work season: B2B buying picks up. Good time for pricing tests.', impact: 'medium' },
  { month: 11, contextType: 'seasonal', insight: 'Saudi National Day (Sep 23): strong patriotic buying signal. Use local trust angles.', impact: 'high' },
  { contextType: 'channel_performance', insight: 'WhatsApp converts 2.3x better than email in Saudi B2B. Always test WhatsApp CTA.', impact: 'high', month: 0 },
  { contextType: 'channel_performance', insight: 'Arabic copy outperforms English for Saudi audience by 35% on average.', impact: 'high', month: 0 },
  { contextType: 'channel_performance', insight: 'Snapchat > Instagram for Saudi B2C under 35. TikTok growing fast.', impact: 'medium', month: 0 },
  { contextType: 'behavioral', insight: 'Price anchoring in SAR (not USD) increases conversion by ~18% for Saudi audience.', impact: 'medium', month: 0 },
  { contextType: 'behavioral', insight: 'Social proof with Saudi brand names or logos converts better than generic testimonials.', impact: 'high', month: 0 },
]

// ─── SEED MARKET CONTEXT ─────────────────────────────────────────────────────

export async function seedMarketContext() {
  for (const ctx of SAUDI_MARKET_CONTEXT) {
    await prisma.marketContext.upsert({
      where: {
        id: `saudi-${ctx.contextType}-${ctx.month}-${ctx.insight.slice(0, 20).replace(/\s/g, '-')}`,
      },
      update: {},
      create: {
        id: `saudi-${ctx.contextType}-${ctx.month}-${ctx.insight.slice(0, 20).replace(/\s/g, '-')}`,
        market: 'saudi',
        month: ctx.month,
        contextType: ctx.contextType,
        insight: ctx.insight,
        impact: ctx.impact,
        active: true,
      },
    }).catch(() => {})
  }
}

// ─── UPDATE COLLECTIVE PATTERN ────────────────────────────────────────────────

export async function updateCollectivePattern(data: {
  productDescription: string
  targetUser: string
  experimentType: string
  angle: string
  channel: string
  market: string
  conversionRate: number
}) {
  const category = detectCategory(data.productDescription, data.targetUser)

  const existing = await prisma.collectivePattern.findUnique({
    where: {
      productCategory_experimentType_angle_channel_market: {
        productCategory: category,
        experimentType: data.experimentType,
        angle: data.angle.slice(0, 100),
        channel: data.channel,
        market: data.market,
      },
    },
  })

  if (existing) {
    // Rolling average
    const newAvg = (existing.avgConversionRate * existing.sampleSize + data.conversionRate) / (existing.sampleSize + 1)
    const newSample = existing.sampleSize + 1
    const confidence = Math.min(0.99, 0.5 + (newSample / 50) * 0.49)

    await prisma.collectivePattern.update({
      where: { id: existing.id },
      data: { avgConversionRate: newAvg, sampleSize: newSample, confidenceScore: confidence },
    })
  } else {
    await prisma.collectivePattern.create({
      data: {
        productCategory: category,
        experimentType: data.experimentType,
        angle: data.angle.slice(0, 100),
        channel: data.channel,
        market: data.market,
        avgConversionRate: data.conversionRate,
        sampleSize: 1,
        confidenceScore: 0.5,
      },
    }).catch(() => {})
  }
}

// ─── GET BRAIN INSIGHTS FOR A PRODUCT ────────────────────────────────────────

export async function getBrainInsights(product: {
  id: string
  name: string
  description: string
  targetUser: string
  price?: number | null
}): Promise<BrainInsight> {
  const category = detectCategory(product.description, product.targetUser)
  const currentMonth = new Date().getMonth() + 1
  const isSaudiMarket = /saudi|سعود|ksa|riyadh/i.test(product.description + product.targetUser)

  // Get collective patterns for this category
  const collectivePatterns = await prisma.collectivePattern.findMany({
    where: { productCategory: category },
    orderBy: { avgConversionRate: 'desc' },
    take: 10,
  })

  // Get market context
  const marketContext = await prisma.marketContext.findMany({
    where: {
      active: true,
      market: isSaudiMarket ? 'saudi' : 'global',
      OR: [{ month: currentMonth }, { month: 0 }],
    },
    orderBy: { impact: 'desc' },
    take: 5,
  })

  // Get cross-product signals for this product
  const crossSignals = await prisma.crossProductSignal.findMany({
    where: { targetProductId: product.id, applied: false },
    orderBy: { confidence: 'desc' },
    take: 5,
  })

  // Get product's own brain memory
  const memory = await prisma.brainMemory.findUnique({
    where: { productId: product.id },
  })

  const topAngles = collectivePatterns
    .filter(p => p.sampleSize >= 3)
    .map(p => ({
      angle: p.angle,
      channel: p.channel,
      avgConv: Math.round(p.avgConversionRate * 1000) / 10,
      confidence: Math.round(p.confidenceScore * 100),
    }))

  const weakChannels = collectivePatterns
    .filter(p => p.avgConversionRate < 0.01 && p.sampleSize >= 5)
    .map(p => p.channel)
    .filter((v, i, a) => a.indexOf(v) === i)

  const marketTiming = marketContext
    .filter(m => m.impact === 'high')
    .map(m => m.insight)

  const crossProductWins = crossSignals.map(s => ({
    insight: s.insight,
    confidence: Math.round(s.confidence * 100),
  }))

  const recommendation = buildRecommendation({
    topAngles,
    weakChannels,
    marketTiming,
    crossProductWins,
    memory: memory?.learnings as any,
    isSaudiMarket,
  })

  return { topAngles, weakChannels, marketTiming, crossProductWins, recommendation }
}

function buildRecommendation(data: any): string {
  if (data.marketTiming.length > 0) return data.marketTiming[0]
  if (data.topAngles.length > 0) {
    const top = data.topAngles[0]
    return `${top.angle} on ${top.channel} averaging ${top.avgConv}% conversion across similar products.`
  }
  if (data.isSaudiMarket) return 'Test WhatsApp-first CTA and Arabic copy — both proven in Saudi market.'
  return 'Run 3 experiments simultaneously to gather signal faster.'
}

// ─── GENERATE EXPERIMENTS WITH BRAIN ─────────────────────────────────────────

export async function generateExperimentsWithBrain(product: {
  id: string
  name: string
  description: string
  targetUser: string
  price?: number | null
  goal: string
}, pastWinners: any[] = []): Promise<any[]> {
  const insights = await getBrainInsights(product)
  const memory = await prisma.brainMemory.findUnique({ where: { productId: product.id } })

  const brainContext = insights.topAngles.length > 0
    ? `\n\nCollective intelligence from similar products:\n${insights.topAngles.slice(0, 3).map(a => `- "${a.angle}" on ${a.channel}: ${a.avgConv}% avg conversion (${a.confidence}% confidence)`).join('\n')}`
    : ''

  const marketContext = insights.marketTiming.length > 0
    ? `\n\nMarket context right now:\n${insights.marketTiming.slice(0, 2).map(t => `- ${t}`).join('\n')}`
    : ''

  const crossContext = insights.crossProductWins.length > 0
    ? `\n\nWhat's working in your other products:\n${insights.crossProductWins.slice(0, 2).map(s => `- ${s.insight} (${s.confidence}% confidence)`).join('\n')}`
    : ''

  const memoryContext = memory?.learnings
    ? `\n\nWhat we know about this product:\n${JSON.stringify(memory.learnings, null, 2).slice(0, 500)}`
    : ''

  const winnersContext = pastWinners.length > 0
    ? `\n\nPast winners for this product:\n${pastWinners.map(w => `- ${w.type} "${w.angle}" on ${w.channel}: ${(w.conversionRate * 100).toFixed(1)}%`).join('\n')}`
    : ''

  const prompt = `You are a revenue growth expert with collective intelligence from thousands of experiments.
Generate exactly 3 HIGH-CONFIDENCE experiments for this product.

Product: ${product.name}
Description: ${product.description}
Price: ${product.price ? `$${product.price}` : 'TBD'}
Target: ${product.targetUser}
Goal: ${product.goal}
${brainContext}${marketContext}${crossContext}${memoryContext}${winnersContext}

Rules:
- Use collective intelligence to inform angle and channel selection
- If market context applies, prioritize it
- Each experiment must test a DIFFERENT hypothesis
- Be specific to this product — no generic copy

Return ONLY valid JSON: { "experiments": [...] }
Each experiment:
- type: LANDING_PAGE | PRICING_TEST | OFFER_TEST | CONTENT_ANGLE | AD_COPY
- angle: specific psychological angle
- headline: under 10 words
- copy: 2 sentences max
- cta: under 5 words
- distributionChannel: organic_social | paid_ads | email | seo | referral
- expectedKpi: signup_rate | click_rate | revenue | retention
- brainReason: why the brain recommends this (1 sentence)`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  })

  const parsed = JSON.parse(response.choices[0].message.content || '{}')
  return parsed.experiments || []
}

// ─── UPDATE BRAIN MEMORY AFTER DECISIONS ─────────────────────────────────────

export async function updateBrainMemory(productId: string) {
  const [product, experiments, patterns] = await Promise.all([
    prisma.product.findUnique({ where: { id: productId } }),
    prisma.experiment.findMany({ where: { productId }, include: { events: true } }),
    prisma.winningPattern.findMany({ where: { productId }, orderBy: { conversionRate: 'desc' }, take: 10 }),
  ])

  if (!product) return

  const wins = experiments.filter(e => e.status === 'SCALED')
  const losses = experiments.filter(e => e.status === 'KILLED')
  const totalExps = experiments.length
  const winRate = totalExps > 0 ? wins.length / totalExps : 0

  const bestChannel = patterns[0]?.channel || null
  const bestAngle = patterns[0]?.angle || null
  const avgConv = patterns.length > 0
    ? patterns.reduce((s, p) => s + p.conversionRate, 0) / patterns.length
    : 0

  // Analyze what copy/angles failed
  const failedAngles = losses.map(e => e.angle)
  const successAngles = wins.map(e => e.angle)

  const learnings: ProductLearnings = {
    bestChannel,
    bestAngle,
    avgConversionRate: Math.round(avgConv * 1000) / 10,
    totalExperiments: totalExps,
    totalWins: wins.length,
    winRate: Math.round(winRate * 100),
    priceInsight: product.price
      ? wins.length > 0
        ? `$${product.price} price point is converting`
        : `$${product.price} price point — no wins yet`
      : null,
    audienceInsight: patterns.length > 0
      ? `${product.targetUser} responds to: ${successAngles.slice(0, 2).join(', ')}`
      : null,
    lastUpdated: new Date().toISOString(),
  }

  // Generate AI summary of learnings
  let lastThought = ''
  if (totalExps >= 3) {
    const thoughtPrompt = `Summarize what we've learned about growing "${product.name}" in 2 sentences.
Wins: ${successAngles.join(', ') || 'none yet'}
Failures: ${failedAngles.join(', ') || 'none yet'}
Best channel: ${bestChannel || 'unknown'}
Win rate: ${Math.round(winRate * 100)}%
Be direct and specific.`

    const res = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: thoughtPrompt }],
      temperature: 0.3,
      max_tokens: 120,
    })
    lastThought = res.choices[0].message.content || ''
  }

  await prisma.brainMemory.upsert({
    where: { productId },
    update: { learnings: learnings as any, lastThought, version: { increment: 1 } },
    create: { productId, learnings: learnings as any, lastThought, version: 1 },
  })

  // Update collective patterns for wins
  for (const win of wins) {
    const winEvents = win.events
    const pageViews = winEvents.filter(e => e.type === 'PAGE_VIEW').length
    const signups = winEvents.filter(e => e.type === 'SIGNUP').length
    const convRate = pageViews > 0 ? signups / pageViews : 0

    if (convRate > 0) {
      await updateCollectivePattern({
        productDescription: product.description,
        targetUser: product.targetUser,
        experimentType: win.type,
        angle: win.angle,
        channel: win.distributionChannel,
        market: /saudi|سعود|ksa/i.test(product.targetUser + product.description) ? 'saudi' : 'global',
        conversionRate: convRate,
      })
    }
  }

  // Generate cross-product signals for other products by same user
  await generateCrossProductSignals(productId, wins, product)
}

// ─── CROSS-PRODUCT SIGNALS ────────────────────────────────────────────────────

async function generateCrossProductSignals(
  sourceProductId: string,
  wins: any[],
  sourceProduct: any
) {
  if (wins.length === 0) return

  // Find other products (in a real system: same user's products)
  const otherProducts = await prisma.product.findMany({
    where: { id: { not: sourceProductId }, isActive: true },
    take: 10,
  })

  for (const target of otherProducts) {
    const sourceCategory = detectCategory(sourceProduct.description, sourceProduct.targetUser)
    const targetCategory = detectCategory(target.description, target.targetUser)

    // Only cross-pollinate similar categories
    if (sourceCategory !== targetCategory) continue

    for (const win of wins.slice(0, 2)) {
      const insight = `${sourceProduct.name} won with "${win.angle}" on ${win.distributionChannel} — test this angle for ${target.name}`

      await prisma.crossProductSignal.create({
        data: {
          sourceProductId,
          targetProductId: target.id,
          signalType: 'winning_angle',
          insight,
          confidence: 0.7,
        },
      }).catch(() => {})
    }
  }
}

// ─── BRAIN API — get full brain status ───────────────────────────────────────

export async function getBrainStatus(productId: string) {
  const [memory, signals, collective] = await Promise.all([
    prisma.brainMemory.findUnique({ where: { productId } }),
    prisma.crossProductSignal.findMany({
      where: { targetProductId: productId },
      orderBy: { confidence: 'desc' },
      take: 5,
    }),
    prisma.collectivePattern.count(),
  ])

  return {
    memory: memory?.learnings || null,
    lastThought: memory?.lastThought || null,
    version: memory?.version || 0,
    pendingSignals: signals.filter(s => !s.applied),
    collectiveDatapoints: collective,
  }
}

// ─── MEMORY INJECTION ─────────────────────────────────────────────────────────
// جيب كل السياق اللازم قبل أي قرار وحقنه في الـ prompt

export async function getDecisionMemory(productId: string, experimentId: string): Promise<string> {
  const [
    lastDecisions,
    winningPatterns,
    brainMemory,
    crossSignals,
    collectivePatterns,
    product,
  ] = await Promise.all([
    // آخر 5 قرارات للمنتج
    prisma.decision.findMany({
      where: { productId },
      include: { experiment: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    // الأنماط الفائزة
    prisma.winningPattern.findMany({
      where: { productId },
      orderBy: { conversionRate: 'desc' },
      take: 5,
    }),
    // الذاكرة الحالية
    prisma.brainMemory.findUnique({ where: { productId } }),
    // إشارات المنتجات الأخرى
    prisma.crossProductSignal.findMany({
      where: { targetProductId: productId, applied: false },
      orderBy: { confidence: 'desc' },
      take: 3,
    }),
    // الأنماط الجماعية
    prisma.collectivePattern.findMany({
      where: { sampleSize: { gte: 3 } },
      orderBy: { avgConversionRate: 'desc' },
      take: 5,
    }),
    prisma.product.findUnique({ where: { id: productId } }),
  ])

  const isSaudi = /saudi|سعود|ksa/i.test(
    (product?.targetUser || '') + (product?.description || '')
  )
  const currentMonth = new Date().getMonth() + 1
  const marketCtx = await prisma.marketContext.findMany({
    where: { active: true, market: isSaudi ? 'saudi' : 'global', OR: [{ month: currentMonth }, { month: 0 }] },
    orderBy: { impact: 'desc' },
    take: 3,
  })

  let memory = ''

  if (lastDecisions.length > 0) {
    memory += `\n## DECISION HISTORY (last ${lastDecisions.length}):\n`
    lastDecisions.forEach(d => {
      memory += `- ${d.action} on "${d.experiment?.angle}" (${d.experiment?.type}) — confidence: ${d.confidence}% — reason: ${d.reason?.slice(0, 80)}\n`
    })
  }

  if (winningPatterns.length > 0) {
    memory += `\n## WINNING PATTERNS for this product:\n`
    winningPatterns.forEach(w => {
      memory += `- "${w.angle}" on ${w.channel}: ${(w.conversionRate * 100).toFixed(1)}% conv — worked ${w.successCount} times\n`
    })
  }

  if (brainMemory?.learnings) {
    const l = brainMemory.learnings as any
    memory += `\n## BRAIN MEMORY (v${brainMemory.version}):\n`
    if (l.bestAngle) memory += `- Best angle so far: "${l.bestAngle}"\n`
    if (l.bestChannel) memory += `- Best channel: ${l.bestChannel}\n`
    if (l.winRate) memory += `- Win rate: ${l.winRate}%\n`
    if (brainMemory.lastThought) memory += `- Last insight: ${brainMemory.lastThought}\n`
  }

  if (collectivePatterns.length > 0) {
    memory += `\n## COLLECTIVE INTELLIGENCE (similar products):\n`
    collectivePatterns.forEach(p => {
      memory += `- "${p.angle}" on ${p.channel}: ${(p.avgConversionRate * 100).toFixed(1)}% avg conv across ${p.sampleSize} experiments\n`
    })
  }

  if (crossSignals.length > 0) {
    memory += `\n## CROSS-PRODUCT SIGNALS:\n`
    crossSignals.forEach(s => {
      memory += `- ${s.insight} (${Math.round(s.confidence * 100)}% confidence)\n`
    })
  }

  if (marketCtx.length > 0) {
    memory += `\n## MARKET CONTEXT (${isSaudi ? 'Saudi' : 'Global'}):\n`
    marketCtx.forEach(m => {
      memory += `- [${m.impact.toUpperCase()}] ${m.insight}\n`
    })
  }

  return memory
}

// ─── DEBATE ENGINE ────────────────────────────────────────────────────────────
// اثنين prompts: الأول يقترح، الثاني يعارض، القرار من الجدال

export interface DebateResult {
  action: 'SCALE' | 'KILL' | 'ITERATE' | 'CONTINUE' | 'INSUFFICIENT_DATA'
  confidence: number
  reason: string
  proArgument: string
  conArgument: string
  finalJudgment: string
  dataQuality: 'strong' | 'moderate' | 'weak' | 'insufficient'
}

export async function debateDecision(
  product: { name: string; description: string; targetUser: string; price?: number | null; goal: string },
  experiment: { experimentId: string; type: string; angle: string; channel: string; pageViews: number; clicks: number; signups: number; revenue: number; conversionRate: number },
  memory: string
): Promise<DebateResult> {

  // حدد جودة البيانات أولاً
  const dataQuality = experiment.pageViews >= 200 ? 'strong'
    : experiment.pageViews >= 100 ? 'moderate'
    : experiment.pageViews >= 50 ? 'weak'
    : 'insufficient'

  // لو البيانات ما تكفي — قل ما أعرف
  if (dataQuality === 'insufficient') {
    return {
      action: 'INSUFFICIENT_DATA',
      confidence: 0,
      reason: `Only ${experiment.pageViews} views — need at least 50 for a meaningful signal. Keep running.`,
      proArgument: '',
      conArgument: '',
      finalJudgment: 'Not enough data to decide. Run more traffic.',
      dataQuality,
    }
  }

  const context = `
Product: ${product.name}
Description: ${product.description}
Target: ${product.targetUser}
Price: ${product.price ? `$${product.price}` : 'TBD'}
Goal: ${product.goal}

Experiment:
- Type: ${experiment.type}
- Angle: "${experiment.angle}"
- Channel: ${experiment.channel}
- Views: ${experiment.pageViews}
- Clicks: ${experiment.clicks} (${experiment.pageViews > 0 ? ((experiment.clicks/experiment.pageViews)*100).toFixed(1) : 0}% CTR)
- Signups: ${experiment.signups} (${(experiment.conversionRate * 100).toFixed(1)}% conv)
- Revenue: $${experiment.revenue.toFixed(0)}
- Data quality: ${dataQuality}
${memory}`

  // PROMPT 1: المدافع — يقترح القرار الأفضل
  const advocatePrompt = `You are a growth advocate analyzing an experiment result. Your job: make the STRONGEST possible case for the best action (SCALE, KILL, or ITERATE).

${context}

Give the most compelling argument FOR your recommended action. Be specific with numbers. Reference the memory if relevant.

Return ONLY JSON:
{
  "action": "SCALE|KILL|ITERATE|CONTINUE",
  "argument": "Your strongest case (2-3 sentences, specific)",
  "confidence": 75
}`

  // PROMPT 2: المعارض — يحاول يثبت إن القرار غلط
  const challengerPrompt = `You are a growth skeptic. Your job: challenge the advocate's recommendation and find every reason it could be WRONG.

${context}

The advocate will recommend SCALE, KILL, or ITERATE. Find the strongest counter-arguments:
- What data is missing?
- What could explain the results differently?
- What risks does the advocate ignore?
- Is the sample size really enough?

Return ONLY JSON:
{
  "counter_action": "SCALE|KILL|ITERATE|CONTINUE",
  "counter_argument": "Your strongest challenge (2-3 sentences)",
  "main_risk": "The biggest risk in the original recommendation"
}`

  // شغّل الاثنين بالتوازي
  const [advocateRes, challengerRes] = await Promise.all([
    openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: advocatePrompt }],
      response_format: { type: 'json_object' },
      temperature: 0.6,
    }),
    openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: challengerPrompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    }),
  ])

  const advocate = JSON.parse(advocateRes.choices[0].message.content || '{}')
  const challenger = JSON.parse(challengerRes.choices[0].message.content || '{}')

  // PROMPT 3: القاضي — يقرأ الجدال ويحكم
  const judgePrompt = `You are the final judge. Two analysts debated this experiment. Make the final call.

${context}

ADVOCATE says ${advocate.action}: "${advocate.argument}"
CHALLENGER counters with ${challenger.counter_action}: "${challenger.counter_argument}"
Main risk identified: "${challenger.main_risk}"

Your job: weigh both sides and make the FINAL decision. Be honest about uncertainty. If the debate reveals real ambiguity, choose ITERATE or CONTINUE.

Return ONLY JSON:
{
  "final_action": "SCALE|KILL|ITERATE|CONTINUE",
  "final_reason": "Clear 1-sentence reason referencing both sides",
  "confidence": 70,
  "verdict": "One sentence summarizing why this action wins the debate"
}`

  const judgeRes = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: judgePrompt }],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  })

  const judge = JSON.parse(judgeRes.choices[0].message.content || '{}')

  return {
    action: judge.final_action as any,
    confidence: judge.confidence || 70,
    reason: judge.final_reason || '',
    proArgument: advocate.argument || '',
    conArgument: challenger.counter_argument || '',
    finalJudgment: judge.verdict || '',
    dataQuality,
  }
}

// ─── 7-DAY FEEDBACK LOOP ─────────────────────────────────────────────────────
// يرجع بعد 7 أيام يقارن النتيجة الفعلية بالتوقع ويحدث الـ WinningPattern

export async function runFeedbackLoop() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  // جيب كل قرارات SCALE اللي صارت قبل 7 أيام وما اتقيّمت بعد
  const scaledDecisions = await prisma.decision.findMany({
    where: {
      action: 'SCALE',
      createdAt: { lte: sevenDaysAgo },
      feedbackScore: null,
    },
    include: {
      experiment: {
        include: { events: true, product: true },
      },
    },
    take: 50,
  })

  let updated = 0

  for (const decision of scaledDecisions) {
    if (!decision.experiment) continue

    // قارن النتائج قبل وبعد القرار
    const beforeDecision = decision.experiment.events.filter(
      e => new Date(e.createdAt) < new Date(decision.createdAt)
    )
    const afterDecision = decision.experiment.events.filter(
      e => new Date(e.createdAt) >= new Date(decision.createdAt)
    )

    const beforeViews = beforeDecision.filter(e => e.type === 'PAGE_VIEW').length
    const beforeSignups = beforeDecision.filter(e => e.type === 'SIGNUP').length
    const afterViews = afterDecision.filter(e => e.type === 'PAGE_VIEW').length
    const afterSignups = afterDecision.filter(e => e.type === 'SIGNUP').length

    const beforeConv = beforeViews > 0 ? beforeSignups / beforeViews : 0
    const afterConv = afterViews > 0 ? afterSignups / afterViews : 0

    // هل القرار كان صح؟
    const wasCorrect = afterConv >= beforeConv * 0.9 // تحسن أو ثبت
    const lift = beforeConv > 0 ? ((afterConv - beforeConv) / beforeConv) * 100 : 0
    const feedbackScore = wasCorrect ? Math.min(100, 50 + lift) : Math.max(0, 50 + lift)

    // حدّث الـ Decision بالـ feedback
    await prisma.decision.update({
      where: { id: decision.id },
      data: { feedbackScore: Math.round(feedbackScore) },
    }).catch(() => {})

    // حدّث أو أنشئ WinningPattern
    const existingPattern = await prisma.winningPattern.findFirst({
      where: {
        productId: decision.productId,
        experimentType: decision.experiment.type,
        angle: decision.experiment.angle,
      },
    })

    if (existingPattern) {
      // rolling average للـ confidence
      const newConfidence = (existingPattern.confidenceScore * existingPattern.successCount + feedbackScore) / (existingPattern.successCount + 1)
      await prisma.winningPattern.update({
        where: { id: existingPattern.id },
        data: {
          confidenceScore: Math.round(newConfidence),
          conversionRate: afterConv,
          successCount: { increment: wasCorrect ? 1 : 0 },
        },
      }).catch(() => {})
    } else if (wasCorrect) {
      await prisma.winningPattern.create({
        data: {
          productId: decision.productId!,
          experimentType: decision.experiment.type,
          angle: decision.experiment.angle,
          channel: decision.experiment.distributionChannel,
          conversionRate: afterConv,
          confidenceScore: Math.round(feedbackScore),
          successCount: 1,
        },
      }).catch(() => {})
    }

    updated++
    console.log(`[Feedback Loop] Decision ${decision.id}: ${wasCorrect ? '✅' : '❌'} lift=${lift.toFixed(1)}% score=${feedbackScore.toFixed(0)}`)
  }

  console.log(`[Feedback Loop] Updated ${updated} decisions`)
  return { updated }
}
