// POST -> clears the session cookie (tokens are stateless and expire on their own; disable a clinic with clinics.active=0 to cut access at once).
import { clearCookie } from '../../_lib/auth.js';
export async function onRequestPost() {
  return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json', 'set-cookie': clearCookie() } });
}
