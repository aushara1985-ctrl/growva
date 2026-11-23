export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { recommendUpsell } from '@/lib/billing-executor'

// SECURITY: session user only. Any client-supplied ?userId= is ignored.
export async function GET(req: NextRequest) {
  const session = getUserFromRequest(req)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const [opportunities, upsells] = await Promise.all([
    prisma.billingOpportunity.findMany({
      where: { status: 'new', userId: session.userId },
      orderBy: { estimatedMRR: 'desc' },
      take: 20,
    }),
    recommendUpsell(session.userId),
  ])
  return NextResponse.json({ opportunities, upsells })
}
