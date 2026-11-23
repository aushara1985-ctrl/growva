// POST {clinic, patient, specialty, summary, steps:[{when, what}], meds:[...], homework:[...]} -> {id}   session required; stored under the session's clinic id
// GET ?id=... -> the patient page data. PUBLIC by design: the patient scans a QR at the end of the visit and keeps the summary on their phone.
//   Access = the unguessable id (9 chars of a 32-letter alphabet), no listing endpoint, rate limited per IP, expires after 30 days (demo 7), never cached.
import { guard } from '../_lib/ratelimit.js';

export async function onRequestPost({ request, env, data }) {
  const cid = data.session.cid;
  const blocked = await guard(env, request, 'share', cid);
  if (blocked) return blocked;
  let b = {};
  try { b = await request.json(); } catch { return json({ error: 'bad_json' }, 400); }
  const id = [...crypto.getRandomValues(new Uint8Array(9))].map(x => 'abcdefghijkmnpqrstuvwxyz23456789'[x % 32]).join('');
  const body = JSON.stringify({
    clinic: String(b.clinic || '').slice(0, 80), patient: String(b.patient || '').slice(0, 80), specialty: String(b.specialty || '').slice(0, 40),
    summary: String(b.summary || '').slice(0, 3000), steps: (Array.isArray(b.steps) ? b.steps : []).slice(0, 12), meds: (Array.isArray(b.meds) ? b.meds : []).slice(0, 15), homework: (Array.isArray(b.homework) ? b.homework : []).slice(0, 12),
  });
  await env.DB.prepare('INSERT INTO shares (id,ts,clinic_id,body) VALUES (?,?,?,?)').bind(id, Date.now(), cid, body).run();
  return json({ id });
}
export async function onRequestGet({ request, env }) {
  const blocked = await guard(env, request, 'share_read', null);
  if (blocked) return blocked;
  const id = new URL(request.url).searchParams.get('id') || '';
  if (!/^[a-z0-9]{6,20}$/.test(id)) return json({ error: 'bad_id' }, 400);
  const r = await env.DB.prepare('SELECT ts, clinic_id, body FROM shares WHERE id = ?').bind(id).first().catch(() => null);
  const days = r && String(r.clinic_id || 'demo_').startsWith('demo') ? 7 : 30;
  if (!r || Date.now() - r.ts > days * 86400000) return json({ error: 'not_found' }, 404);
  return json({ ...JSON.parse(r.body), ts: r.ts });
}
function json(o, s = 200) { return new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } }); }
