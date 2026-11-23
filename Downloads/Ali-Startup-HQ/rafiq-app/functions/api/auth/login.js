// POST {email, password} -> clinic session (cookie + token). Rate limited per IP and per account; the same answer for "no such clinic" and "wrong password".
import { signSession, verifyPassword, hashPassword, sessionCookie, CLINIC_TTL_SEC } from '../../_lib/auth.js';
import { guard } from '../../_lib/ratelimit.js';

let DUMMY = null; // so an unknown email costs the same time as a wrong password
export async function onRequestPost({ request, env }) {
  let b = {};
  try { b = await request.json(); } catch { return json({ error: 'bad_json' }, 400); }
  const email = String(b.email || '').trim().toLowerCase().slice(0, 120), password = String(b.password || '').slice(0, 200);
  const blocked = await guard(env, request, 'login', email || 'none', { failClosed: true });
  if (blocked) return blocked;
  if (!email || !password) return json({ error: 'bad_credentials' }, 401);
  const c = await env.DB.prepare('SELECT id, pass_hash, active FROM clinics WHERE email=?').bind(email).first().catch(() => null);
  let ok = false;
  if (c) ok = await verifyPassword(password, c.pass_hash) && !!c.active;
  else { DUMMY ||= await hashPassword('x'); await verifyPassword(password, DUMMY); }
  if (!ok) return json({ error: 'bad_credentials' }, 401);
  const token = await signSession(env, { cid: c.id, kind: 'clinic', ttlSec: CLINIC_TTL_SEC });
  return new Response(JSON.stringify({ ok: true, kind: 'clinic', expires_in: CLINIC_TTL_SEC, token }), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'set-cookie': sessionCookie(token, CLINIC_TTL_SEC) },
  });
}
function json(o, s = 200) { return new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } }); }
