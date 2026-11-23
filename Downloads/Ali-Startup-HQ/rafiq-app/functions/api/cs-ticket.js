// POST {message, email?, urgent?, topic?} -> {no, sla}   (the «كلّم إنسان» button)   session required
// POST {no, email}  -> attach an email to the session's own ticket
// GET  header x-admin-key (STATS_KEY) -> tickets for the team (answered by email within 24h, urgent within 4h; mailbox hala@boldapp.live)
import { json, newTicket, SLA } from '../_lib/cs.js';
import { guard } from '../_lib/ratelimit.js';
import { adminOk } from '../_lib/auth.js';

export async function onRequestPost({ request, env, data }) {
  const cid = data.session.cid; // NEVER from the client
  const blocked = await guard(env, request, 'ticket', cid);
  if (blocked) return blocked;
  let b = {};
  try { b = await request.json(); } catch { return json({ error: 'bad_json' }, 400); }
  const email = String(b.email || '').trim().slice(0, 120);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'bad_email', reply: 'الإيميل مو صحيح، تأكد منه.' }, 400);
  if (b.no) {
    const no = String(b.no).slice(0, 20);
    if (!/^RQ-\d+$/.test(no) || !email) return json({ error: 'bad_request' }, 400);
    const r = await env.DB.prepare('UPDATE cs_tickets SET email=? WHERE no=? AND clinic_id=?').bind(email, no, cid).run();
    return json({ ok: !!r.meta?.changes });
  }
  // light abuse guard: max 5 button tickets per session per day
  const c = await env.DB.prepare("SELECT COUNT(*) c FROM cs_tickets WHERE clinic_id=? AND ts>? AND source='button'").bind(cid, Date.now() - 86400000).first().catch(() => null);
  if ((c?.c || 0) >= 5) return json({ error: 'too_many', reply: 'فتحت ٥ تذاكر اليوم. فريقنا بيرد عليها، أو راسلنا على hala@boldapp.live.' }, 429);
  const message = String(b.message || '').trim().slice(0, 1000);
  if (message.length < 3) return json({ error: 'empty' }, 400);
  const urgency = b.urgent ? 'urgent' : 'normal';
  const no = await newTicket(env, { cid, urgency, topic: String(b.topic || 'طلب من زر كلّم إنسان'), message, email, source: 'button' });
  return json({ no, urgency, sla: SLA[urgency] });
}
export async function onRequestGet({ request, env }) {
  const blocked = await guard(env, request, 'admin', null);
  if (blocked) return blocked;
  if (!(await adminOk(request, env))) return new Response('forbidden', { status: 403 });
  const rows = (await env.DB.prepare('SELECT no,ts,clinic_id,urgency,topic,message,email,source,status FROM cs_tickets ORDER BY ts DESC LIMIT 100').all()).results || [];
  return json({ tickets: rows });
}
