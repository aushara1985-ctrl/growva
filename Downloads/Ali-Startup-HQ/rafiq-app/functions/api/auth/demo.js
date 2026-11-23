// POST -> a sandbox session for the public demo: {ok, kind:'demo', expires_in}. Cookie rq_session (HttpOnly) + the same token in the body for Bearer use.
// Demo data lives under clinic id demo_* and is deleted after 7 days. It can never read a real clinic (c_*): ids come only from the signed token.
import { signSession, newDemoId, sessionCookie, DEMO_TTL_SEC } from '../../_lib/auth.js';
import { guard } from '../../_lib/ratelimit.js';

export async function onRequestPost({ request, env }) {
  const blocked = await guard(env, request, 'demo', null);
  if (blocked) return blocked;
  const token = await signSession(env, { cid: newDemoId(), kind: 'demo', ttlSec: DEMO_TTL_SEC });
  return new Response(JSON.stringify({ ok: true, kind: 'demo', expires_in: DEMO_TTL_SEC, token }), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'set-cookie': sessionCookie(token, DEMO_TTL_SEC) },
  });
}
