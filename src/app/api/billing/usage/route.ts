export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getBillingOpportunities, recommendUpsell } from '@/lib/billing-executor'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  const [opportunities, upsells] = await Promise.all([
    getBillingOpportunities(),
    userId ? recommendUpsell(userId) : Promise.resolve([]),
  ])
  return NextResponse.json({ opportunities, upsells })
}
