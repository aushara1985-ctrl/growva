import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: { trackingId: string } }
) {
  const experiment = await prisma.experiment.findUnique({
    where: { trackingId: params.trackingId },
    select: {
      id: true,
      productId: true,
      status: true,
      product: { select: { url: true } },
    },
  })

  if (!experiment || !experiment.product.url) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.event.create({
    data: {
      productId: experiment.productId,
      experimentId: experiment.id,
      type: 'CLICK',
      value: 1,
      metadata: {
        referrer: req.headers.get('referer') ?? null,
        source: req.nextUrl.searchParams.get('utm_source') ?? null,
        userAgent: req.headers.get('user-agent') ?? null,
      },
    },
  })

  return NextResponse.redirect(experiment.product.url, { status: 302 })
}
