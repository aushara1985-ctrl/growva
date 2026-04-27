export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateExperiments } from '@/lib/ai'

// GET /api/products
export async function GET() {
  const products = await prisma.product.findMany({
    include: {
      experiments: {
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
      },
      _count: {
        select: { events: true, experiments: true, decisions: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(products)
}

// POST /api/products
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, description, url, price, targetUser, goal } = body

  if (!name || !description || !targetUser) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const product = await prisma.product.create({
    data: { name, description, url, price: price ? parseFloat(price) : null, targetUser, goal: goal || 'revenue' },
  })

  return NextResponse.json(product, { status: 201 })
}
