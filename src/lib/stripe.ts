import Stripe from 'stripe'

// Server-side Stripe client
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
  typescript: true,
})

// ─── PRICE IDS ────────────────────────────────────────────────────────────────
// Set these in your Stripe dashboard then add to .env
export const PRICES = {
  FOUNDING_ACCESS: process.env.STRIPE_PRICE_FOUNDING!,    // $199 one-time
  GROWTH_MONTHLY:  process.env.STRIPE_PRICE_GROWTH!,      // $99/mo recurring
  EXTRA_SLOT:      process.env.STRIPE_PRICE_EXTRA_SLOT!,  // $49 one-time
  DONE_FOR_YOU:    process.env.STRIPE_PRICE_DFY!,         // $199 one-time
  AI_CONTENT:      process.env.STRIPE_PRICE_AI_CONTENT!,  // $29/mo recurring
  WEEKLY_REVIEW:   process.env.STRIPE_PRICE_WEEKLY!,      // $149/mo recurring
}

// ─── PRODUCT CATALOG ─────────────────────────────────────────────────────────
export const CATALOG = [
  {
    id: 'founding',
    name: 'Founding Access',
    description: '1 product · Lifetime access · First 1,000 only',
    price: 199,
    priceKey: 'FOUNDING_ACCESS',
    type: 'one_time' as const,
    badge: 'Most popular',
    features: ['1 product', 'Full decision engine', 'Daily AI briefs', 'Growth card generator', 'All future releases'],
  },
  {
    id: 'growth',
    name: 'Growth',
    description: 'Multiple products · Advanced automations',
    price: 99,
    priceKey: 'GROWTH_MONTHLY',
    type: 'recurring' as const,
    features: ['5 products', 'Autonomous daily loop', 'Winning patterns memory', 'Priority support', 'All releases'],
  },
]

export const ADDONS = [
  {
    id: 'extra_slot',
    name: 'Extra Product Slot',
    description: 'Add another product to your plan',
    price: 49,
    priceKey: 'EXTRA_SLOT',
    type: 'one_time' as const,
  },
  {
    id: 'done_for_you',
    name: 'Done-for-You Setup',
    description: 'We configure your first experiments',
    price: 199,
    priceKey: 'DONE_FOR_YOU',
    type: 'one_time' as const,
  },
  {
    id: 'ai_content',
    name: 'AI Content Engine',
    description: 'Auto-generate hooks, posts, campaign copy',
    price: 29,
    priceKey: 'AI_CONTENT',
    type: 'recurring' as const,
  },
  {
    id: 'weekly_review',
    name: 'Weekly Founder Review',
    description: '30-min growth call with a senior operator',
    price: 149,
    priceKey: 'WEEKLY_REVIEW',
    type: 'recurring' as const,
  },
]

// ─── HELPERS ─────────────────────────────────────────────────────────────────

export async function createCheckoutSession({
  priceId,
  mode,
  customerId,
  customerEmail,
  metadata,
  successUrl,
  cancelUrl,
}: {
  priceId: string
  mode: 'payment' | 'subscription'
  customerId?: string
  customerEmail?: string
  metadata?: Record<string, string>
  successUrl: string
  cancelUrl: string
}) {
  const session = await stripe.checkout.sessions.create({
    mode,
    line_items: [{ price: priceId, quantity: 1 }],
    ...(customerId ? { customer: customerId } : { customer_email: customerEmail }),
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: metadata || {},
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
  })
  return session
}

export async function createCustomerPortalSession(customerId: string, returnUrl: string) {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })
}

export async function getOrCreateCustomer(email: string, name?: string) {
  const existing = await stripe.customers.list({ email, limit: 1 })
  if (existing.data.length > 0) return existing.data[0]
  return stripe.customers.create({ email, name })
}

export function constructWebhookEvent(payload: string | Buffer, signature: string) {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  )
}
