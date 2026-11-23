// POST (sendBeacon, text/plain) {sid, ref, page, events: [{name, props, ts}]}
import { guard } from '../_lib/ratelimit.js';
export async function onRequestPost({ request, env }) {
  const blocked = await guard(env, request, 'event', null);
  if (blocked) return blocked;
  if (Number(request.headers.get('content-length') || 0) > 64000) return new Response('too large', { status: 413 });
  let b = {};
  try { b = JSON.parse(await request.text()); } catch { return new Response('bad', { status: 400 }); }
  const evs = Array.isArray(b.events) ? b.events.slice(0, 50) : [];
  const ua = (request.headers.get('user-agent') || '').slice(0, 160);
  const stmt = env.DB.prepare('INSERT INTO events (ts,sid,ref,page,name,props,ua) VALUES (?,?,?,?,?,?,?)');
  const batch = evs.filter(e => e && e.name).map(e => stmt.bind(
    Number(e.ts) || Date.now(), String(b.sid || '').slice(0, 64), String(b.ref || '').slice(0, 64),
    String(b.page || '').slice(0, 40), String(e.name).slice(0, 60), JSON.stringify(e.props || {}).slice(0, 2000), ua));
  if (batch.length) { try { await env.DB.batch(batch); } catch {} }
  return new Response('ok');
}
