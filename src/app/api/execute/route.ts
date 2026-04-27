export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateExecutionAssets } from '@/lib/ai'

// POST /api/execute — generate all assets for an experiment
export async function POST(req: NextRequest) {
  const { experimentId } = await req.json()

  const experiment = await prisma.experiment.findUnique({
    where: { id: experimentId },
    include: { product: true },
  })

  if (!experiment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const assets = await generateExecutionAssets(
    {
      name: experiment.product.name,
      description: experiment.product.description,
      price: experiment.product.price || undefined,
      targetUser: experiment.product.targetUser,
      goal: experiment.product.goal,
    },
    {
      type: experiment.type,
      angle: experiment.angle,
      headline: experiment.headline,
      copy: experiment.copy,
      cta: experiment.cta,
      channel: experiment.distributionChannel,
    }
  )

  return NextResponse.json({ experimentId, assets })
}
