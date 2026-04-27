import { stripe, PRICES } from '@/lib/stripe'
import { prisma } from '@/lib/db'

export interface InvoiceDraft {
  customerEmail: string
  customerName?: string
  plan?: string
  addOns?: string[]
  amount: number
  currency?: string
  notes?: string
}

// ─── CREATE DRAFT INVOICE ─────────────────────────────────────────────────────
export async function createDraftInvoice(data: InvoiceDraft) {
  const invoice = await prisma.invoiceRecord.create({
    data: {
      customerEmail: data.customerEmail,
      customerName: data.customerName,
      plan: data.plan,
      addOns: data.addOns || [],
      amount: data.amount,
      currency: data.currency || 'usd',
      status: 'draft',
      notes: data.notes,
    },
  })
  return invoice
}

// ─── DETECT BILLING OPPORTUNITIES ────────────────────────────────────────────
export async function detectBillingOpportunities() {
  const users = await prisma.user.findMany({
    include: {
      subscriptions: { where: { status: 'ACTIVE' } },
      purchases: true,
    },
    take: 100,
  })

  const opportunities = []

  for (const user of users) {
    const hasSub = user.subscriptions.length > 0
    const hasFounding = user.purchases.some(p => p.type === 'FOUNDING_ACCESS')
    const hasAiContent = user.purchases.some(p => p.type === 'AI_CONTENT_ENGINE')

    // Founding users who might want AI Content
    if (hasFounding && !hasAiContent) {
      const opp = await prisma.billingOpportunity.create({
        data: {
          userId: user.id,
          type: 'addon',
          description: `${user.email} has Founding Access but no AI Content Engine. High intent for content automation.`,
          potentialMrr: 29,
          probability: 0.4,
          status: 'open',
        },
      }).catch(() => null)
      if (opp) opportunities.push(opp)
    }

    // Free users who are active
    if (!hasSub && !hasFounding) {
      const opp = await prisma.billingOpportunity.create({
        data: {
          userId: user.id,
          type: 'upgrade',
          description: `${user.email} is on free plan. Upgrade to Founding Access ($199) or Growth ($99/mo).`,
          potentialMrr: 99,
          probability: 0.25,
          status: 'open',
        },
      }).catch(() => null)
      if (opp) opportunities.push(opp)
    }
  }

  return opportunities
}

// ─── RECOMMEND UPSELL ─────────────────────────────────────────────────────────
export async function recommendUpsell(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { purchases: true, subscriptions: true },
  })
  if (!user) return []

  const recommendations: string[] = []
  const hasFounding = user.purchases.some(p => p.type === 'FOUNDING_ACCESS')
  const hasAiContent = user.purchases.some(p => p.type === 'AI_CONTENT_ENGINE')
  const hasExtraSlot = user.purchases.some(p => p.type === 'EXTRA_SLOT')
  const hasGrowth = user.subscriptions.some(s => s.status === 'ACTIVE')

  if (!hasFounding && !hasGrowth) recommendations.push('Upgrade to Founding Access — $199 lifetime, locked forever')
  if (hasFounding && !hasAiContent) recommendations.push('Add AI Content Engine — $29/mo for auto-generated hooks and copy')
  if (hasFounding && !hasExtraSlot && user.productSlots <= 1) recommendations.push('Add Extra Product Slot — $49 one-time to add another product')

  return recommendations
}

export async function getBillingOpportunities(limit = 20) {
  return prisma.billingOpportunity.findMany({
    where: { status: 'open' },
    orderBy: { potentialMrr: 'desc' },
    take: limit,
  })
}
