export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getBrainStatus, getBrainInsights, updateBrainMemory } from '@/lib/brain'
import { prisma } from '@/lib/db'

// GET /api/brain?productId=xxx
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const productId = searchParams.get('productId')

  if (!productId) {
    // Return global brain stats
    const [patterns, signals, memories] = await Promise.all([
      prisma.collectivePattern.count(),
      prisma.crossProductSignal.count(),
      prisma.brainMemory.count(),
    ])

    const topPatterns = await prisma.collectivePattern.findMany({
      orderBy: { avgConversionRate: 'desc' },
      take: 5,
      where: { sampleSize: { gte: 3 } },
    })

    return NextResponse.json({
      collectiveDatapoints: patterns,
      crossProductSignals: signals,
      productsWithMemory: memories,
      topPatterns,
    })
  }

  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [status, insights] = await Promise.all([
    getBrainStatus(productId),
    getBrainInsights({ id: productId, name: product.name, description: product.description, targetUser: product.targetUser, price: product.price }),
  ])

  return NextResponse.json({ ...status, insights })
}

// POST /api/brain — manually trigger brain update for a product
export async function POST(req: NextRequest) {
  const { productId } = await req.json()

  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await updateBrainMemory(productId)
  const status = await getBrainStatus(productId)

  return NextResponse.json(status)
}
