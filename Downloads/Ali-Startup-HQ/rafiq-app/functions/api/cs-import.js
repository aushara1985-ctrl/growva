// POST {sid, filename, rows:[{n,p,d,s,dr}], ready, fixed, dup, mapping, omitted?, dry?} -> {id, received, valid, stored, rejected, duplicates, fixed, rounds, accepted:[rows], mismatch}   (demo session data only)
// GET ?sid=...  -> latest import summary for this demo session.
// HARNESS (migration safety): validate (required fields, KSA phone, dates, duplicates) -> auto-fix obvious issues -> re-validate (max 3 rounds)
// -> store ONLY valid rows -> read the stored copy back and compare the count with the valid source rows. No row is dropped silently:
// received = valid + duplicates + invalid, and the response lists every rejected row with its reason.
import { json, cleanSid, logQuality } from '../_lib/cs.js';
import { validateImport, verifyImport, IMPORT_MAX_ROWS } from '../_lib/harness.js';

export async function onRequestPost({ request, env }) {
  let b = {};
  try { b = await request.json(); } catch { return json({ error: 'bad_json' }, 400); }
  const sid = cleanSid(b.sid);
  if (!sid) return json({ error: 'no_sid' }, 400);
  const src = (Array.isArray(b.rows) ? b.rows : []).map(r => ({ n: String(r.n || '').slice(0, 60), p: String(r.p || '').slice(0, 20), d: String(r.d || '').slice(0, 12), s: String(r.s || '').slice(0, 40), dr: String(r.dr || '').slice(0, 40) }));
  if (!src.length) return json({ error: 'no_rows' }, 400);
  if (src.length > IMPORT_MAX_ROWS) return json({ error: 'too_many_rows', max: IMPORT_MAX_ROWS, received: src.length, reply: `الديمو يحفظ حتى ${IMPORT_MAX_ROWS} صف في المرة. الملف فيه ${src.length}: قسّمه، ولا ينحفظ شيء بدون ما تعرف.` }, 413);
  const v = validateImport(src);
  const report = {
    received: v.received, valid: v.valid.length, fixed: v.fixed, rounds: v.rounds,
    duplicates: v.duplicates.length, rejected: v.invalid.length,
    omitted: Math.max(0, Number(b.omitted) || 0), // rows the browser cut before sending (over the cap): reported, not hidden
    balanced: v.balanced,
    rejected_rows: v.invalid.slice(0, 50), duplicate_rows: v.duplicates.slice(0, 50),
  };
  if (b.dry) return json({ dry: true, ...report });
  if (!v.valid.length) { await logQuality(env, { sid, step: 'import', passed: false, reasons: ['no_valid_rows'], rounds: v.rounds }); return json({ error: 'no_valid_rows', ...report }, 422); }
  const accepted = v.valid.map(({ n, p, d, s, dr }) => ({ n, p, d, s, dr }));
  const id = 'imp' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const mapping = JSON.stringify(b.mapping || {}).slice(0, 400), fname = String(b.filename || '').slice(0, 80);
  let readBack = null;
  try {
    await env.DB.prepare('DELETE FROM cs_imports WHERE ts < ?').bind(Date.now() - 7 * 86400000).run(); // demo data never lingers
    try {
      await env.DB.prepare('INSERT INTO cs_imports (id,ts,sid,filename,ready,fixed,dup,mapping,rows,received,rejected,omitted) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
        .bind(id, Date.now(), sid, fname, accepted.length, v.fixed, v.duplicates.length, mapping, JSON.stringify(accepted), v.received, v.invalid.length, report.omitted).run();
    } catch { // migration 0003 not applied yet: store with the original columns
      await env.DB.prepare('INSERT INTO cs_imports (id,ts,sid,filename,ready,fixed,dup,mapping,rows) VALUES (?,?,?,?,?,?,?,?,?)')
        .bind(id, Date.now(), sid, fname, accepted.length, v.fixed, v.duplicates.length, mapping, JSON.stringify(accepted)).run();
    }
    const back = await env.DB.prepare('SELECT rows FROM cs_imports WHERE id=?').bind(id).first();
    try { readBack = back ? JSON.parse(back.rows) : null; } catch { readBack = null; }
  } catch (e) { await logQuality(env, { sid, step: 'import', passed: false, reasons: ['store_failed'], rounds: v.rounds }); return json({ error: 'store_failed', ...report }, 500); }
  const ver = verifyImport(accepted.length, readBack);
  const reasons = [];
  if (!ver.ok) reasons.push('count_mismatch');
  if (!v.balanced) reasons.push('unbalanced_report');
  await logQuality(env, { sid, step: 'import', passed: reasons.length === 0, reasons, rounds: v.rounds });
  return json({ id, stored: ver.stored, expected: ver.expected, mismatch: !ver.ok, accepted, ...report });
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
