export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createCheckoutSession, getOrCreateCustomer, PRICES } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  const { priceKey, email, userId, metadata } = await req.json()
  if (!priceKey || !email) return NextResponse.json({ error: 'Missing priceKey or email' }, { status: 400 })

  const priceId = PRICES[priceKey as keyof typeof PRICES]
  if (!priceId) return NextResponse.json({ error: 'Invalid price key' }, { status: 400 })

  const recurringKeys = ['GROWTH_MONTHLY', 'AI_CONTENT', 'WEEKLY_REVIEW']
  const mode = recurringKeys.includes(priceKey) ? 'subscription' : 'payment'
  const customer = await getOrCreateCustomer(email)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const session = await createCheckoutSession({
    priceId, mode, customerId: customer.id,
    metadata: { userId: userId || '', priceKey, ...metadata },
    successUrl: `${baseUrl}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${baseUrl}/pricing?canceled=true`,
  })

  return NextResponse.json({ url: session.url, sessionId: session.id })
}
