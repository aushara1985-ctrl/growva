export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateDailyBrief, calculateProductScore } from '@/lib/ai'
import { startOfDay, subDays } from 'date-fns'

// GET — fetch today's brief
export async function GET() {
  const today = startOfDay(new Date())
  const brief = await prisma.dailyBrief.findUnique({ where: { date: today } })
  return NextResponse.json(brief || null)
}

// POST — generate brief on demand
export async function POST() {
  const today = startOfDay(new Date())
  const last7 = subDays(today, 7)

  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: {
      experiments: true,
      winningPatterns: { orderBy: { conversionRate: 'desc' }, take: 3 },
    },
  })

  if (products.length === 0) {
    return NextResponse.json({ error: 'No active products' }, { status: 400 })
  }

  const productSummaries = await Promise.all(
    products.map(async p => {
      const [conv, rev] = await Promise.all([
        prisma.event.count({ where: { productId: p.id, type: 'SIGNUP', createdAt: { gte: last7 } } }),
        prisma.event.aggregate({ where: { productId: p.id, type: 'PURCHASE', createdAt: { gte: last7 } }, _sum: { value: true } }),
      ])
      const activeExps = p.experiments.filter(e => e.status === 'ACTIVE').length
      const revenue = rev._sum.value || 0
      return {
        name: p.name,
        activeExperiments: activeExps,
        conversions: conv,
        revenue,
        topChannel: p.winningPatterns[0]?.channel,
        momentum: (conv > 0 ? 'up' : activeExps > 0 ? 'flat' : 'down') as 'up' | 'down' | 'flat',
        winningPatterns: p.winningPatterns.map(w => ({
          type: w.experimentType, angle: w.angle, channel: w.channel, conversionRate: w.conversionRate,
        })),
      }
    })
  )

  const brief = await generateDailyBrief({ products: productSummaries })

  const saved = await prisma.dailyBrief.upsert({
    where: { date: today },
    update: { content: brief.content, topFocus: brief.topFocus, actions: brief.actions as any },
    create: { date: today, content: brief.content, topFocus: brief.topFocus, actions: brief.actions as any },
  })

  return NextResponse.json(saved)
}
