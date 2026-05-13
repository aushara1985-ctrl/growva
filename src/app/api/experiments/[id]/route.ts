export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

// PATCH /api/experiments/[id] — save sprint manual evidence to metadata
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = getUserFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const body = await req.json()
  const { sprintResult } = body

  const experiment = await prisma.experiment.findUnique({
    where: { id: params.id },
    select: { metadata: true, productId: true, product: { select: { userId: true } } },
  })

  if (!experiment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Ownership check — allow unowned legacy products
  const productUserId = experiment.product?.userId
  if (productUserId && productUserId !== session.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

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
