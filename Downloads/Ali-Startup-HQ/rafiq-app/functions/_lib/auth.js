// Session auth for every /api route that touches clinic or patient data.
// Token = v1.<payload>.<hmac-sha256>, payload {cid, kind:'demo'|'clinic', exp}. Sent as the HttpOnly cookie rq_session or as "Authorization: Bearer <token>".
// The clinic id used by EVERY query comes from this verified token, never from request bodies or query strings.
// kind 'demo'   -> cid 'demo_<random>', public sandbox, data expires after 7 days.
// kind 'clinic' -> cid 'c_<id>' from the clinics table (real data), only issued by /api/auth/login.
const enc = new TextEncoder();
export const DEMO_TTL_SEC = 7 * 86400;
export const CLINIC_TTL_SEC = 12 * 3600;
export const COOKIE = 'rq_session';

const b64u = (buf) => { let s = ''; for (const x of new Uint8Array(buf)) s += String.fromCharCode(x); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64u = (s) => { s = String(s).replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
const hmacKey = (secret, usage) => crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [usage]);

export async function sha256hex(s) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(String(s))))].map(x => x.toString(16).padStart(2, '0')).join(''); }
// constant-time string compare (both sides hashed first so the length does not leak)
export async function safeEqual(a, b) {
  const [x, y] = await Promise.all([sha256hex(a), sha256hex(b)]);
  let d = 0; for (let i = 0; i < x.length; i++) d |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return d === 0;
}

export function newDemoId() { return 'demo_' + [...crypto.getRandomValues(new Uint8Array(9))].map(x => x.toString(16).padStart(2, '0')).join(''); }
export const isDemoId = (cid) => /^demo_[a-z0-9]{6,40}$/.test(String(cid || ''));
export const isClinicId = (cid) => /^c_[a-z0-9]{6,40}$/.test(String(cid || ''));

export async function signSession(env, { cid, kind, ttlSec }) {
  if (!env.SESSION_SECRET) throw new Error('no_secret');
  const payload = b64u(enc.encode(JSON.stringify({ cid, kind, exp: Math.floor(Date.now() / 1000) + ttlSec })));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(env.SESSION_SECRET, 'sign'), enc.encode('v1.' + payload));
  return `v1.${payload}.${b64u(sig)}`;
}
export async function verifyToken(env, token) {
  try {
    if (!env.SESSION_SECRET || typeof token !== 'string') return null;
    const [v, p, s] = token.split('.');
    if (v !== 'v1' || !p || !s) return null;
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(env.SESSION_SECRET, 'verify'), unb64u(s), enc.encode(`v1.${p}`));
    if (!ok) return null;
    const d = JSON.parse(new TextDecoder().decode(unb64u(p)));
    if (!d || !Number.isFinite(d.exp) || d.exp * 1000 < Date.now()) return null;
    if (d.kind === 'demo' && isDemoId(d.cid)) return { cid: d.cid, kind: 'demo', exp: d.exp };
    if (d.kind === 'clinic' && isClinicId(d.cid)) return { cid: d.cid, kind: 'clinic', exp: d.exp };
    return null;
  } catch { return null; }
}
export function readToken(request) {
  const a = request.headers.get('authorization') || '';
  if (/^bearer /i.test(a)) return { token: a.slice(7).trim(), via: 'bearer' };
  const c = request.headers.get('cookie') || '';
  const m = c.match(new RegExp('(?:^|;\\s*)' + COOKIE + '=([^;]+)'));
  return m ? { token: m[1], via: 'cookie' } : { token: '', via: '' };
}
// -> {cid, kind, via} or null. Real clinics must still be active in the clinics table (a disabled clinic loses access at once).
export async function authenticate(request, env) {
  const { token, via } = readToken(request);
  if (!token) return null;
  const s = await verifyToken(env, token);
  if (!s) return null;
  if (s.kind === 'clinic') {
    const row = await env.DB.prepare('SELECT active FROM clinics WHERE id=?').bind(s.cid).first().catch(() => null);
    if (!row || !row.active) return null;
  }
  return { cid: s.cid, kind: s.kind, via };
}
export const sessionCookie = (token, ttlSec) => `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${ttlSec}`;
export const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

// ---- passwords (PBKDF2-SHA256, 100k iterations = the Workers maximum) ----
const ITER = 100000;
async function pbkdf2(password, salt) {
  const k = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITER }, k, 256);
}
export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${ITER}$${b64u(salt)}$${b64u(await pbkdf2(password, salt))}`;
}
export async function verifyPassword(password, stored) {
  try {
    const [t, it, s, h] = String(stored).split('$');
    if (t !== 'pbkdf2' || Number(it) !== ITER) return false;
    return await safeEqual(b64u(await pbkdf2(String(password), unb64u(s))), h);
  } catch { return false; }
}

// Admin endpoints (stats, ticket list): key in a header only, never in the URL (URLs end up in logs and history).
export async function adminOk(request, env) {
  if (!env.STATS_KEY) return false;
  const a = request.headers.get('authorization') || '';
  const k = request.headers.get('x-admin-key') || (/^bearer /i.test(a) ? a.slice(7).trim() : '');
  return !!k && await safeEqual(k, env.STATS_KEY);
}
