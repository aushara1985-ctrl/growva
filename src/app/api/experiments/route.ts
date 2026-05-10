export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateSprintPlan, SprintType } from '@/lib/sprint'

// POST /api/experiments — create a single sprint experiment
export async function POST(req: NextRequest) {
  const { productId, hypothesis, sprintType, targetAudience } = await req.json()

  if (!productId || !hypothesis || !sprintType) {
    return NextResponse.json({ error: 'Missing required fields: productId, hypothesis, sprintType' }, { status: 400 })
  }

  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  const audience = targetAudience || product.targetUser

  // Generate sprint plan — AI or fallback template
  const plan = await generateSprintPlan(sprintType as SprintType, product.name, hypothesis, audience)

  // Sprint experiments start RUNNING immediately with a 48h window
  const now = new Date()
  const reviewDueAt = new Date(now.getTime() + 48 * 60 * 60 * 1000)
  const trackingId = crypto.randomUUID()

  const experiment = await prisma.experiment.create({
    data: {
      productId,
      type: 'CONTENT_ANGLE',
      angle: hypothesis,
      headline: hypothesis,
      copy: plan.action,
      cta: 'Learn more',
      distributionChannel: sprintType.toLowerCase().replace('_', ' '),
      expectedKpi: 'replies + clicks + signups',
      status: 'RUNNING',
      mode: 'SPRINT',
      activatedAt: now,
      reviewDueAt,
      trackingId,
      metadata: {
        mode: 'SPRINT',
        hypothesis,
        sprintType,
        targetAudience: audience,
        sprintPlan: plan,
      },
    },
  })

  // Mark product active
  await prisma.product.update({ where: { id: productId }, data: { isActive: true } })

  return NextResponse.json(experiment)
}
