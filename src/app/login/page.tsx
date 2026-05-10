'use client'

import { useState } from 'react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [devLink, setDevLink] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  // Show error from URL param (expired link, etc.)
  const urlError = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('error')
    : null

  const errorLabels: Record<string, string> = {
    missing_token: 'Invalid login link.',
    invalid_or_expired: 'This link has expired. Please request a new one.',
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setState('sending')
    setDevLink(null)
    setErrorMsg('')

    try {
      const res = await fetch('/api/auth/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.error || 'Something went wrong.')
        setState('error')
        return
      }

      setState('sent')

      // Fallback: show link if no email provider configured
      if (data.link) {
        setDevLink(data.link)
      }
    } catch {
      setErrorMsg('Network error. Please try again.')
      setState('error')
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="text-2xl font-bold text-white tracking-tight">Growva</div>
          <div className="text-zinc-500 text-sm mt-1">Validation engine for solo founders</div>
        </div>

        {/* Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          {state === 'sent' ? (
            <div className="text-center">
              <div className="text-3xl mb-4">📬</div>
              <h2 className="text-white font-semibold text-lg mb-2">Check your email</h2>
              <p className="text-zinc-400 text-sm">
                We sent a login link to <span className="text-white">{email}</span>.
                It expires in 15 minutes.
              </p>

              {/* Dev fallback: show link inline */}
              {devLink && (
                <div className="mt-6 text-left">
                  <div className="text-zinc-500 text-xs mb-2 uppercase tracking-wide">Dev mode — no email provider</div>
                  <a
                    href={devLink}
                    className="block text-xs text-indigo-400 break-all hover:text-indigo-300 underline"
                  >
                    {devLink}
                  </a>
                </div>
              )}

              <button
                onClick={() => { setState('idle'); setDevLink(null) }}
                className="mt-6 text-zinc-500 text-sm hover:text-zinc-300 transition-colors"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-white font-semibold text-lg mb-1">Log in</h2>
              <p className="text-zinc-500 text-sm mb-6">
                Enter your email and we&apos;ll send you a magic link.
              </p>

              {(urlError || state === 'error') && (
                <div className="bg-red-950/50 border border-red-800 rounded-lg px-4 py-3 mb-5 text-red-400 text-sm">
                  {urlError ? (errorLabels[urlError] ?? 'Invalid login link.') : errorMsg}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3
                             text-white placeholder-zinc-500 text-sm
                             focus:outline-none focus:ring-2 focus:ring-white/20
                             transition-all"
                />
                <button
                  type="submit"
                  disabled={state === 'sending'}
                  className="w-full bg-white text-black font-semibold py-3 rounded-lg text-sm
                             hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {state === 'sending' ? 'Sending…' : 'Send login link'}
                </button>
              </form>

              <p className="text-zinc-600 text-xs text-center mt-5">
                No password needed. No spam. Just a link.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
