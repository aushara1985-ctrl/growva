// POST {sid, filename, rows:[{n,p,d,s,dr}], ready, fixed, dup, mapping} -> {id}   (demo session data only)
// GET ?sid=...  -> latest import summary for this demo session.
import { json, cleanSid } from '../_lib/cs.js';

export async function onRequestPost({ request, env }) {
  let b = {};
  try { b = await request.json(); } catch { return json({ error: 'bad_json' }, 400); }
  const sid = cleanSid(b.sid);
  if (!sid) return json({ error: 'no_sid' }, 400);
  const rows = (Array.isArray(b.rows) ? b.rows : []).slice(0, 2000).map(r => ({ n: String(r.n || '').slice(0, 60), p: String(r.p || '').slice(0, 14), d: String(r.d || '').slice(0, 12), s: String(r.s || '').slice(0, 40), dr: String(r.dr || '').slice(0, 40) }));
  if (!rows.length) return json({ error: 'no_rows' }, 400);
  const id = 'imp' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  try {
    await env.DB.prepare('DELETE FROM cs_imports WHERE ts < ?').bind(Date.now() - 7 * 86400000).run(); // demo data never lingers
    await env.DB.prepare('INSERT INTO cs_imports (id,ts,sid,filename,ready,fixed,dup,mapping,rows) VALUES (?,?,?,?,?,?,?,?,?)')
      .bind(id, Date.now(), sid, String(b.filename || '').slice(0, 80), Number(b.ready) || rows.length, Number(b.fixed) || 0, Number(b.dup) || 0, JSON.stringify(b.mapping || {}).slice(0, 400), JSON.stringify(rows)).run();
  } catch (e) { return json({ error: 'store_failed' }, 500); }
  return json({ id, stored: rows.length });
}
export async function onRequestGet({ request, env }) {
  const u = new URL(request.url), sid = cleanSid(u.searchParams.get('sid'));
  const min = Date.now() - 7 * 86400000;
  if (u.searchParams.get('rows') === '1') {
    const r = sid ? await env.DB.prepare('SELECT id,ts,rows FROM cs_imports WHERE sid=? AND ts>? ORDER BY ts DESC LIMIT 1').bind(sid, min).first().catch(() => null) : null;
    let rows = []; try { rows = r ? JSON.parse(r.rows) : []; } catch {}
    return json({ id: r ? r.id : null, rows });
  }
  const r = sid ? await env.DB.prepare('SELECT id,ts,filename,ready,fixed,dup FROM cs_imports WHERE sid=? AND ts>? ORDER BY ts DESC LIMIT 1').bind(sid, min).first().catch(() => null) : null;
  return json({ latest: r || null });
}
