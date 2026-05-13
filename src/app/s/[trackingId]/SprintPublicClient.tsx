'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  trackingId: string
  productName: string
  hypothesis: string
  targetAudience: string
  isClosed: boolean
}

// Stable anonymous visitor ID per browser session
function getVisitorId(): string {
  const key = 'gv_vid'
  let id = sessionStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem(key, id)
  }
  return id
}

async function recordEvent(trackingId: string, type: 'PAGE_VIEW' | 'SIGNUP', visitorId: string) {
  await fetch(`/api/s/${trackingId}/interest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, visitorId }),
  })
}

export default function SprintPublicClient({ trackingId, productName, hypothesis, targetAudience, isClosed }: Props) {
  const [state, setState] = useState<'idle' | 'done'>('idle')
  const recorded = useRef(false)

  // Fire PAGE_VIEW once on mount
  useEffect(() => {
    if (recorded.current) return
    recorded.current = true
    const vid = getVisitorId()
    recordEvent(trackingId, 'PAGE_VIEW', vid).catch(() => {})
  }, [trackingId])

  async function handleInterest() {
    const vid = getVisitorId()
    await recordEvent(trackingId, 'SIGNUP', vid).catch(() => {})
    setState('done')
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-5">
      <div className="w-full max-w-lg text-center">

        {/* Product label */}
        <div className="inline-block text-xs font-medium text-zinc-500 uppercase tracking-widest mb-8">
          {productName}
        </div>

        {/* Main hook — the hypothesis */}
        <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-5">
          {hypothesis}
        </h1>

        {/* Target audience */}
        {targetAudience && (
          <p className="text-zinc-400 text-base mb-10">
            Built for {targetAudience}.
          </p>
        )}

        {isClosed ? (
          <div className="text-zinc-500 text-sm">
            This offer is no longer available.
          </div>
        ) : state === 'done' ? (
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl px-8 py-8">
            <div className="text-3xl mb-3">✓</div>
            <div className="text-white font-semibold text-lg mb-2">Got it — you're on the list.</div>
            <div className="text-zinc-400 text-sm">The founder will be in touch soon.</div>
          </div>
        ) : (
          <div>
            <button
              onClick={handleInterest}
              className="inline-block bg-white text-black font-semibold px-8 py-4 rounded-xl
                         text-base hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              I&apos;m interested →
            </button>
            <p className="text-zinc-600 text-xs mt-4">No spam. Just a signal to the founder.</p>
          </div>
        )}
      </div>
    </div>
  )
}
