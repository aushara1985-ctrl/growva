export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createCustomerPortalSession } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  const { userId } = await req.json()

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })

  if (!user?.stripeCustomerId) {
    return NextResponse.json({ error: 'No billing account found' }, { status: 404 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const session = await createCustomerPortalSession(user.stripeCustomerId, `${baseUrl}/dashboard`)

  return NextResponse.json({ url: session.url })
}
