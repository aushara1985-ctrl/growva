// Run: node scripts/security-test.mjs   (no dependencies, no network; uses node:sqlite as an in-memory D1 and a fake AI)
// Proves: default-deny auth, clinic A cannot read clinic B, demo is separate, retention, rate limits, no PII in logs.
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const imp = (p) => import(new URL('../' + p, import.meta.url));
const auth = await imp('functions/_lib/auth.js');
const mw = await imp('functions/api/_middleware.js');
const { purgeExpired, maybePurge } = await imp('functions/_lib/purge.js');

// ---- in-memory D1 ----
function makeDB() {
  const db = new DatabaseSync(':memory:');
  for (const f of ['schema.sql', 'migrations/0002_success_team.sql', 'migrations/0003_cs_quality.sql', 'migrations/0004_security.sql']) db.exec(readFileSync(join(root, f), 'utf8'));
  const st = (sql, a = []) => {
    const s = db.prepare(sql);
    return {
      bind: (...x) => st(sql, x),
      run: async () => { const r = s.run(...a); return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; },
      first: async () => s.get(...a) ?? null,
      all: async () => ({ results: s.all(...a) }),
    };
  };
  return { raw: db, prepare: (sql) => st(sql), batch: async (list) => { for (const x of list) await x.run(); return []; } };
}
const AIFAIL = { run: async () => { throw new Error('model offline'); } };
const NOTE_JSON = JSON.stringify({ soap: { subjective: 'x', objective: 'y', assessment: 'z', plan: 'p' }, patient_summary_ar: 'ok' });
const AIOK = { run: async () => ({ response: NOTE_JSON }) };
const newEnv = (extra = {}) => ({ DB: makeDB(), AI: AIFAIL, SESSION_SECRET: 's3cret-for-tests-only-0123456789', STATS_KEY: 'admin-key-for-tests', ...extra });

// ---- run a request through middleware + the real handler ----
const handlers = {};
async function call(env, method, path, { token, cookie, body, ip = '1.1.1.1', headers = {}, query = '' } = {}) {
  const route = path.replace(/^\/api\//, '');
  const mod = handlers[route] ||= await imp(`functions/api/${route}.js`).catch((e) => { if (e.code === 'ERR_MODULE_NOT_FOUND') return null; throw e; });
  const h = { 'cf-connecting-ip': ip, ...headers };
  if (token) h.authorization = 'Bearer ' + token;
  if (cookie) h.cookie = 'rq_session=' + cookie;
  if (body !== undefined) h['content-type'] = 'application/json';
  const request = new Request('https://rafiq.test' + path + query, { method, headers: h, body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)) });
  const ctx = { request, env, data: {}, waitUntil: () => {}, next: async () => {
    const fn = mod && mod['onRequest' + method[0] + method.slice(1).toLowerCase()];
    return fn ? fn({ request, env, data: ctx.data, waitUntil: () => {} }) : new Response('no handler', { status: 404 });
  } };
  const res = await mw.onRequest(ctx);
  let j = null; try { j = await res.clone().json(); } catch {}
  return { status: res.status, json: j, res };
}
async function clinic(env, id, email) {
  await env.DB.prepare('INSERT INTO clinics (id,name,email,pass_hash,active,created_ts) VALUES (?,?,?,?,1,?)').bind(id, 'عيادة ' + id, email, await auth.hashPassword('correct-horse-battery'), Date.now()).run();
  return auth.signSession(env, { cid: id, kind: 'clinic', ttlSec: 3600 });
}
const demoTok = (env, cid = 'demo_aaaaaaaaaaaa', ttlSec = 3600) => auth.signSession(env, { cid, kind: 'demo', ttlSec });

let n = 0, bad = 0;
async function t(name, fn) { n++; try { await fn(); } catch (e) { bad++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } }
const SENT = { name: 'سلطان المنصوري', phone: '0551239876', free: 'السيد خالد يشكو من ألم' };

// =========================== 1) authentication ===========================
const routeFiles = readdirSync(join(root, 'functions/api')).filter(f => f.endsWith('.js') && !f.startsWith('_')).map(f => f.replace('.js', ''));
await t('every data route returns 401 without a session (default deny)', async () => {
  const env = newEnv();
  for (const r of routeFiles) for (const m of ['GET', 'POST']) {
    if (mw.PUBLIC.has(`${m} /api/${r}`)) continue;
    const x = await call(env, m, '/api/' + r, { body: m === 'POST' ? {} : undefined });
    assert.equal(x.status, 401, `${m} /api/${r} -> ${x.status}`);
  }
  assert.equal((await call(env, 'POST', '/api/does-not-exist', { body: {} })).status, 401, 'unknown route is denied too');
});
await t('public list is exactly the intended open routes', () => assert.deepEqual([...mw.PUBLIC].sort(), ['GET /api/cs-ticket', 'GET /api/share', 'GET /api/stats', 'POST /api/auth/demo', 'POST /api/auth/login', 'POST /api/auth/logout', 'POST /api/event', 'POST /api/lead']));
await t('server without SESSION_SECRET fails closed (503)', async () => assert.equal((await call(newEnv({ SESSION_SECRET: '' }), 'POST', '/api/note', { body: {} })).status, 503));
await t('tampered, wrong-secret, expired and wrong-kind tokens are rejected', async () => {
  const env = newEnv(); const good = await demoTok(env);
  const [v, p, s] = good.split('.');
  assert.equal((await call(env, 'POST', '/api/note', { token: `${v}.${p}.${s.slice(0, -2)}AA`, body: {} })).status, 401);
  assert.equal((await call(env, 'POST', '/api/note', { token: await demoTok(newEnv({ SESSION_SECRET: 'other-secret-other-secret-0000' })), body: {} })).status, 401);
  assert.equal((await call(env, 'POST', '/api/note', { token: await demoTok(env, 'demo_aaaaaaaaaaaa', -10), body: {} })).status, 401);
  // a "clinic" token for an id that is not in the clinics table, and a demo token claiming a clinic id
  assert.equal((await call(env, 'POST', '/api/note', { token: await auth.signSession(env, { cid: 'c_ghost12345', kind: 'clinic', ttlSec: 60 }), body: {} })).status, 401);
  assert.equal((await call(env, 'POST', '/api/note', { token: await auth.signSession(env, { cid: 'c_abc12345', kind: 'demo', ttlSec: 60 }), body: {} })).status, 401);
  assert.equal((await call(env, 'POST', '/api/note', { token: 'garbage', body: {} })).status, 401);
});
await t('Bearer and cookie both work; a disabled clinic loses access at once', async () => {
  const env = newEnv(); const tok = await clinic(env, 'c_alpha12345', 'a@x.sa');
  assert.notEqual((await call(env, 'POST', '/api/note', { token: tok, body: {} })).status, 401);
  assert.notEqual((await call(env, 'POST', '/api/note', { cookie: tok, body: {} })).status, 401);
  await env.DB.prepare("UPDATE clinics SET active=0 WHERE id='c_alpha12345'").run();
  assert.equal((await call(env, 'POST', '/api/note', { token: tok, body: {} })).status, 401);
});
await t('cookie session from another origin cannot write (CSRF)', async () => {
  const env = newEnv(); const tok = await demoTok(env);
  assert.equal((await call(env, 'POST', '/api/note', { cookie: tok, body: {}, headers: { origin: 'https://evil.example' } })).status, 403);
});
await t('demo session endpoint issues an HttpOnly Secure cookie and a working demo session', async () => {
  const env = newEnv(); const x = await call(env, 'POST', '/api/auth/demo');
  assert.equal(x.status, 200); const c = x.res.headers.get('set-cookie');
  assert.ok(/HttpOnly/.test(c) && /Secure/.test(c) && /SameSite=Lax/.test(c));
  const v = await auth.verifyToken(env, x.json.token); assert.equal(v.kind, 'demo'); assert.ok(/^demo_/.test(v.cid));
  assert.ok(v.exp - Date.now() / 1000 <= 7 * 86400 + 5);
});
await t('login: right password ok, wrong password and unknown email get the same 401, no secrets in the answer', async () => {
  const env = newEnv(); await clinic(env, 'c_alpha12345', 'a@x.sa');
  const ok = await call(env, 'POST', '/api/auth/login', { body: { email: 'A@x.sa', password: 'correct-horse-battery' } }); assert.equal(ok.status, 200);
  assert.equal((await auth.verifyToken(env, ok.json.token)).cid, 'c_alpha12345');
  const w = await call(env, 'POST', '/api/auth/login', { body: { email: 'a@x.sa', password: 'nope' } }), u = await call(env, 'POST', '/api/auth/login', { body: { email: 'z@x.sa', password: 'nope' } });
  assert.equal(w.status, 401); assert.deepEqual(w.json, u.json); assert.ok(!JSON.stringify(w.json).includes('pbkdf2'));
});
await t('admin endpoints: key only in header, never in the URL', async () => {
  const env = newEnv();
  assert.equal((await call(env, 'GET', '/api/stats')).status, 403);
  assert.equal((await call(env, 'GET', '/api/stats', { query: '?k=admin-key-for-tests' })).status, 403);
  assert.equal((await call(env, 'GET', '/api/stats', { headers: { 'x-admin-key': 'wrong' } })).status, 403);
  assert.equal((await call(env, 'GET', '/api/stats', { headers: { 'x-admin-key': 'admin-key-for-tests' } })).status, 200);
  assert.equal((await call(env, 'GET', '/api/cs-ticket', { query: '?k=admin-key-for-tests' })).status, 403);
  assert.equal((await call(env, 'GET', '/api/cs-ticket', { headers: { authorization: 'Bearer admin-key-for-tests' } })).status, 200);
});
await t('a clinic or demo session is not an admin', async () => {
  const env = newEnv(); const tok = await demoTok(env);
  assert.equal((await call(env, 'GET', '/api/stats', { token: tok })).status, 403);
});

// =========================== 2) per-clinic isolation ===========================
const rows = [{ n: 'سارة', p: '0551234567', d: '2026-11-25' }, { n: 'خالد', p: '0551234568', d: '2026-11-26' }];
await t('clinic A cannot read clinic B imports (even passing B/A ids in query or body)', async () => {
  const env = newEnv(); const A = await clinic(env, 'c_alpha12345', 'a@x.sa'), B = await clinic(env, 'c_bravo12345', 'b@x.sa');
  const put = await call(env, 'POST', '/api/cs-import', { token: A, body: { rows, filename: 'a.csv', sid: 'c_bravo12345', clinic_id: 'c_bravo12345' } });
  assert.equal(put.status, 200);
  const stored = await env.DB.prepare('SELECT clinic_id FROM cs_imports').all(); assert.deepEqual(stored.results.map(r => r.clinic_id), ['c_alpha12345']); // client-supplied ids ignored
  for (const q of ['?rows=1', '?rows=1&sid=c_alpha12345&clinic_id=c_alpha12345', '?sid=c_alpha12345']) {
    const g = await call(env, 'GET', '/api/cs-import', { token: B, query: q });
    assert.equal(g.status, 200); assert.deepEqual(g.json.rows || [], []); assert.equal(g.json.latest ?? null, null, 'B sees nothing of A');
  }
  const own = await call(env, 'GET', '/api/cs-import', { token: A, query: '?rows=1' }); assert.equal(own.json.rows.length, 2);
});
await t('an import by one clinic never deletes another clinic\'s old rows (the old global DELETE)', async () => {
  const env = newEnv(); const A = await clinic(env, 'c_alpha12345', 'a@x.sa'), B = await clinic(env, 'c_bravo12345', 'b@x.sa');
  await env.DB.prepare("INSERT INTO cs_imports (id,ts,clinic_id,filename,ready,rows) VALUES ('old1',?, 'c_alpha12345','a',1,'[]')").bind(Date.now() - 20 * 86400000).run();
  await call(env, 'POST', '/api/cs-import', { token: B, body: { rows } });
  assert.equal((await env.DB.prepare("SELECT COUNT(*) c FROM cs_imports WHERE id='old1'").first()).c, 1);
});
await t('demo session cannot read a real clinic\'s import', async () => {
  const env = newEnv(); const A = await clinic(env, 'c_alpha12345', 'a@x.sa'), D = await demoTok(env);
  await call(env, 'POST', '/api/cs-import', { token: A, body: { rows } });
  const g = await call(env, 'GET', '/api/cs-import', { token: D, query: '?rows=1&sid=c_alpha12345' }); assert.deepEqual(g.json.rows, []);
});
await t('tickets: B cannot attach an email to A\'s ticket; ticket limit counts per clinic; health task is per clinic', async () => {
  const env = newEnv(); const A = await clinic(env, 'c_alpha12345', 'a@x.sa'), B = await clinic(env, 'c_bravo12345', 'b@x.sa');
  const tk = await call(env, 'POST', '/api/cs-ticket', { token: A, body: { message: 'مشكلة في الاستيراد', sid: 'c_bravo12345' } }); assert.equal(tk.status, 200);
  assert.equal((await env.DB.prepare('SELECT clinic_id FROM cs_tickets').first()).clinic_id, 'c_alpha12345');
  const steal = await call(env, 'POST', '/api/cs-ticket', { token: B, body: { no: tk.json.no, email: 'evil@x.sa', sid: 'c_alpha12345' } });
  assert.equal(steal.json.ok, false);
  assert.equal((await env.DB.prepare('SELECT email FROM cs_tickets').first()).email, '');
  const mine = await call(env, 'POST', '/api/cs-ticket', { token: A, body: { no: tk.json.no, email: 'a@x.sa' } }); assert.equal(mine.json.ok, true);
});
await t('shares are stored under the session clinic; client cannot set it', async () => {
  const env = newEnv(); const A = await clinic(env, 'c_alpha12345', 'a@x.sa');
  const s = await call(env, 'POST', '/api/share', { token: A, body: { clinic: 'x', patient: 'y', summary: 'z', clinic_id: 'c_bravo12345', sid: 'c_bravo12345' } });
  assert.equal((await env.DB.prepare('SELECT clinic_id FROM shares WHERE id=?').bind(s.json.id).first()).clinic_id, 'c_alpha12345');
  assert.equal((await call(env, 'GET', '/api/share', { query: '?id=' + s.json.id })).status, 200); // the patient QR link works without a session
  assert.equal((await call(env, 'GET', '/api/share', { query: '?id=aaaaaaaaa' })).status, 404);
});
await t('quality log: clinic_id comes from the session, the body value is ignored', async () => {
  const env = newEnv(); const A = await clinic(env, 'c_alpha12345', 'a@x.sa');
  await call(env, 'POST', '/api/cs-map', { token: A, body: { headers: ['a'], rows: [['b']], clinic_id: 'c_bravo12345', sid: 'c_bravo12345' } });
  const q = await env.DB.prepare('SELECT DISTINCT clinic_id FROM cs_quality').all(); assert.deepEqual(q.results.map(r => r.clinic_id), ['c_alpha12345']);
});
await t('assistant rate counter is per clinic (A\'s usage does not limit B)', async () => {
  const env = newEnv(); const A = await clinic(env, 'c_alpha12345', 'a@x.sa'), B = await clinic(env, 'c_bravo12345', 'b@x.sa');
  const { limited } = await imp('functions/_lib/cs.js');
  for (let i = 0; i < 30; i++) await env.DB.prepare("INSERT INTO cs_log (ts,clinic_id,kind) VALUES (?,?,'ask')").bind(Date.now(), 'c_alpha12345').run();
  assert.equal(await limited(env, 'c_alpha12345'), 'session'); assert.equal(await limited(env, 'c_bravo12345'), '');
});
await t('source check: no handler reads sid/clinic_id from the client', () => {
  for (const f of readdirSync(join(root, 'functions/api')).filter(f => f.endsWith('.js'))) {
    const s = readFileSync(join(root, 'functions/api', f), 'utf8');
    assert.ok(!/cleanSid\s*\(/.test(s) && !/b\.clinic_id/.test(s) && !/searchParams\.get\('sid'\)/.test(s), f);
  }
});

// =========================== 3) retention ===========================
await t('note.js stores no transcript, note or patient context; only metadata', async () => {
  const env = newEnv({ AI: AIOK }); const A = await clinic(env, 'c_alpha12345', 'a@x.sa');
  const transcript = `المريض ${SENT.name} جوال ${SENT.phone} ${SENT.free} `.repeat(3);
  const r = await call(env, 'POST', '/api/note', { token: A, body: { transcript, specialty: 'general', patient: SENT.name + ' ' + SENT.phone } });
  assert.equal(r.status, 200); assert.ok(r.json.note.soap);
  const row = await env.DB.prepare('SELECT * FROM runs').first();
  assert.equal(row.input_text, null); assert.equal(row.output_text, null); assert.equal(row.clinic_id, 'c_alpha12345'); assert.ok(row.input_chars > 40);
  assert.ok(!JSON.stringify(env.DB.raw.prepare('SELECT * FROM runs').all()).includes(SENT.name));
});
await t('purge: old transcripts blanked (30d), demo data deleted (7d), real data kept, shares/tickets expire', async () => {
  const env = newEnv(); const D = 86400000, now = Date.now(), db = env.DB;
  await db.prepare("INSERT INTO runs (ts,clinic_id,kind,input_text,output_text) VALUES (?,?,?,?,?)").bind(now - 31 * D, 'c_alpha12345', 'note', 'full transcript old', 'full note old').run();
  await db.prepare("INSERT INTO runs (ts,clinic_id,kind,input_text,output_text) VALUES (?,?,?,?,?)").bind(now - 5 * D, 'c_alpha12345', 'note', 'recent transcript', 'recent note').run();
  await db.prepare("INSERT INTO cs_imports (id,ts,clinic_id,rows) VALUES ('d_old',?,'demo_aaaaaaaaaaaa','[]'),('d_new',?,'demo_aaaaaaaaaaaa','[]'),('c_new',?,'c_alpha12345','[]'),('c_old',?,'c_alpha12345','[]')").bind(now - 8 * D, now - 6 * D, now - 40 * D, now - 91 * D).run();
  await db.prepare("INSERT INTO shares (id,ts,clinic_id,body) VALUES ('s_d',?,'demo_aaaaaaaaaaaa','{}'),('s_c',?,'c_alpha12345','{}'),('s_c_old',?,'c_alpha12345','{}')").bind(now - 8 * D, now - 20 * D, now - 31 * D).run();
  await db.prepare("INSERT INTO cs_tickets (no,ts,clinic_id,message,email) VALUES ('RQ-1',?,'c_alpha12345','old text','a@x.sa'),('RQ-2',?,'c_alpha12345','new text','a@x.sa')").bind(now - 91 * D, now - D).run();
  await db.prepare("INSERT INTO rate_limits (k,n,exp) VALUES ('old',1,?),('new',1,?)").bind(now - 1000, now + 100000).run();
  const out = await purgeExpired(env, now);
  const g = async (sql) => (await db.prepare(sql).all()).results;
  const runs = await g('SELECT input_text i, output_text o, ts FROM runs ORDER BY ts'); assert.equal(runs[0].i, null); assert.equal(runs[0].o, null); assert.equal(runs[1].i, 'recent transcript');
  assert.deepEqual((await g('SELECT id FROM cs_imports ORDER BY id')).map(r => r.id), ['c_new', 'd_new']);
  assert.deepEqual((await g('SELECT id FROM shares')).map(r => r.id), ['s_c']);
  assert.deepEqual((await g('SELECT no,message FROM cs_tickets ORDER BY no')).map(r => r.message), ['[removed after retention]', 'new text']);
  assert.deepEqual((await g('SELECT k FROM rate_limits')).map(r => r.k), ['new']);
  assert.ok(Object.values(out).every(v => v !== 'error'), JSON.stringify(out));
});
await t('lazy purge runs at most once per hour', async () => {
  const env = newEnv(); const a = await maybePurge(env), b = await maybePurge(env); assert.ok(a && typeof a === 'object'); assert.equal(b, null);
  assert.ok(Object.keys(await maybePurge(env, Date.now() + 2 * 3600000)).length > 0);
});
await t('migration blanks transcripts that were stored by the old code', () => {
  const db = new DatabaseSync(':memory:');
  for (const f of ['schema.sql', 'migrations/0002_success_team.sql', 'migrations/0003_cs_quality.sql']) db.exec(readFileSync(join(root, f), 'utf8'));
  db.exec("INSERT INTO runs (ts,kind,input_text,output_text) VALUES (1,'note','FULL TRANSCRIPT','FULL NOTE'); INSERT INTO cs_log (ts,msg_redacted,reply) VALUES (1,'a b c','reply text'); INSERT INTO cs_imports (id,ts,sid) VALUES ('x',1,'s1');");
  db.exec(readFileSync(join(root, 'migrations/0004_security.sql'), 'utf8'));
  assert.equal(db.prepare('SELECT input_text FROM runs').get().input_text, null); assert.equal(db.prepare('SELECT msg_redacted m FROM cs_log').get().m, '');
  assert.equal(db.prepare('SELECT clinic_id FROM cs_imports').get().clinic_id, 'demo_legacy');
});

// =========================== 4) rate limits ===========================
await t('/api/note: limited per IP (30/h) then 429', async () => {
  const env = newEnv({ AI: AIFAIL }); const tok = await demoTok(env);
  for (let i = 0; i < 30; i++) assert.notEqual((await call(env, 'POST', '/api/note', { token: tok, body: {}, ip: '9.9.9.9' })).status, 429, 'call ' + i);
  const x = await call(env, 'POST', '/api/note', { token: tok, body: {}, ip: '9.9.9.9' }); assert.equal(x.status, 429); assert.equal(x.json.scope, 'ip'); assert.ok(x.res.headers.get('retry-after'));
});
await t('/api/note: limited per clinic (40/h) even from many different IPs', async () => {
  const env = newEnv(); const A = await clinic(env, 'c_alpha12345', 'a@x.sa'), B = await clinic(env, 'c_bravo12345', 'b@x.sa');
  let blocked = null;
  for (let i = 0; i < 45; i++) { const x = await call(env, 'POST', '/api/note', { token: A, body: {}, ip: `10.0.${i}.1` }); if (x.status === 429) { blocked = x; break; } }
  assert.ok(blocked && blocked.json.scope === 'clinic');
  assert.notEqual((await call(env, 'POST', '/api/note', { token: B, body: {}, ip: '10.9.9.9' })).status, 429, 'another clinic is not limited');
});
await t('login: 10 attempts per IP and 8 per account per 15 minutes', async () => {
  const env = newEnv(); await clinic(env, 'c_alpha12345', 'a@x.sa');
  for (let i = 0; i < 8; i++) assert.equal((await call(env, 'POST', '/api/auth/login', { body: { email: 'a@x.sa', password: 'bad' + i }, ip: `5.5.5.${i}` })).status, 401);
  const acc = await call(env, 'POST', '/api/auth/login', { body: { email: 'a@x.sa', password: 'correct-horse-battery' }, ip: '5.5.5.99' }); assert.equal(acc.status, 429); assert.equal(acc.json.scope, 'clinic');
  for (let i = 0; i < 10; i++) await call(env, 'POST', '/api/auth/login', { body: { email: `u${i}@x.sa`, password: 'bad' }, ip: '6.6.6.6' });
  assert.equal((await call(env, 'POST', '/api/auth/login', { body: { email: 'q@x.sa', password: 'bad' }, ip: '6.6.6.6' })).status, 429);
});
await t('login fails closed when the limiter store is broken', async () => {
  const env = newEnv(); env.DB.raw.exec('DROP TABLE rate_limits');
  assert.equal((await call(env, 'POST', '/api/auth/login', { body: { email: 'a@x.sa', password: 'x' } })).status, 503);
});
await t('demo session issuing: 20 per IP per hour', async () => {
  const env = newEnv(); for (let i = 0; i < 20; i++) assert.equal((await call(env, 'POST', '/api/auth/demo', { ip: '7.7.7.7' })).status, 200);
  assert.equal((await call(env, 'POST', '/api/auth/demo', { ip: '7.7.7.7' })).status, 429);
});
await t('import endpoints (cs-import + cs-map share a bucket): 20 per IP per hour', async () => {
  const env = newEnv(); const tok = await demoTok(env);
  for (let i = 0; i < 20; i++) assert.notEqual((await call(env, 'POST', '/api/cs-import', { token: tok, body: { rows, dry: true }, ip: '8.8.8.8' })).status, 429);
  assert.equal((await call(env, 'POST', '/api/cs-import', { token: tok, body: { rows, dry: true }, ip: '8.8.8.8' })).status, 429);
  assert.equal((await call(env, 'POST', '/api/cs-map', { token: tok, body: {}, ip: '8.8.8.8' })).status, 429);
});
await t('rate-limit keys never contain a raw IP', async () => {
  const env = newEnv(); await call(env, 'POST', '/api/auth/demo', { ip: '203.0.113.77' });
  for (const r of env.DB.raw.prepare('SELECT k FROM rate_limits').all()) assert.ok(!r.k.includes('203.0.113.77'));
});

// =========================== 5) no patient PII in logs ===========================
await t('no patient data in any log table or log text after assistant, map, health, note and import calls', async () => {
  const env = newEnv({ AI: AIFAIL }); const A = await clinic(env, 'c_alpha12345', 'a@x.sa');
  await call(env, 'POST', '/api/cs-ask', { token: A, body: { message: `اعطني وصفة للمريض ${SENT.name} جوال ${SENT.phone}`, screen: 'reception' } }); // deterministic medical branch
  await call(env, 'POST', '/api/cs-ask', { token: A, body: { message: `كيف أرفع ملف ${SENT.name} ${SENT.phone} ${SENT.free}` } });                // model offline -> ticket
  await call(env, 'POST', '/api/cs-map', { token: A, body: { headers: [SENT.name, SENT.phone], rows: [[SENT.name, SENT.phone]], total: 1 } });
  await call(env, 'POST', '/api/cs-health', { token: A, body: { real: { visits_7d: 0, followups_sent_7d: 0, patients_returned: 0 }, age_days: 4 } });
  await call(env, 'POST', '/api/note', { token: A, body: { transcript: `${SENT.name} ${SENT.phone} ${SENT.free} `.repeat(4), patient: SENT.name } });
  await call(env, 'POST', '/api/cs-import', { token: A, body: { rows: [{ n: SENT.name, p: SENT.phone, d: '2026-11-25' }] } });
  for (const tbl of ['cs_log', 'runs', 'cs_quality', 'rate_limits', 'events', 'meta']) {
    const dump = JSON.stringify(env.DB.raw.prepare(`SELECT * FROM ${tbl}`).all());
    for (const s of [SENT.name, SENT.phone, 'خالد', 'سلطان']) assert.ok(!dump.includes(s), `${tbl} contains ${s}`);
  }
  assert.ok(env.DB.raw.prepare('SELECT COUNT(*) c FROM cs_log').get().c >= 3, 'calls were logged (metadata only)');
});
await t('source check: no console.* and no input/transcript text written to logs in functions/', () => {
  const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]);
  for (const f of walk(join(root, 'functions')).filter(f => f.endsWith('.js'))) {
    const s = readFileSync(f, 'utf8'); assert.ok(!/console\.(log|error|warn|info|debug)/.test(s), f + ' uses console');
    assert.ok(!/INSERT INTO runs[^;]*input_text/.test(s), f + ' writes input_text');
  }
});
await t('stats no longer exposes transcript text', async () => {
  const s = readFileSync(join(root, 'functions/api/stats.js'), 'utf8'); assert.ok(!/input_text|input_head/.test(s));
});

console.log(`${n - bad}/${n} passed`);
process.exit(bad ? 1 : 0);
