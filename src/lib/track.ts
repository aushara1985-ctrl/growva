// PostHog server-side events (EU). Public project key. Internal user id only: never an email, phone or name.
const KEY = 'phc_pkKbUEZAdwEa5BMM2rmq7qn374XuyJgoyhZYDsXELzYt'
const clean = (v: unknown, n = 80) => String(v ?? '').replace(/[^A-Za-z0-9_.:\-\/ ]/g, '').slice(0, n)

/** Reads the first-touch cookie (gv_attr, set on the first visit) into flat event properties. */
export function attrFromCookie(raw: string | undefined | null): Record<string, string> {
  let a: Record<string, unknown> = {}
  try { a = raw ? JSON.parse(decodeURIComponent(raw)) : {} } catch { a = {} }
  return {
    src: clean(a.utm_source) || clean(a.ref) || clean(a.referrer) || 'direct',
    first_utm_source: clean(a.utm_source),
    first_utm_medium: clean(a.utm_medium),
    first_utm_campaign: clean(a.utm_campaign),
    first_ref: clean(a.ref),
    first_referrer: clean(a.referrer),
  }
}

export async function capture(event: string, distinctId: string, props: Record<string, unknown>): Promise<void> {
  try {
    await fetch('https://eu.i.posthog.com/capture/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: KEY, event, distinct_id: distinctId, properties: { product: 'Growva', ...props } }),
      signal: AbortSignal.timeout(4000),
    })
  } catch { /* tracking never blocks a login */ }
}
