export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import {
  getPredictions,
  getPersonalizedDashboard,
  getMonopolyStatus,
  seedPlaybooks,
  seedSegmentBenchmarks,
  processSignalEvents,
  logSignalEvent,
} from '@/lib/monopoly'

// GET /api/monopoly — full status
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const productId = searchParams.get('productId')
  const userId = searchParams.get('userId')

  if (type === 'predict' && productId) {
    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const predictions = await getPredictions(product)
    return NextResponse.json({ predictions })
  }

  if (type === 'dashboard' && userId) {
    const dashboard = await getPersonalizedDashboard(userId)
    return NextResponse.json({ dashboard })
  }

  if (type === 'status') {
    const status = await getMonopolyStatus()
    return NextResponse.json(status)
  }

  const status = await getMonopolyStatus()
  return NextResponse.json(status)
}

// POST /api/monopoly — seed or process
export async function POST(req: NextRequest) {
  const { action, productId, type, payload } = await req.json()

  if (action === 'seed') {
    await Promise.all([seedPlaybooks(), seedSegmentBenchmarks()])
    return NextResponse.json({ seeded: true })
  }

  if (action === 'process_signals') {
    await processSignalEvents()
    return NextResponse.json({ processed: true })
  }

  if (action === 'log_signal' && productId) {
    await logSignalEvent(productId, type, payload)
    return NextResponse.json({ logged: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
