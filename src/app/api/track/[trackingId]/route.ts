import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://growva-production.up.railway.app'

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
      product: { select: { id: true, url: true } },
    },
  })

  if (!experiment) {
    return NextResponse.json({ error: 'Tracking link not found' }, { status: 404 })
  }

  // Record the click regardless of whether destination URL exists
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

  // Redirect to product URL if set.
  // If not (Sprint Mode founders without a page), go to the public sprint page.
  // Never send to /products/* — that's an auth-protected internal route.
  const destination = experiment.product.url
    ?? `${BASE_URL}/s/${params.trackingId}`

  return NextResponse.redirect(destination, { status: 302 })
}
