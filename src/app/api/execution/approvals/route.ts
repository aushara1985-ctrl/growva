export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getExecutionQueue } from '@/lib/executor'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const productId = searchParams.get('productId') || undefined
  const queue = await getExecutionQueue(productId)
  return NextResponse.json(queue)
}
