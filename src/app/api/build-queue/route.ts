export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const productId = searchParams.get('productId') || undefined
  const status = searchParams.get('status') || undefined

  const tickets = await prisma.buildTicket.findMany({
    where: {
      ...(productId && { productId }),
      ...(status && { status }),
    },
    include: { featureDecision: { include: { featureRequest: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return NextResponse.json(tickets)
}
