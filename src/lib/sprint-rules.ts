// Pure rules for sprint-mode verdict readiness. No server-only imports, so both the
// API route and the client page use the exact same thresholds.
// Real signals only: nothing here invents counts, denominators or time saved.

export const SPRINT_MIN_VIEWS = 300
export const SPRINT_MIN_SIGNUPS = 10
// Explicit band for early (window-closed, below-threshold) verdicts.
export const SPRINT_SCALE_BAR = 15 // 15+ real signals is the scale bar

export type SprintReadiness = 'insufficient' | 'early' | 'ready'

export const INSUFFICIENT_MSG_AR = 'بيانات غير كافية — كمّل'
export const INSUFFICIENT_MSG_EN = 'Not enough data — keep going'

export function sprintReadiness(input: {
  pageViews: number
  signups: number
  windowClosed: boolean
}): SprintReadiness {
  if (input.pageViews >= SPRINT_MIN_VIEWS || input.signups >= SPRINT_MIN_SIGNUPS) return 'ready'
  if (input.windowClosed) return 'early'
  return 'insufficient'
}

// Real signals = things that actually happened: tracked signups + replies and paid
// interest the founder entered. Views/clicks are volume, not intent.
export function realSignalCount(signups: number, replies = 0, paidInterest = 0): number {
  return Math.max(0, signups | 0) + Math.max(0, replies | 0) + Math.max(0, paidInterest | 0)
}

// Early verdict (window closed, thresholds not reached) — never SCALE, never a
// confident STOP unless there is literally zero signal:
//   0 signals      -> KILL (weak: nothing arrived)
//   1..5 signals   -> CONTINUE (weak, keep going)
//   6..14 signals  -> CONTINUE (promising, below the 15-signal scale bar)
//   15+ signals    -> CONTINUE (still below the 300-view / 10-signup sample bar)
export function earlyVerdict(signals: number): 'CONTINUE' | 'KILL' {
  return signals <= 0 ? 'KILL' : 'CONTINUE'
}
