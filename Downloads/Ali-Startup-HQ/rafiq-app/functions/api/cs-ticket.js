// POST {sid, message, email?, urgent?, topic?} -> {no, sla}   (the «كلّم إنسان» button)
// POST {no, sid, email}  -> attach an email to a ticket
// GET  ?k=STATS_KEY -> tickets for the team (answered by email within 24h, urgent within 4h; mailbox hala@boldapp.live)
import { json, cleanSid, newTicket, SLA } from '../_lib/cs.js';

export async function onRequestPost({ request, env }) {
  let b = {};
  try { b = await request.json(); } catch { return json({ error: 'bad_json' }, 400); }
  const sid = cleanSid(b.sid) || 'anon';
  const email = String(b.email || '').trim().slice(0, 120);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'bad_email', reply: 'الإيميل مو صحيح، تأكد منه.' }, 400);
  if (b.no) {
    const no = String(b.no).slice(0, 20);
    if (!/^RQ-\d+$/.test(no) || !email) return json({ error: 'bad_request' }, 400);
    const r = await env.DB.prepare('UPDATE cs_tickets SET email=? WHERE no=? AND sid=?').bind(email, no, sid).run();
    return json({ ok: !!r.meta?.changes });
  }
  // light abuse guard: max 5 button tickets per session per day
  const c = await env.DB.prepare("SELECT COUNT(*) c FROM cs_tickets WHERE sid=? AND ts>? AND source='button'").bind(sid, Date.now() - 86400000).first().catch(() => null);
  if ((c?.c || 0) >= 5) return json({ error: 'too_many', reply: 'فتحت ٥ تذاكر اليوم. فريقنا بيرد عليها، أو راسلنا على hala@boldapp.live.' }, 429);
  const message = String(b.message || '').trim().slice(0, 1000);
  if (message.length < 3) return json({ error: 'empty' }, 400);
  const urgency = b.urgent ? 'urgent' : 'normal';
  const no = await newTicket(env, { sid, urgency, topic: String(b.topic || 'طلب من زر كلّم إنسان'), message, email, source: 'button' });
  return json({ no, urgency, sla: SLA[urgency] });
}
export async function onRequestGet({ request, env }) {
  const u = new URL(request.url);
  if (!env.STATS_KEY || u.searchParams.get('k') !== env.STATS_KEY) return new Response('forbidden', { status: 403 });
  const rows = (await env.DB.prepare('SELECT no,ts,urgency,topic,message,email,source,status FROM cs_tickets ORDER BY ts DESC LIMIT 100').all()).results || [];
  return json({ tickets: rows });
}
