export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { startOfDay, subDays } from 'date-fns'

export async function GET() {
  const today = startOfDay(new Date())
  const last7 = subDays(today, 7)

  const [products, recentDecisions, todayBrief] = await Promise.all([
    prisma.product.findMany({
      include: {
        experiments: { orderBy: { createdAt: 'desc' } },
        score: true,
        winningPatterns: { orderBy: { conversionRate: 'desc' }, take: 3 },
        _count: { select: { events: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.decision.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { product: true, experiment: true },
    }),
    prisma.dailyBrief.findUnique({ where: { date: today } }),
  ])

  // Per-product 7-day stats
  const productStats = await Promise.all(
    products.map(async p => {
      const [conv, rev] = await Promise.all([
        prisma.event.count({ where: { productId: p.id, type: 'SIGNUP', createdAt: { gte: last7 } } }),
        prisma.event.aggregate({ where: { productId: p.id, type: 'PURCHASE', createdAt: { gte: last7 } }, _sum: { value: true } }),
      ])
      return { id: p.id, conversions7d: conv, revenue7d: rev._sum.value || 0 }
    })
  )

  const now = new Date()
  const activeExperiments = products.reduce((s, p) =>
    s + p.experiments.filter(e => e.status === 'ACTIVE' || e.status === 'RUNNING').length, 0)
  const totalRevenue = productStats.reduce((s, p) => s + p.revenue7d, 0)
  const totalConversions = productStats.reduce((s, p) => s + p.conversions7d, 0)
  const scaledTotal = products.reduce((s, p) => s + p.experiments.filter(e => e.status === 'SCALED').length, 0)
  const killedTotal = products.reduce((s, p) => s + p.experiments.filter(e => e.status === 'KILLED').length, 0)

  // Daily chart last 7 days
  const dailyData = await Promise.all(
    Array.from({ length: 7 }, (_, i) => {
      const day = subDays(today, 6 - i)
      const next = subDays(today, 5 - i)
      return prisma.event.count({ where: { createdAt: { gte: day, lt: next } } })
        .then(count => ({ date: day.toISOString().split('T')[0], events: count }))
    })
  )

  const hasAnyEvents = dailyData.some(d => d.events > 0)

  return NextResponse.json({
    overview: { products: products.length, activeExperiments, totalRevenue, totalConversions, scaledTotal, killedTotal },
    productList: products.map(p => {
      const stats = productStats.find(s => s.id === p.id)
      const exps = p.experiments
      const pendingCount = exps.filter(e => e.status === 'PENDING').length
      const runningCount = exps.filter(e => e.status === 'RUNNING' || e.status === 'ACTIVE').length
      const decisionReadyCount = exps.filter(e =>
        (e.status === 'RUNNING' || e.status === 'ACTIVE') &&
        e.reviewDueAt != null && new Date(e.reviewDueAt) <= now
      ).length
      return {
        ...p,
        conversions7d: stats?.conversions7d || 0,
        revenue7d: stats?.revenue7d || 0,
        pendingCount,
        runningCount,
        decisionReadyCount,
      }
    }),
    recentDecisions,
    dailyData,
    hasAnyEvents,
    todayBrief,
  })
}
