// POST {clinic, patient, specialty, summary, steps:[{when, what}], meds:[...], homework:[...], sid, ref} -> {id}
// GET ?id=... -> the patient page data. The patient scans a QR at the end of the visit and keeps their summary on their phone.
export async function onRequestPost({ request, env }) {
  let b = {};
  try { b = await request.json(); } catch { return json({ error: 'bad_json' }, 400); }
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS shares (id TEXT PRIMARY KEY, ts INTEGER, sid TEXT, body TEXT)').run();
  const id = [...crypto.getRandomValues(new Uint8Array(9))].map(x => 'abcdefghijkmnpqrstuvwxyz23456789'[x % 32]).join('');
  const body = JSON.stringify({
    clinic: String(b.clinic || '').slice(0, 80), patient: String(b.patient || '').slice(0, 80), specialty: String(b.specialty || '').slice(0, 40),
    summary: String(b.summary || '').slice(0, 3000), steps: (b.steps || []).slice(0, 12), meds: (b.meds || []).slice(0, 15), homework: (b.homework || []).slice(0, 12),
  });
  await env.DB.prepare('INSERT INTO shares (id,ts,sid,body) VALUES (?,?,?,?)').bind(id, Date.now(), String(b.sid || '').slice(0, 64), body).run();
  return json({ id });
}
export async function onRequestGet({ request, env }) {
  const id = new URL(request.url).searchParams.get('id') || '';
  if (!/^[a-z0-9]{6,20}$/.test(id)) return json({ error: 'bad_id' }, 400);
  const r = await env.DB.prepare('SELECT ts, body FROM shares WHERE id = ?').bind(id).first().catch(() => null);
  if (!r || Date.now() - r.ts > 30 * 86400000) return json({ error: 'not_found' }, 404);
  return json({ ...JSON.parse(r.body), ts: r.ts });
}
function json(o, s = 200) { return new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8' } }); }
