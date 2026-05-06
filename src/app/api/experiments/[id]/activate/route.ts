import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const experiment = await prisma.experiment.findUnique({
    where: { id: params.id },
    select: { id: true, status: true, trackingId: true },
  })

  if (!experiment) {
    return NextResponse.json({ error: 'Experiment not found' }, { status: 404 })
  }

  if (experiment.status === 'RUNNING') {
    return NextResponse.json({ error: 'Already running' }, { status: 409 })
  }

  if (!['PENDING', 'ACTIVE'].includes(experiment.status)) {
    return NextResponse.json(
      { error: `Cannot activate experiment with status ${experiment.status}` },
      { status: 422 }
    )
  }

  const now = new Date()
  const reviewDueAt = new Date(now.getTime() + 48 * 60 * 60 * 1000)
  const trackingId = experiment.trackingId ?? crypto.randomUUID()

  const updated = await prisma.experiment.update({
    where: { id: params.id },
    data: {
      status: 'RUNNING',
      activatedAt: now,
      reviewDueAt,
      trackingId,
    },
    select: {
      id: true,
      status: true,
      trackingId: true,
      activatedAt: true,
      reviewDueAt: true,
    },
  })

  return NextResponse.json(updated)
}
