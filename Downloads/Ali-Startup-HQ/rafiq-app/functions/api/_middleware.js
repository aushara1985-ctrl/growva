// Default-deny gate for every /api route. A route is reachable without a clinic session ONLY if it is listed below.
// A new file under functions/api is therefore protected automatically until someone adds it here on purpose.
import { authenticate } from '../_lib/auth.js';
import { maybePurge } from '../_lib/purge.js';

// open routes carry no clinic or patient data (or are capability links, or do their own key check)
export const PUBLIC = new Set([
  'POST /api/auth/demo',    // issues a sandbox session (cid demo_*)
  'POST /api/auth/login',   // clinic login (rate limited per IP + per account)
  'POST /api/auth/logout',
  'POST /api/event',        // anonymous page analytics, write-only
  'POST /api/lead',         // website lead form, write-only
  'GET /api/share',         // patient QR page: unguessable id, expires (30 days, demo 7)
  'GET /api/stats',         // own check: admin key header
  'GET /api/cs-ticket',     // own check: admin key header
]);
const json = (o, s) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

export async function onRequest(ctx) {
  const { request, env, next } = ctx;
  if (!env.SESSION_SECRET) return json({ error: 'server_not_configured' }, 503); // fail closed
  if (ctx.waitUntil) ctx.waitUntil(maybePurge(env));
  const path = new URL(request.url).pathname.replace(/\/+$/, '');
  if (PUBLIC.has(`${request.method} ${path}`)) return next();
  const s = await authenticate(request, env);
  if (!s) return json({ error: 'auth_required' }, 401);
  // cookie sessions: reject cross-site state-changing requests (SameSite=Lax is the first line, this is the second)
  if (s.via === 'cookie' && request.method !== 'GET' && request.method !== 'HEAD') {
    const o = request.headers.get('origin');
    if (o) { let h = ''; try { h = new URL(o).host; } catch {} if (h !== new URL(request.url).host) return json({ error: 'bad_origin' }, 403); }
  }
  ctx.data = ctx.data || {}; ctx.data.session = s;
  return next();
}
