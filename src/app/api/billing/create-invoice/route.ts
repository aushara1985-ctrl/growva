export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createDraftInvoice } from '@/lib/billing-executor'

export async function POST(req: NextRequest) {
  const data = await req.json()
  if (!data.customerEmail || !data.amount) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  const invoice = await createDraftInvoice(data)
  return NextResponse.json(invoice)
}
