// Fixed-window rate limits in D1, per IP and per clinic. Keys hold a hash of the IP, never the address itself.
// The table is cleaned by purge.js. Login fails closed (DB error -> deny); everything else fails open.
import { sha256hex } from './auth.js';
export const LIMITS = {
  // bucket: {ip:[max, windowSec], clinic:[max, windowSec]}   ("clinic" = session clinic id; for login = the account being tried)
  note:       { ip: [30, 3600],  clinic: [40, 3600] },
  transcribe: { ip: [150, 3600], clinic: [200, 3600] },
  import:     { ip: [20, 3600],  clinic: [30, 3600] },   // cs-import + cs-map
  ask:        { ip: [120, 3600], clinic: [200, 3600] },
  health:     { ip: [60, 3600],  clinic: [60, 3600] },
  ticket:     { ip: [20, 3600],  clinic: [20, 3600] },
  share:      { ip: [60, 3600],  clinic: [60, 3600] },
  share_read: { ip: [120, 600] },
  login:      { ip: [10, 900],   clinic: [8, 900] },
  demo:       { ip: [20, 3600] },
  lead:       { ip: [10, 3600] },
  event:      { ip: [1200, 3600] },
  admin:      { ip: [30, 900] },
};
export function clientIp(request) { return request.headers.get('cf-connecting-ip') || (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown'; }

export async function hit(env, key, max, windowSec, now = Date.now()) {
  const win = Math.floor(now / (windowSec * 1000));
  const k = `${key}:${win}`;
  const r = await env.DB.prepare('INSERT INTO rate_limits (k,n,exp) VALUES (?,1,?) ON CONFLICT(k) DO UPDATE SET n=n+1 RETURNING n')
    .bind(k, (win + 2) * windowSec * 1000).first();
  const n = Number(r?.n || 0);
  return { ok: n <= max, n, retry: Math.max(1, Math.ceil(((win + 1) * windowSec * 1000 - now) / 1000)) };
}
// -> Response (429/503) when blocked, otherwise null.
export async function guard(env, request, bucket, who, { failClosed = false } = {}) {
  const L = LIMITS[bucket]; if (!L) return null;
  try {
    const ip = (await sha256hex(clientIp(request))).slice(0, 24);
    const checks = [['ip', ip]];
    if (L.clinic && who) checks.push(['clinic', (await sha256hex(String(who).toLowerCase())).slice(0, 24)]);
    for (const [kind, id] of checks) {
      const [max, win] = L[kind];
      const r = await hit(env, `${bucket}:${kind}:${id}`, max, win);
      if (!r.ok) return new Response(JSON.stringify({ error: 'rate_limited', scope: kind, retry_after: r.retry, reply: 'طلبات كثيرة. جرّب بعد شوي.' }),
        { status: 429, headers: { 'content-type': 'application/json; charset=utf-8', 'retry-after': String(r.retry) } });
    }
  } catch {
    if (failClosed) return new Response(JSON.stringify({ error: 'unavailable' }), { status: 503, headers: { 'content-type': 'application/json' } });
  }
  return null;
}
