// Retention. Two triggers, same code:
//  1) LAZY (default, no extra deploy): functions/api/_middleware.js calls maybePurge() on requests; it runs at most once per hour (meta row).
//  2) WORKER CRON (guaranteed even with no traffic): workers/purge/ runs purgeExpired() daily at 03:00 UTC.
// Rules: visit transcripts / notes in `runs` are blanked after 30 days (the current code does not store them at all);
// demo data (clinic_id demo_*) is deleted after 7 days; shares expire after 30 days (demo 7); logs 30 days; ticket text removed after 90 days.
const DAY = 86400000;
export const RETENTION_DAYS = { transcripts: 30, demo: 7, shares: 30, imports: 90, tickets_text: 90, cs_log: 30, quality: 180, events: 90, runs: 90 };

export async function purgeExpired(env, now = Date.now()) {
  const R = RETENTION_DAYS, out = {};
  const run = async (name, sql, ...args) => { try { const r = await env.DB.prepare(sql).bind(...args).run(); out[name] = r.meta?.changes ?? 0; } catch (e) { out[name] = 'error'; } };
  await run('runs_scrubbed', 'UPDATE runs SET input_text=NULL, output_text=NULL WHERE ts<? AND (input_text IS NOT NULL OR output_text IS NOT NULL)', now - R.transcripts * DAY);
  await run('runs_deleted', 'DELETE FROM runs WHERE ts<?', now - R.runs * DAY);
  await run('shares', "DELETE FROM shares WHERE ts<? OR (COALESCE(clinic_id,'demo_') LIKE 'demo%' AND ts<?)", now - R.shares * DAY, now - R.demo * DAY);
  await run('imports_demo', "DELETE FROM cs_imports WHERE COALESCE(clinic_id,'demo_') LIKE 'demo%' AND ts<?", now - R.demo * DAY);
  await run('imports', 'DELETE FROM cs_imports WHERE ts<?', now - R.imports * DAY);
  await run('tickets_demo', "DELETE FROM cs_tickets WHERE COALESCE(clinic_id,'demo_') LIKE 'demo%' AND ts<?", now - R.demo * DAY);
  await run('tickets_text', "UPDATE cs_tickets SET message='[removed after retention]', email='' WHERE ts<? AND message<>'[removed after retention]'", now - R.tickets_text * DAY);
  await run('cs_log', 'DELETE FROM cs_log WHERE ts<?', now - R.cs_log * DAY);
  await run('cs_quality', 'DELETE FROM cs_quality WHERE ts<?', now - R.quality * DAY);
  await run('events', 'DELETE FROM events WHERE ts<?', now - R.events * DAY);
  await run('rate_limits', 'DELETE FROM rate_limits WHERE exp<?', now);
  return out;
}
// at most once per hour across all requests
export async function maybePurge(env, now = Date.now()) {
  try {
    const m = await env.DB.prepare("SELECT v FROM meta WHERE k='last_purge'").first();
    if (m && now - Number(m.v) < 3600000) return null;
    await env.DB.prepare("INSERT INTO meta (k,v) VALUES ('last_purge',?) ON CONFLICT(k) DO UPDATE SET v=excluded.v").bind(String(now)).run();
    return await purgeExpired(env, now);
  } catch { return null; }
}
