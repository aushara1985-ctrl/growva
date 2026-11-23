// POST {name, clinic, city, specialty, phone, doctors, note, sid, ref}
export async function onRequestPost({ request, env }) {
  let b = {};
  try { b = await request.json(); } catch { return json({ ok: false }, 400); }
  const s = (k, n = 120) => String(b[k] || '').trim().slice(0, n);
  if (!s('name') || !s('phone')) return json({ ok: false, error: 'missing' }, 400);
  await env.DB.prepare('INSERT INTO leads (ts,sid,ref,name,clinic,city,specialty,phone,doctors,note) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .bind(Date.now(), s('sid', 64), s('ref', 64), s('name'), s('clinic'), s('city'), s('specialty'), s('phone', 40), s('doctors', 20), s('note', 1000)).run();
  return json({ ok: true });
}
function json(o, s = 200) { return new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json' } }); }
