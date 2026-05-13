export const dynamic = 'force-dynamic'

// Public endpoint — no auth required.
// Called by the /s/[trackingId] page to record PAGE_VIEW on load and SIGNUP on CTA click.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { trackingId: string } }
) {
  const { type, visitorId } = await req.json()

  if (!type || !['PAGE_VIEW', 'SIGNUP'].includes(type)) {
    return NextResponse.json({ error: 'type must be PAGE_VIEW or SIGNUP' }, { status: 400, headers: CORS })
  }

  const experiment = await prisma.experiment.findUnique({
    where: { trackingId: params.trackingId },
    select: { id: true, productId: true, status: true },
  })

  if (!experiment) {
    return NextResponse.json({ error: 'Not found' }, { status: 404, headers: CORS })
  }

  const event = await prisma.event.create({
    data: {
      productId: experiment.productId,
      experimentId: experiment.id,
      type,
      value: 1,
      visitorId: visitorId || null,
      metadata: {
        source: 'sprint_public_page',
        userAgent: req.headers.get('user-agent') ?? null,
        referrer: req.headers.get('referer') ?? null,
      },
    },
  })

  return NextResponse.json({ ok: true, eventId: event.id }, { headers: CORS })
}
