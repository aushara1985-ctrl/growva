export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateGrowthCard } from '@/lib/growth-card'
import { startOfDay } from 'date-fns'

// GET /api/growth-cards?productId=xxx
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const productId = searchParams.get('productId')

  const cards = await prisma.growthCard.findMany({
    where: { ...(productId && { productId }) },
    include: { experiment: true, product: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return NextResponse.json(cards)
}

// POST /api/growth-cards — generate card for a scaled experiment
export async function POST(req: NextRequest) {
  const { experimentId } = await req.json()

  const experiment = await prisma.experiment.findUnique({
    where: { id: experimentId },
    include: { product: true, events: true },
  })

  if (!experiment) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (experiment.status !== 'SCALED') return NextResponse.json({ error: 'Only scaled experiments get growth cards' }, { status: 400 })

  // Check if card already exists
  const existing = await prisma.growthCard.findFirst({ where: { experimentId } })
  if (existing) return NextResponse.json(existing)

  const pageViews = experiment.events.filter(e => e.type === 'PAGE_VIEW').length
  const signups = experiment.events.filter(e => e.type === 'SIGNUP').length
  const revenue = experiment.events.filter(e => e.type === 'PURCHASE').reduce((s, e) => s + e.value, 0)
  const conversionRate = pageViews > 0 ? signups / pageViews : 0
  const daysRunning = Math.ceil((Date.now() - new Date(experiment.startedAt).getTime()) / 86400000)

  const cardData = await generateGrowthCard({
    productName: experiment.product.name,
    experimentAngle: experiment.angle,
    experimentType: experiment.type,
    conversionRate,
    revenue,
    pageViews,
    signups,
    daysRunning,
  })

  const card = await prisma.growthCard.create({
    data: {
      experimentId: experiment.id,
      productId: experiment.productId,
      metricLabel: cardData.metricLabel,
      metricValue: cardData.metricValue,
      headline: cardData.headline,
      description: cardData.description,
      tweetText: cardData.tweetText,
    },
  })

  return NextResponse.json(card, { status: 201 })
}

// PATCH /api/growth-cards — increment share count
export async function PATCH(req: NextRequest) {
  const { cardId } = await req.json()
  const card = await prisma.growthCard.update({
    where: { id: cardId },
    data: { shareCount: { increment: 1 }, isPublic: true },
  })
  return NextResponse.json(card)
}
