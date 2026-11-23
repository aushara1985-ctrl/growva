// GET /api/stats[?ref=dr1][&hours=72] with header x-admin-key: STATS_KEY (never in the URL)  -> what each visitor did, where they stopped, AI failures, leads.
import { adminOk } from '../_lib/auth.js';
import { guard } from '../_lib/ratelimit.js';
export async function onRequestGet({ request, env }) {
  const u = new URL(request.url);
  const blocked = await guard(env, request, 'admin', null);
  if (blocked) return blocked;
  if (!(await adminOk(request, env))) return new Response('forbidden', { status: 403 });
  const since = Date.now() - Number(u.searchParams.get('hours') || 168) * 3600000;
  const ref = u.searchParams.get('ref');
  const where = ref ? 'ts > ? AND ref = ?' : 'ts > ?';
  const args = ref ? [since, ref] : [since];
  const ev = (await env.DB.prepare(`SELECT ts,sid,ref,page,name,props,ua FROM events WHERE ${where} ORDER BY ts`).bind(...args).all()).results || [];
  const runs = (await env.DB.prepare(`SELECT ts,sid,ref,kind,specialty,ok,ms,input_chars,error FROM runs WHERE ${where} ORDER BY ts`).bind(...args).all()).results || [];
  const leads = (await env.DB.prepare('SELECT * FROM leads WHERE ts > ? ORDER BY ts DESC').bind(since).all()).results || [];
  const sessions = {};
  for (const e of ev) {
    const s = sessions[e.sid] ||= { sid: e.sid, ref: e.ref, ua: e.ua, first: e.ts, last: e.ts, steps: [], counts: {} };
    s.last = e.ts; s.counts[e.name] = (s.counts[e.name] || 0) + 1;
    s.steps.push(`${new Date(e.ts + 3 * 3600000).toISOString().slice(11, 19)} ${e.page}:${e.name} ${e.props && e.props !== '{}' ? e.props : ''}`.trim());
  }
  const list = Object.values(sessions).map(s => ({ ...s, minutes: Math.round((s.last - s.first) / 6000) / 10, last_step: s.steps[s.steps.length - 1] }));
  const funnel = ['page_view', 'demo_open', 'record_start', 'transcribe_ok', 'sample_used', 'note_ok', 'approve', 'followup_send', 'report_view', 'lead_submit'];
  const f = Object.fromEntries(funnel.map(n => [n, list.filter(s => s.counts[n]).length]));
  return new Response(JSON.stringify({ since: new Date(since).toISOString(), sessions: list.length, funnel: f, ai_runs: runs, leads, detail: list }, null, 1),
    { headers: { 'content-type': 'application/json; charset=utf-8' } });
}
