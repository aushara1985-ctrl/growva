export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { rejectAction } from '@/lib/executor'

export async function POST(req: NextRequest) {
  const { approvalId } = await req.json()
  await rejectAction(approvalId)
  return NextResponse.json({ rejected: true })
}
