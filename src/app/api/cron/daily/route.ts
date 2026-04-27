export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { runDailyGrowthLoop } from '@/lib/scheduler'

// POST /api/cron/daily
// Called by Railway cron job: 0 6 * * * (every day at 6 AM)
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await runDailyGrowthLoop()
    return NextResponse.json({ message: 'Growth loop completed', timestamp: new Date() })
  } catch (error) {
    console.error('[Cron] Error:', error)
    return NextResponse.json({ error: 'Loop failed' }, { status: 500 })
  }
}

// GET for manual trigger in dev
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Dev only' }, { status: 403 })
  }

  await runDailyGrowthLoop()
  return NextResponse.json({ message: 'Done' })
}
