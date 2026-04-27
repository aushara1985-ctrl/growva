export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { approveAction } from '@/lib/executor'

export async function POST(req: NextRequest) {
  const { approvalId } = await req.json()
  await approveAction(approvalId)
  return NextResponse.json({ approved: true })
}
