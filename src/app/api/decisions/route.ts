export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getDecisionMemory, debateDecision, updateBrainMemory } from '@/lib/brain'
import { sprintVerdict, generateSprintNarrative, SprintType, SprintResult } from '@/lib/sprint'

// GET /api/decisions?productId=xxx
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const productId = searchParams.get('productId')

  const decisions = await prisma.decision.findMany({
    where: { ...(productId && { productId }) },
    include: { experiment: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return NextResponse.json(decisions)
}

// POST /api/decisions — Debate-powered decision
export async function POST(req: NextRequest) {
  const { experimentId } = await req.json()

  const experiment = await prisma.experiment.findUnique({
    where: { id: experimentId },
    include: { product: true, events: true },
  })

  if (!experiment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // ─── Sprint Mode branch ───────────────────────────────────────────────────
  if (experiment.mode === 'SPRINT') {
    const meta = (experiment.metadata as any) ?? {}
    const sprintType = (meta.sprintType as SprintType) ?? 'DM'
    const plan = meta.sprintPlan ?? {}
    const hypothesis = meta.hypothesis ?? experiment.headline
    const manualResult: Partial<SprintResult> = meta.sprintResult ?? {}

    const auto = {
      clicks:    experiment.events.filter(e => e.type === 'CLICK').length,
      signups:   experiment.events.filter(e => e.type === 'SIGNUP').length,
      pageViews: experiment.events.filter(e => e.type === 'PAGE_VIEW').length,
      revenue:   experiment.events.filter(e => e.type === 'PURCHASE').reduce((s, e) => s + e.value, 0),
    }

    const verdict = sprintVerdict(sprintType, auto, manualResult)
    const reason  = await generateSprintNarrative(verdict, auto, manualResult, sprintType, hypothesis, plan)

    const confidenceMap = { SCALE: 0.85, CONTINUE: 0.55, KILL: 0.8 }

    const saved = await prisma.decision.create({
      data: {
        productId: experiment.productId,
        experimentId: experiment.id,
        action: verdict,
        reason,
        confidence: confidenceMap[verdict],
        metadata: {
          mode: 'SPRINT',
          sprintType,
          autoSignals: auto,
          manualSignals: manualResult,
          plan,
        },
        executedAt: new Date(),
      },
    })

    // Update experiment status based on verdict
    if (verdict === 'KILL') {
      await prisma.experiment.update({ where: { id: experiment.id }, data: { status: 'KILLED', endedAt: new Date() } })
    } else if (verdict === 'SCALE') {
      await prisma.experiment.update({ where: { id: experiment.id }, data: { status: 'SCALED' } })
    }

    await updateBrainMemory(experiment.productId).catch(() => {})

    return NextResponse.json({ decision: saved, mode: 'SPRINT' })
  }
  // ─────────────────────────────────────────────────────────────────────────

  const pageViews = experiment.events.filter(e => e.type === 'PAGE_VIEW').length
  const clicks    = experiment.events.filter(e => e.type === 'CLICK').length
  const signups   = experiment.events.filter(e => e.type === 'SIGNUP').length
  const revenue   = experiment.events.filter(e => e.type === 'PURCHASE').reduce((s, e) => s + e.value, 0)
  const conversionRate = pageViews > 0 ? signups / pageViews : 0

  // ─── Signal quality gates ─────────────────────────────────────────────────
  const MIN_VIEWS   = 300
  const MIN_SIGNUPS = 10

  const hasAnySignal    = clicks > 0 || pageViews > 0 || signups > 0
  const thresholdReached = pageViews >= MIN_VIEWS || signups >= MIN_SIGNUPS
  const windowClosed    = experiment.reviewDueAt != null && new Date(experiment.reviewDueAt) <= new Date()

  // Case 1: no tracking data at all
  if (!hasAnySignal) {
    const saved = await prisma.decision.create({
      data: {
        productId: experiment.productId,
        experimentId: experiment.id,
        action: 'CONTINUE',
        reason: 'No tracking data received yet. Install the site snippet on your page, or share your tracking link, so Growva can collect signal before making a decision.',
        confidence: 0,
        metadata: { insufficientData: true, reason: 'no_tracking', pageViews, clicks, signups },
        executedAt: new Date(),
      },
    })
    return NextResponse.json({ decision: saved, noData: true })
  }

  // Case 2: below threshold and window still open — too early to decide
  if (!thresholdReached && !windowClosed) {
    const needed = pageViews < MIN_VIEWS
      ? `${MIN_VIEWS - pageViews} more page views`
      : `${MIN_SIGNUPS - signups} more signups`
    const saved = await prisma.decision.create({
      data: {
        productId: experiment.productId,
        experimentId: experiment.id,
        action: 'CONTINUE',
        reason: `CONTINUE — ${pageViews} page views and ${signups} signups so far. Need ${needed} to reach the minimum threshold for a reliable decision. Keep sending traffic.`,
        confidence: 0.3,
        metadata: { insufficientData: true, reason: 'below_threshold', pageViews, clicks, signups, revenue },
        executedAt: new Date(),
      },
    })
    return NextResponse.json({ decision: saved, belowThreshold: true })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Threshold reached OR window closed → proceed to AI debate
  // 1. جيب الذاكرة الكاملة
  const memory = await getDecisionMemory(experiment.productId, experiment.id)

  // 2. شغّل الـ Debate Engine
  const debate = await debateDecision(
    {
      name: experiment.product.name,
      description: experiment.product.description,
      targetUser: experiment.product.targetUser,
      price: experiment.product.price,
      goal: experiment.product.goal,
    },
    { experimentId: experiment.id, type: experiment.type, angle: experiment.angle, channel: experiment.distributionChannel, pageViews, clicks, signups, revenue, conversionRate },
    memory
  )

  // 3. حفظ القرار
  const saved = await prisma.decision.create({
    data: {
      productId: experiment.productId,
      experimentId: experiment.id,
      action: debate.action === 'INSUFFICIENT_DATA' ? 'CONTINUE' : debate.action as any,
      reason: debate.reason,
      confidence: debate.confidence,
      metadata: {
        proArgument: debate.proArgument,
        conArgument: debate.conArgument,
        finalJudgment: debate.finalJudgment,
        dataQuality: debate.dataQuality,
        insufficientData: debate.action === 'INSUFFICIENT_DATA',
      },
      executedAt: new Date(),
    },
  })

  // 4. تنفيذ القرار
  if (debate.action === 'KILL') {
    await prisma.experiment.update({ where: { id: experiment.id }, data: { status: 'KILLED', endedAt: new Date() } })
  } else if (debate.action === 'SCALE') {
    await prisma.experiment.update({ where: { id: experiment.id }, data: { status: 'SCALED' } })
    await prisma.signalEvent.create({
      data: {
        productId: experiment.productId,
        type: 'experiment_won',
        payload: {
          productDescription: experiment.product.description,
          targetUser: experiment.product.targetUser,
          experimentType: experiment.type,
          angle: experiment.angle,
          channel: experiment.distributionChannel,
          market: /saudi|سعود|ksa/i.test(experiment.product.targetUser + experiment.product.description) ? 'saudi' : 'global',
          conversionRate,
          daysToSignal: Math.ceil((Date.now() - new Date(experiment.startedAt).getTime()) / 86400000),
        },
      },
    }).catch(() => {})
  }

  // 5. حدّث BrainMemory
  await updateBrainMemory(experiment.productId).catch(() => {})

  return NextResponse.json({ decision: saved, debate })
}
