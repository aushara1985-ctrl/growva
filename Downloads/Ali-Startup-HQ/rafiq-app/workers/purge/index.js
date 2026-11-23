// Cron Worker (Pages has no cron): runs the retention purge daily at 03:00 UTC, even when nobody visits the site.
// Deploy: cd workers/purge && wrangler deploy      (binds the same D1 database rafiq-demo; no secrets needed)
import { purgeExpired } from '../../functions/_lib/purge.js';
export default {
  async scheduled(_event, env, ctx) { ctx.waitUntil(purgeExpired(env).then(r => console.log('purge', JSON.stringify(r)))); },
  async fetch() { return new Response('not found', { status: 404 }); },
};
