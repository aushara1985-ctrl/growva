export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getMonopolyStatus } from '@/lib/monopoly'
import { getBillingOpportunities } from '@/lib/billing-executor'

function requireAdmin(req: NextRequest): NextResponse | null {
  const secret = process.env.ADMIN_SECRET
  if (secret && req.headers.get('x-admin-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

export async function GET(req: NextRequest) {
  const deny = requireAdmin(req)
  if (deny) return deny
  const [
    totalUsers, totalProducts, totalExperiments, totalBuildTickets,
    pendingApprovals, recentActions, topFeatures,
    competitorSignals, billingOpportunities, monopolyStatus,
    signups7d, activatedUsers, recentDecisions,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.product.count(),
    prisma.experiment.count(),
    prisma.buildTicket.count(),
    prisma.executionApproval.count({ where: { status: 'pending' } }),
    prisma.executionActionLog.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
    prisma.featureRequest.findMany({ where: { status: { not: 'rejected' } }, orderBy: { opportunityScore: 'desc' }, take: 5 }),
    prisma.competitorSignal.findMany({ orderBy: { monopolyRelevanceScore: 'desc' }, take: 5 }),
    getBillingOpportunities(5),
    getMonopolyStatus(),
    prisma.user.count({ where: { createdAt: { gte: new Date(Date.now() - 7*24*60*60*1000) } } }),
    prisma.experiment.count({ where: { createdAt: { gte: new Date(Date.now() - 24*60*60*1000) } } }),
    prisma.decision.findMany({ orderBy: { createdAt: 'desc' }, take: 5, include: { experiment: { include: { product: true } } } }),
  ])

  // Activation = users who saw at least one decision
  const usersWithDecisions = await prisma.decision.groupBy({ by: ['productId'], _count: true })

  return NextResponse.json({
    overview: {
      totalUsers, totalProducts, totalExperiments, totalBuildTickets,
      pendingApprovals, signups7d,
      activatedProducts: usersWithDecisions.length,
    },
    executionQueue: { pending: pendingApprovals, recentActions },
    featureDemand: topFeatures,
    competitorGaps: competitorSignals,
    billingOpportunities,
    monopolyStatus,
    recentDecisions,
  })
}
