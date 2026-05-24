'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

// ─── copy ──────────────────────────────────────────────────────────────────────
const COPY = {
  en: {
    logoSub: 'Validation engine for solo founders',
    title: 'Start your first experiment.',
    subtitle: "Enter your email and we’ll send you a secure magic link to open Growva.",
    note: 'No password. Private beta access.',
    placeholder: 'you@example.com',
    btnIdle: 'Send magic link',
    btnSending: 'Sending…',
    sentTitle: 'Check your email.',
    sentBody: (email: string) => `We sent a secure login link to ${email}. It expires in 15 minutes.`,
    diffEmail: 'Use a different email',
    devBoxTitle: 'Development login link',
    devBoxBody: 'Email sending is not configured yet. For beta testing, use this temporary login link.',
    devBtn: 'Open magic link',
    devCopy: 'Copy link',
    devCopied: 'Copied!',
    devWarn: 'Only visible in development / beta mode.',
    errors: {
      missing_token: 'Invalid login link.',
      invalid_or_expired: 'This link has expired. Please request a new one.',
    } as Record<string, string>,
  },
  ar: {
    logoSub: 'محرك التحقق للمؤسسين المستقلين',
    title: 'ابدأ أول تجربة.',
    subtitle: 'أدخل بريدك وسنرسل لك رابط دخول آمن لفتح Growva.',
    note: 'بدون كلمة مرور. وصول بيتا خاص.',
    placeholder: 'بريدك الإلكتروني',
    btnIdle: 'أرسل رابط الدخول',
    btnSending: 'جارٍ الإرسال…',
    sentTitle: 'تحقق من بريدك.',
    sentBody: (email: string) => `أرسلنا رابط دخول آمن إلى ${email}. ينتهي خلال 15 دقيقة.`,
    diffEmail: 'استخدم بريدًا آخر',
    devBoxTitle: 'رابط دخول للتطوير',
    devBoxBody: 'إرسال البريد غير مُهيأ بعد. للاختبار، استخدم هذا الرابط المؤقت.',
    devBtn: 'فتح الرابط',
    devCopy: 'نسخ الرابط',
    devCopied: 'تم النسخ!',
    devWarn: 'مرئي فقط في وضع التطوير / البيتا.',
    errors: {
      missing_token: 'رابط تسجيل الدخول غير صالح.',
      invalid_or_expired: 'انتهت صلاحية هذا الرابط. يرجى طلب رابط جديد.',
    } as Record<string, string>,
  },
}

// ─── inner component (needs useSearchParams) ──────────────────────────────────
function LoginInner() {
  const searchParams = useSearchParams()
  const urlError = searchParams.get('error')
  const from = searchParams.get('from') ?? '/dashboard'

  const [lang, setLang] = useState<'en' | 'ar'>('en')
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [devLink, setDevLink] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [copied, setCopied] = useState(false)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const t = COPY[lang]
  const isRTL = lang === 'ar'

  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current) }, [])

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
        body: JSON.stringify({ email: email.trim(), from }),
      })
      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.error || 'Something went wrong.')
        setState('error')
        return
      }

      setState('sent')
      if (data.link) setDevLink(data.link)
    } catch {
      setErrorMsg('Network error. Please try again.')
      setState('error')
    }
  }

  async function handleCopyLink() {
    if (!devLink) return
    try {
      await navigator.clipboard.writeText(devLink)
      setCopied(true)
      copyTimer.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: select input
    }
  }

  return (
    <div
      className="min-h-screen bg-[#09090B] flex flex-col items-center justify-center px-4 py-16"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* ── Logo ── */}
      <div className="text-center mb-10">
        <div className="text-2xl font-bold text-white tracking-tight">Growva</div>
        <div className="text-zinc-500 text-sm mt-1">{t.logoSub}</div>
      </div>

      {/* ── Card ── */}
      <div className="w-full max-w-sm">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">

          {/* ── Sent state ── */}
          {state === 'sent' ? (
            <div className="text-center">
              {/* Checkmark icon */}
              <div className="mx-auto mb-5 w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700
                              flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5"
                     viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h2 className="text-white font-semibold text-lg mb-2">{t.sentTitle}</h2>
              <p className="text-zinc-400 text-sm leading-relaxed">
                {t.sentBody('')
                  .split(email)
                  .reduce<React.ReactNode[]>((acc, part, i, arr) => {
                    acc.push(part)
                    if (i < arr.length - 1)
                      acc.push(<span key={i} className="text-white font-medium">{email}</span>)
                    return acc
                  }, [])}
              </p>

              {/* Dev fallback box */}
              {devLink && (
                <div className="mt-6 text-left bg-amber-950/30 border border-amber-800/50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                    <span className="text-amber-400 text-xs font-semibold uppercase tracking-wide">
                      {t.devBoxTitle}
                    </span>
                  </div>
                  <p className="text-zinc-400 text-xs leading-relaxed mb-4">{t.devBoxBody}</p>
                  <div className="flex gap-2">
                    <a
                      href={devLink}
                      className="flex-1 bg-white text-black text-xs font-semibold py-2.5 rounded-lg
                                 hover:bg-zinc-100 transition-colors text-center"
                    >
                      {t.devBtn}
                    </a>
                    <button
                      onClick={handleCopyLink}
                      className="px-3 py-2.5 bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs
                                 font-medium rounded-lg hover:bg-zinc-700 hover:text-white transition-colors
                                 whitespace-nowrap"
                    >
                      {copied ? t.devCopied : t.devCopy}
                    </button>
                  </div>
                  <p className="text-zinc-600 text-xs mt-3">{t.devWarn}</p>
                </div>
              )}

              <button
                onClick={() => { setState('idle'); setDevLink(null) }}
                className="mt-6 text-zinc-500 text-sm hover:text-zinc-300 transition-colors"
              >
                {t.diffEmail}
              </button>
            </div>

          ) : (
            /* ── Idle / sending / error state ── */
            <>
              <h2 className="text-white font-semibold text-xl mb-2 leading-snug">{t.title}</h2>
              <p className="text-zinc-400 text-sm mb-6 leading-relaxed">{t.subtitle}</p>

              {/* URL-based error (expired link redirect) */}
              {urlError && (
                <div className="bg-red-950/40 border border-red-800/60 rounded-lg px-4 py-3 mb-5
                                text-red-400 text-sm">
                  {t.errors[urlError] ?? 'Invalid login link.'}
                </div>
              )}

              {/* Submit error */}
              {state === 'error' && errorMsg && (
                <div className="bg-red-950/40 border border-red-800/60 rounded-lg px-4 py-3 mb-5
                                text-red-400 text-sm">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="email"
                  placeholder={t.placeholder}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3
                             text-white placeholder-zinc-500 text-sm
                             focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-zinc-600
                             transition-all"
                />
                <button
                  type="submit"
                  disabled={state === 'sending'}
                  className="w-full bg-white text-black font-semibold py-3 rounded-lg text-sm
                             hover:bg-zinc-100 active:scale-[0.99] transition-all
                             disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {state === 'sending' ? t.btnSending : t.btnIdle}
                </button>
              </form>

              <p className="text-zinc-600 text-xs text-center mt-5">{t.note}</p>
            </>
          )}
        </div>

        {/* ── Language toggle ── */}
        <div className="flex justify-center mt-6">
          <button
            onClick={() => setLang(l => l === 'en' ? 'ar' : 'en')}
            className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors px-3 py-1.5
                       border border-zinc-800 rounded-full hover:border-zinc-700"
          >
            {lang === 'en' ? 'ع' : 'EN'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── exported page (wraps in Suspense for useSearchParams) ────────────────────
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
      </div>
    }>
      <LoginInner />
    </Suspense>
  )
}
