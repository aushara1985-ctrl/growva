import { prisma } from '@/lib/db'
import { generateGrowthCard } from '@/lib/growth-card'
import { updateBrainMemory, generateExperimentsWithBrain, seedMarketContext, runFeedbackLoop } from '@/lib/brain'
import { processSignalEvents, seedPlaybooks, seedSegmentBenchmarks, logSignalEvent } from '@/lib/monopoly'
import { runExecutor } from '@/lib/executor'
import { analyzeFeatureRequest, getTopFeatureRequests } from '@/lib/feature-demand'
import { getCompetitorSignals } from '@/lib/competitor-intel'
import { getMonopolyScore } from '@/lib/monopoly-builder'
import { detectBillingOpportunities } from '@/lib/billing-executor'
import { startOfDay, subDays } from 'date-fns'
import {
  decideExperiment,
  generateExperiments,
  generateDailyBrief,
  generateDailySummary,
  calculateProductScore,
} from '@/lib/ai'

// ─── EXECUTION AGENT DAILY LOOP ──────────────────────────────────────────────

export async function runExecutionAgentLoop() {
  console.log('[Execution Agent] Starting...')

  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: {
      decisions: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  })

  for (const product of products) {
    try {
      // 1. Get latest decision
      const latestDecision = product.decisions[0]?.action || 'CONTINUE'

      // 2. Get brain memory
      const brainMemory = await prisma.brainMemory.findUnique({ where: { productId: product.id } })

      // 3. Get winning patterns
      const winningPatterns = await prisma.winningPattern.findMany({
        where: { productId: product.id },
        orderBy: { conversionRate: 'desc' },
        take: 5,
      })

      // 4. Get market signals
      const marketSignals = await prisma.marketContext.findMany({
        where: { active: true },
        take: 5,
      })

      // 5. Get competitor gaps
      const competitorSignals = await getCompetitorSignals(product.id)

      // 6. Get requested features
      const requestedFeatures = await getTopFeatureRequests(product.id)

      // 7. Run executor
      const actions = await runExecutor({
        productId: product.id,
        decision: latestDecision,
        productContext: product,
        brainMemory: brainMemory?.learnings,
        predictiveResult: null,
        winningPatterns,
        marketSignals,
        competitorSignals,
        requestedFeatures,
        billingStatus: null,
      })

      // 8. Execute safe actions, request approval for dangerous ones
      for (const action of actions) {
        if (action.safe) {
          // executeSafeAction(product.id, action)
        } else {
          await queueForApproval(product.id, action).catch(() => {})
        }
      }

      console.log(`[Execution Agent] ${product.name}: ${actions.length} actions generated`)
    } catch (err) {
      console.error(`[Execution Agent] Error for ${product.name}:`, err)
    }
  }
}

export async function runDailyGrowthLoop() {
  console.log('[Growth Loop] Starting daily run...')
  await seedMarketContext().catch(() => {})
  await seedPlaybooks().catch(() => {})
  await seedSegmentBenchmarks().catch(() => {})
  await processSignalEvents().catch(() => {})
  await runFeedbackLoop().catch(e => console.error('[Feedback Loop] Error:', e))

  // ── Execution Agent Loop ──────────────────────────────────────────────────
  await runExecutionAgentLoop().catch(e => console.error('[Execution Agent] Error:', e))

  const today = startOfDay(new Date())

  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: {
      experiments: { where: { status: 'ACTIVE' } },
      winningPatterns: { orderBy: { conversionRate: 'desc' }, take: 5 },
    },
  })

  const productSummaries = []

  for (const product of products) {
    console.log(`[Growth Loop] Processing: ${product.name}`)
    const summary = await processProduct(product, today)
    productSummaries.push(summary)
  }

  // Generate AI Daily Brief across all products
  if (products.length > 0) {
    try {
      const brief = await generateDailyBrief({ products: productSummaries })
      await prisma.dailyBrief.upsert({
        where: { date: today },
        update: { content: brief.content, topFocus: brief.topFocus, actions: brief.actions },
        create: { date: today, content: brief.content, topFocus: brief.topFocus, actions: brief.actions },
      })
    } catch (e) {
      console.error('[Growth Loop] Brief generation failed:', e)
    }
  }

  console.log('[Growth Loop] Done.')
}

async function processProduct(product: any, today: Date) {
  const decisions: Array<{ action: string; reason: string }> = []
  let totalConversions = 0
  let totalRevenue = 0

  const pastWinners = product.winningPatterns.map((w: any) => ({
    type: w.experimentType,
    angle: w.angle,
    channel: w.channel,
    conversionRate: w.conversionRate,
  }))

  // Step 1: Analyze + decide on each active experiment
  for (const experiment of product.experiments) {
    const events = await prisma.event.findMany({
      where: { experimentId: experiment.id, createdAt: { gte: today } },
    })

    const pageViews = events.filter(e => e.type === 'PAGE_VIEW').length
    const clicks = events.filter(e => e.type === 'CLICK').length
    const signups = events.filter(e => e.type === 'SIGNUP').length
    const revenue = events.filter(e => e.type === 'PURCHASE').reduce((s, e) => s + e.value, 0)

    totalConversions += signups
    totalRevenue += revenue

    const conversionRate = pageViews > 0 ? signups / pageViews : 0

    const decision = await decideExperiment(
      { name: product.name, description: product.description, price: product.price || undefined, targetUser: product.targetUser, goal: product.goal },
      { experimentId: experiment.id, type: experiment.type, angle: experiment.angle, channel: experiment.distributionChannel, pageViews, clicks, signups, revenue, conversionRate },
      pastWinners
    )

    await prisma.decision.create({
      data: {
        productId: product.id,
        experimentId: experiment.id,
        action: decision.action as any,
        reason: decision.reason,
        confidence: decision.confidence,
        executedAt: new Date(),
      },
    })

    decisions.push({ action: decision.action, reason: decision.reason })

    // Execute decision
    if (decision.action === 'KILL') {
      await prisma.experiment.update({ where: { id: experiment.id }, data: { status: 'KILLED', endedAt: new Date() } })
    } else if (decision.action === 'SCALE') {
      await prisma.experiment.update({ where: { id: experiment.id }, data: { status: 'SCALED' } })
      // Log to monopoly engine
      await logSignalEvent(product.id, 'experiment_won', {
        productDescription: product.description,
        targetUser: product.targetUser,
        experimentType: experiment.type,
        angle: experiment.angle,
        channel: experiment.distributionChannel,
        market: /saudi|سعود|ksa/i.test(product.targetUser + product.description) ? 'saudi' : 'global',
        conversionRate,
        daysToSignal: Math.ceil((Date.now() - new Date(experiment.startedAt).getTime()) / 86400000),
      }).catch(() => {})

      // Generate growth card
      const daysRunning = Math.ceil((Date.now() - new Date(experiment.startedAt).getTime()) / 86400000)
      const cardData = await generateGrowthCard({
        productName: product.name,
        experimentAngle: experiment.angle,
        experimentType: experiment.type,
        conversionRate,
        revenue,
        pageViews,
        signups,
        daysRunning,
      }).catch(() => null)

      if (cardData) {
        await prisma.growthCard.create({
          data: {
            experimentId: experiment.id,
            productId: product.id,
            metricLabel: cardData.metricLabel,
            metricValue: cardData.metricValue,
            headline: cardData.headline,
            description: cardData.description,
            tweetText: cardData.tweetText,
          },
        }).catch(() => {}) // ignore if already exists
      }

      // Save as winning pattern
      if (pageViews >= 30) {
        await prisma.winningPattern.create({
          data: {
            productId: product.id,
            experimentType: experiment.type,
            angle: experiment.angle,
            channel: experiment.distributionChannel,
            conversionRate,
            revenue,
            sampleSize: pageViews,
            confidence: decision.confidence,
          },
        })
      }
    } else if (decision.action === 'ITERATE' && decision.nextExperiment) {
      await prisma.experiment.update({ where: { id: experiment.id }, data: { status: 'COMPLETED', endedAt: new Date() } })
      const next = decision.nextExperiment
      await prisma.experiment.create({
        data: {
          productId: product.id,
          type: (next.type as any) || experiment.type,
          angle: next.angle || experiment.angle,
          headline: next.headline || experiment.headline,
          copy: next.copy || experiment.copy,
          cta: next.cta || experiment.cta,
          distributionChannel: next.distributionChannel || experiment.distributionChannel,
          expectedKpi: next.expectedKpi || experiment.expectedKpi,
          status: 'ACTIVE',
        },
      })
    }
  }

  // Step 2: Generate new experiments if none active
  const activeCount = await prisma.experiment.count({ where: { productId: product.id, status: 'ACTIVE' } })
  if (activeCount === 0) {
    const newExps = await generateExperimentsWithBrain(
      { id: product.id, name: product.name, description: product.description, price: product.price, targetUser: product.targetUser, goal: product.goal },
      pastWinners
    )
    for (const exp of newExps) {
      await prisma.experiment.create({
        data: {
          productId: product.id,
          type: exp.type as any,
          angle: exp.angle,
          headline: exp.headline,
          copy: exp.copy,
          cta: exp.cta,
          distributionChannel: exp.distributionChannel,
          expectedKpi: exp.expectedKpi,
          status: 'ACTIVE',
        },
      })
    }
  }

  // Step 3: Update product score
  const last7 = subDays(today, 7)
  const last30 = subDays(today, 30)
  const [allExps, conv7d, rev7d, conv30d, rev30d, lastConvEvent, patterns] = await Promise.all([
    prisma.experiment.findMany({ where: { productId: product.id } }),
    prisma.event.count({ where: { productId: product.id, type: 'SIGNUP', createdAt: { gte: last7 } } }),
    prisma.event.aggregate({ where: { productId: product.id, type: 'PURCHASE', createdAt: { gte: last7 } }, _sum: { value: true } }),
    prisma.event.count({ where: { productId: product.id, type: 'SIGNUP', createdAt: { gte: last30 } } }),
    prisma.event.aggregate({ where: { productId: product.id, type: 'PURCHASE', createdAt: { gte: last30 } }, _sum: { value: true } }),
    prisma.event.findFirst({ where: { productId: product.id, type: 'SIGNUP' }, orderBy: { createdAt: 'desc' } }),
    prisma.winningPattern.count({ where: { productId: product.id } }),
  ])

  const scaledExps = allExps.filter(e => e.status === 'SCALED')
  const avgConvRate = scaledExps.length > 0
    ? scaledExps.reduce((s, _) => s + 0.05, 0) / scaledExps.length
    : 0

  const daysSinceLastConv = lastConvEvent
    ? Math.floor((Date.now() - new Date(lastConvEvent.createdAt).getTime()) / 86400000)
    : 999

  const score = calculateProductScore({
    activeExperiments: activeCount,
    conversions7d: conv7d,
    conversions30d: conv30d,
    revenue7d: rev7d._sum.value || 0,
    revenue30d: rev30d._sum.value || 0,
    scaledExperiments: scaledExps.length,
    killedExperiments: allExps.filter(e => e.status === 'KILLED').length,
    totalExperiments: allExps.length,
    winningPatterns: patterns,
    avgConversionRate: avgConvRate,
    daysSinceLastConversion: daysSinceLastConv,
  })

  await prisma.productScore.upsert({
    where: { productId: product.id },
    update: score,
    create: { productId: product.id, ...score },
  })

  // Step 4: Save daily report
  const summary = await generateDailySummary(product.name, { activeExperiments: activeCount, totalConversions, totalRevenue, decisions })
  await prisma.dailyReport.upsert({
    where: { productId_date: { productId: product.id, date: today } },
    update: { totalEvents: totalConversions, revenue: totalRevenue, summary },
    create: { productId: product.id, date: today, totalEvents: totalConversions, revenue: totalRevenue, summary },
  })

  // Update brain memory with all learnings
  await updateBrainMemory(product.id).catch(e => console.error('[Brain] Memory update failed:', e))

  const topChannel = pastWinners[0]?.channel
  const momentum: 'up' | 'down' | 'flat' = totalConversions > 0 ? 'up' : activeCount > 0 ? 'flat' : 'down'

  return {
    name: product.name,
    activeExperiments: activeCount,
    conversions: totalConversions,
    revenue: totalRevenue,
    topChannel,
    momentum,
    winningPatterns: pastWinners,
  }
}
