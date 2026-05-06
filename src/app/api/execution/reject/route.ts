export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { rejectAction } from '@/lib/executor'

export async function POST(req: NextRequest) {
  const secret = process.env.ADMIN_SECRET
  if (secret && req.headers.get('x-admin-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { approvalId } = await req.json()
  await rejectAction(approvalId)
  return NextResponse.json({ rejected: true })
}
