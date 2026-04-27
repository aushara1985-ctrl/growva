export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { analyzeFeatureRequest, getTopFeatureRequests } from '@/lib/feature-demand'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const productId = searchParams.get('productId') || undefined
  const features = await getTopFeatureRequests(productId)
  return NextResponse.json(features)
}

export async function POST(req: NextRequest) {
  const { productId, texts, source } = await req.json()
  if (!productId || !texts) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  const analysis = await analyzeFeatureRequest(productId, texts, source)
  return NextResponse.json(analysis)
}
