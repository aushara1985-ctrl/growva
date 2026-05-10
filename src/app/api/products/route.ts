export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'
import { generateExperiments } from '@/lib/ai'

// GET /api/products — returns only the authenticated user's products
export async function GET(req: NextRequest) {
  const session = getUserFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const products = await prisma.product.findMany({
    where: { userId: session.userId },
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

// POST /api/products — creates a product owned by the authenticated user
export async function POST(req: NextRequest) {
  const session = getUserFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const body = await req.json()
  const { name, description, url, price, targetUser, goal } = body

  if (!name || !description || !targetUser) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const product = await prisma.product.create({
    data: {
      name,
      description,
      url,
      price: price ? parseFloat(price) : null,
      targetUser,
      goal: goal || 'revenue',
      userId: session.userId,
    },
  })

  return NextResponse.json(product, { status: 201 })
}
