export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { analyzeCompetitorGaps, getCompetitorSignals, KNOWN_COMPETITORS } from '@/lib/competitor-intel'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const productId = searchParams.get('productId') || undefined
  const signals = await getCompetitorSignals(productId)
  return NextResponse.json({ signals, known: KNOWN_COMPETITORS })
}

export async function POST(req: NextRequest) {
  const { productId, competitors } = await req.json()
  if (!productId) return NextResponse.json({ error: 'Missing productId' }, { status: 400 })
  const gaps = await analyzeCompetitorGaps(productId, competitors || KNOWN_COMPETITORS)
  return NextResponse.json(gaps)
}
