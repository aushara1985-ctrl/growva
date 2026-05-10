export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// PATCH /api/experiments/[id] — save sprint manual evidence to metadata
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json()
  const { sprintResult } = body

  const experiment = await prisma.experiment.findUnique({
    where: { id: params.id },
    select: { metadata: true },
  })

  if (!experiment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const currentMeta = (experiment.metadata as Record<string, unknown>) ?? {}

  const updated = await prisma.experiment.update({
    where: { id: params.id },
    data: {
      metadata: {
        ...currentMeta,
        sprintResult,
      },
    },
  })

  return NextResponse.json(updated)
}
