export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getDecisionMemory, debateDecision, updateBrainMemory } from '@/lib/brain'

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

  const pageViews = experiment.events.filter(e => e.type === 'PAGE_VIEW').length
  const clicks = experiment.events.filter(e => e.type === 'CLICK').length
  const signups = experiment.events.filter(e => e.type === 'SIGNUP').length
  const revenue = experiment.events.filter(e => e.type === 'PURCHASE').reduce((s, e) => s + e.value, 0)
  const conversionRate = pageViews > 0 ? signups / pageViews : 0

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
