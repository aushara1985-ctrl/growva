export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { evaluateFeatureDecision, getTopDecisions, applyFounderAction } from '@/lib/decision-v2'

// GET /api/decisions-v2?productId=xxx
// Returns all feature decisions ranked by focus score
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const productId = searchParams.get('productId') || undefined
  const limit = parseInt(searchParams.get('limit') || '20')

  const decisions = await getTopDecisions(productId, limit)

  // Mark top 3 as "this week priority"
  const ranked = decisions.map((d, i) => ({
    ...d,
    isTopPriority: i < 3,
    rank: i + 1,
  }))

  return NextResponse.json(ranked)
}

// POST /api/decisions-v2
// Actions: evaluate | founder_action
export async function POST(req: NextRequest) {
  const { action, featureRequestId, featureDecisionId, founderAction } = await req.json()

  if (action === 'evaluate') {
    if (!featureRequestId) return NextResponse.json({ error: 'Missing featureRequestId' }, { status: 400 })
    const result = await evaluateFeatureDecision(featureRequestId)
    return NextResponse.json(result)
  }

  if (action === 'founder_action') {
    if (!featureDecisionId || !founderAction) {
      return NextResponse.json({ error: 'Missing featureDecisionId or founderAction' }, { status: 400 })
    }
    const result = await applyFounderAction(featureDecisionId, founderAction)
    return NextResponse.json({ success: true, buildTicket: result })
  }

  // Evaluate all pending features for a product
  if (action === 'evaluate_all') {
    const productId = req.nextUrl?.searchParams.get('productId')
    const pending = await prisma.featureRequest.findMany({
      where: {
        ...(productId && { productId }),
        status: { in: ['new', 'scored'] },
        featureDecision: null,
      },
      take: 10,
    })

    const results = []
    for (const f of pending) {
      const r = await evaluateFeatureDecision(f.id).catch(e => ({ error: String(e) }))
      results.push({ id: f.id, feature: f.normalizedFeature, ...r })
    }

    return NextResponse.json({ evaluated: results.length, results })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
