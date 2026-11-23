// Shared helpers for the "فريق نجاحك" endpoints. Same model chain as note.js.
export const MODELS = ['@cf/openai/gpt-oss-120b', '@cf/meta/llama-3.3-70b-instruct-fp8-fast'];
export const SESSION_HOURLY_LIMIT = 30;   // AI calls per demo session per hour
export const GLOBAL_DAILY_LIMIT = 3000;   // AI calls per day, whole demo

export function json(o, s = 200) { return new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8' } }); }

export function extractText(r) {
  if (!r) return '';
  if (typeof r === 'string') return r;
  if (typeof r.response === 'string') return r.response;
  if (r.response && typeof r.response === 'object') return JSON.stringify(r.response);
  if (typeof r.output_text === 'string') return r.output_text;
  if (Array.isArray(r.output)) {
    const parts = [];
    for (const o of r.output) if (o?.type === 'message') for (const c of o.content || []) if (c?.text) parts.push(c.text);
    if (parts.length) return parts.join('');
  }
  if (r.choices?.[0]?.message?.content) return r.choices[0].message.content;
  return JSON.stringify(r);
}
export function parseJson(s) {
  if (!s) return null;
  const a = s.indexOf('{'), z = s.lastIndexOf('}');
  if (a < 0 || z <= a) return null;
  try { return JSON.parse(s.slice(a, z + 1)); } catch { return null; }
}
async function runModel(env, model, instructions, user, maxTok) {
  if (model.includes('gpt-oss')) {
    const r = await env.AI.run(model, { instructions, input: user, reasoning: { effort: 'low' }, max_output_tokens: maxTok });
    return extractText(r);
  }
  const r = await env.AI.run(model, { messages: [{ role: 'system', content: instructions }, { role: 'user', content: user }], max_tokens: maxTok, temperature: 0.2 });
  return extractText(r);
}
// Returns {data, model, raw, err}. Tries each model until one returns parseable JSON passing `ok`.
export async function askJson(env, instructions, user, ok, maxTok = 1500) {
  let err = null, raw = '', model = '';
  for (const m of MODELS) {
    try {
      model = m;
      raw = await runModel(env, m, instructions, user, maxTok);
      const d = parseJson(raw);
      if (d && (!ok || ok(d))) return { data: d, model, raw, err: null };
      err = 'parse_failed';
    } catch (e) { err = String(e?.message || e).slice(0, 200); }
  }
  return { data: null, model, raw, err };
}

export function redact(s) {
  return String(s || '').replace(/[0-9٠-٩]{5,}/g, '#').replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]').slice(0, 220);
}
export async function ensureTables(env) {
  // Safety net if the migration was not applied yet; the migration file is the source of truth.
  await env.DB.batch([
    env.DB.prepare('CREATE TABLE IF NOT EXISTS cs_log (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, sid TEXT, kind TEXT, model TEXT, ok INTEGER, ms INTEGER, intent TEXT, action TEXT, screen TEXT, msg_redacted TEXT, reply TEXT, ticket_no TEXT, error TEXT)'),
  ]).catch(() => {});
}
export async function limited(env, sid) {
  try {
    const h = await env.DB.prepare('SELECT COUNT(*) c FROM cs_log WHERE sid=? AND ts>? AND kind != ?').bind(sid, Date.now() - 3600000, 'ticket').first();
    if ((h?.c || 0) >= SESSION_HOURLY_LIMIT) return 'session';
    const d = await env.DB.prepare('SELECT COUNT(*) c FROM cs_log WHERE ts>? AND kind != ?').bind(Date.now() - 86400000, 'ticket').first();
    if ((d?.c || 0) >= GLOBAL_DAILY_LIMIT) return 'global';
  } catch {}
  return '';
}
export async function logCall(env, o) {
  try {
    await env.DB.prepare('INSERT INTO cs_log (ts,sid,kind,model,ok,ms,intent,action,screen,msg_redacted,reply,ticket_no,error) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .bind(Date.now(), String(o.sid || '').slice(0, 64), o.kind, o.model || '', o.ok ? 1 : 0, o.ms || 0, o.intent || '', o.action || '', String(o.screen || '').slice(0, 30),
        redact(o.msg), String(o.reply || '').slice(0, 400), o.ticket || '', o.error ? String(o.error).slice(0, 200) : null).run();
  } catch {}
}
export function cleanSid(s) { return String(s || '').replace(/[^\w-]/g, '').slice(0, 64); }

export async function newTicket(env, { sid, urgency, topic, message, email, source }) {
  const ts = Date.now();
  const r = await env.DB.prepare('INSERT INTO cs_tickets (no,ts,sid,urgency,topic,message,email,source) VALUES (?,?,?,?,?,?,?,?)')
    .bind('', ts, sid, urgency === 'urgent' ? 'urgent' : 'normal', String(topic || '').slice(0, 120), redact2(message), String(email || '').slice(0, 120), source || 'chat').run();
  const id = r.meta?.last_row_id || ts % 100000;
  const no = 'RQ-' + String(1000 + id);
  await env.DB.prepare('UPDATE cs_tickets SET no=? WHERE id=?').bind(no, id).run();
  return no;
}
function redact2(s) { return String(s || '').slice(0, 1000); }
export const SLA = { urgent: 'خلال ٤ ساعات', normal: 'خلال ٢٤ ساعة' };
