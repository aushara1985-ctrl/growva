export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { constructWebhookEvent } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  const payload = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event
  try {
    event = constructWebhookEvent(payload, signature)
  } catch (err) {
    console.error('[Webhook] Invalid signature:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  console.log(`[Webhook] ${event.type}`)

  try {
    switch (event.type) {

      // ─── ONE-TIME PAYMENT SUCCEEDED ────────────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as any
        const { userId, priceKey } = session.metadata || {}

        if (!userId || session.mode !== 'payment') break

        // Save purchase
        await prisma.purchase.create({
          data: {
            userId,
            stripePaymentId: session.payment_intent,
            type: priceKey === 'FOUNDING_ACCESS' ? 'FOUNDING_ACCESS'
              : priceKey === 'EXTRA_SLOT' ? 'EXTRA_SLOT'
              : priceKey === 'DONE_FOR_YOU' ? 'DONE_FOR_YOU'
              : 'AI_CONTENT_ENGINE',
            amount: session.amount_total,
            status: 'succeeded',
            metadata: session.metadata,
          },
        })

        // Update user plan/slots
        if (priceKey === 'FOUNDING_ACCESS') {
          await prisma.user.update({
            where: { id: userId },
            data: { plan: 'FOUNDING' },
          })
        }

        if (priceKey === 'EXTRA_SLOT') {
          await prisma.user.update({
            where: { id: userId },
            data: { productSlots: { increment: 1 } },
          })
        }

        break
      }

      // ─── SUBSCRIPTION CREATED / UPDATED ────────────────────────────────────
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as any

        const user = await prisma.user.findFirst({
          where: { stripeCustomerId: sub.customer },
        })

        if (!user) break

        await prisma.subscription.upsert({
          where: { stripeSubscriptionId: sub.id },
          update: {
            status: sub.status.toUpperCase(),
            currentPeriodStart: new Date(sub.current_period_start * 1000),
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
          },
          create: {
            userId: user.id,
            stripeSubscriptionId: sub.id,
            stripePriceId: sub.items.data[0]?.price.id || '',
            status: sub.status.toUpperCase(),
            currentPeriodStart: new Date(sub.current_period_start * 1000),
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
          },
        })

        // Upgrade user plan
        if (sub.status === 'active') {
          await prisma.user.update({
            where: { id: user.id },
            data: { plan: 'GROWTH', productSlots: 5 },
          })
        }

        break
      }

      // ─── SUBSCRIPTION CANCELED ─────────────────────────────────────────────
      case 'customer.subscription.deleted': {
        const sub = event.data.object as any

        const user = await prisma.user.findFirst({
          where: { stripeCustomerId: sub.customer },
        })

        if (!user) break

        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: { status: 'CANCELED' },
        })

        await prisma.user.update({
          where: { id: user.id },
          data: { plan: 'FREE', productSlots: 1 },
        })

        break
      }

      // ─── PAYMENT FAILED ────────────────────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as any
        console.warn('[Webhook] Payment failed for customer:', invoice.customer)
        break
      }
    }
  } catch (err) {
    console.error('[Webhook] Handler error:', err)
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

