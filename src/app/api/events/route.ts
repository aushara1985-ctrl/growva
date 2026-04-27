export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// POST /api/events
// Called via webhook from any connected product
export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key')
  const body = await req.json()

  // Validate API key
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing API key' }, { status: 401 })
  }

  const product = await prisma.product.findUnique({ where: { apiKey } })
  if (!product) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
  }

  const { type, experimentId, value, metadata } = body

  if (!type) {
    return NextResponse.json({ error: 'Missing event type' }, { status: 400 })
  }

  const event = await prisma.event.create({
    data: {
      productId: product.id,
      experimentId: experimentId || null,
      type,
      value: value || 1,
      metadata: metadata || {},
    },
  })

  return NextResponse.json(event, { status: 201 })
}

// GET /api/events?productId=xxx
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const productId = searchParams.get('productId')
  const experimentId = searchParams.get('experimentId')

  const events = await prisma.event.findMany({
    where: {
      ...(productId && { productId }),
      ...(experimentId && { experimentId }),
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return NextResponse.json(events)
}
