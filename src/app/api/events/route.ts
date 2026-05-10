export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
}

// OPTIONS — preflight for cross-origin snippet requests
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

// POST /api/events — called via snippet or direct API
export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key')

  if (!apiKey) {
    return NextResponse.json({ error: 'Missing API key' }, { status: 401, headers: CORS })
  }

  const product = await prisma.product.findUnique({ where: { apiKey } })
  if (!product) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401, headers: CORS })
  }

  const body = await req.json()
  const { type, experimentId, value, metadata, visitorId } = body

  if (!type) {
    return NextResponse.json({ error: 'Missing event type' }, { status: 400, headers: CORS })
  }

  const event = await prisma.event.create({
    data: {
      productId: product.id,
      experimentId: experimentId || null,
      type,
      value: value || 1,
      visitorId: visitorId || null,
      metadata: metadata || {},
    },
  })

  return NextResponse.json(event, { status: 201, headers: CORS })
}

// GET /api/events?productId=xxx&experimentId=xxx
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
