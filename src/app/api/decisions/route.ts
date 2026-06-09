export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'
import { updateBrainMemory } from '@/lib/brain'
import { sprintVerdict, generateSprintNarrative, SprintType, SprintResult } from '@/lib/sprint'
import { decide } from '@/lib/decide'

// GET /api/decisions?productId=xxx
export async function GET(req: NextRequest) {
  const session = getUserFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const productId = searchParams.get('productId')

  // Scope to user's products
  const decisions = await prisma.decision.findMany({
    where: {
      ...(productId ? { productId } : {}),
      product: { userId: session.userId },
    },
    include: { experiment: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return NextResponse.json(decisions)
}

// POST /api/decisions — Debate-powered decision
export async function POST(req: NextRequest) {
  const session = getUserFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const { experimentId } = await req.json()

  const experiment = await prisma.experiment.findUnique({
    where: { id: experimentId },
    include: { product: true, events: true },
  })

  if (!experiment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Ownership check — allow unowned legacy products
  if (experiment.product.userId && experiment.product.userId !== session.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

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
        } as any,
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
  const purchases = experiment.events.filter(e => e.type === 'PURCHASE').length
  const revenue   = experiment.events.filter(e => e.type === 'PURCHASE').reduce((s, e) => s + e.value, 0)
  const conversionRate = pageViews > 0 ? signups / pageViews : 0
  const windowClosed = experiment.reviewDueAt != null && new Date(experiment.reviewDueAt) <= new Date()

  // ─── 6-part Decision Engine (deterministic, rules + data only) ─────────────
  const v6 = decide({
    pageViews,
    clicks,
    signups,
    purchases,
    revenue,
    goal: experiment.product.goal,
    windowClosed,
  })

  const saved = await prisma.decision.create({
    data: {
      productId: experiment.productId,
      experimentId: experiment.id,
      action: v6.action as any,
      reason: v6.why,
      confidence: v6.confidenceScore,
      metadata: { v6 } as any,
      executedAt: new Date(),
    },
  })

  // Execute the verdict on experiment status
  if (v6.verdict === 'STOP') {
    await prisma.experiment.update({ where: { id: experiment.id }, data: { status: 'KILLED', endedAt: new Date() } })
  } else if (v6.verdict === 'SCALE') {
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

  // Keep collective memory in sync (frozen layer — write only, not used in the verdict)
  await updateBrainMemory(experiment.productId).catch(() => {})

  return NextResponse.json({ decision: saved, v6 })
}
