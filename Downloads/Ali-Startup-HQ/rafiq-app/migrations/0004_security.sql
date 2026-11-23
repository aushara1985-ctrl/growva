-- 0004 security P0 (2026-11-23). Apply BEFORE deploying the matching code:
--   wrangler d1 execute rafiq-demo --remote --file=migrations/0004_security.sql
-- Run it ONCE (the ALTERs are not idempotent). Use execute, not `migrations apply`: 0001-0003 were not tracked as applied migrations.
-- Real clinics (c_*) vs the public demo (demo_*), per-clinic isolation, rate limits, retention bookkeeping.

CREATE TABLE IF NOT EXISTS clinics (
  id TEXT PRIMARY KEY,                 -- 'c_' + lowercase letters/digits
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,          -- login, stored lowercase
  pass_hash TEXT NOT NULL,             -- pbkdf2$100000$salt$hash (scripts/create-clinic-sql.mjs)
  active INTEGER NOT NULL DEFAULT 1,   -- 0 = access cut immediately
  created_ts INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS rate_limits (k TEXT PRIMARY KEY, n INTEGER NOT NULL, exp INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS rate_limits_exp ON rate_limits(exp);
CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT);

-- shares used to be created lazily inside share.js; it is now created here
CREATE TABLE IF NOT EXISTS shares (id TEXT PRIMARY KEY, ts INTEGER, sid TEXT, body TEXT);

-- every clinic/patient-data table gets clinic_id (taken from the verified session, never from the client)
ALTER TABLE shares ADD COLUMN clinic_id TEXT;
ALTER TABLE cs_imports ADD COLUMN clinic_id TEXT;
ALTER TABLE cs_tickets ADD COLUMN clinic_id TEXT;
ALTER TABLE cs_log ADD COLUMN clinic_id TEXT;
ALTER TABLE runs ADD COLUMN clinic_id TEXT;
CREATE INDEX IF NOT EXISTS shares_clinic ON shares(clinic_id, ts);
CREATE INDEX IF NOT EXISTS cs_imp_clinic ON cs_imports(clinic_id, ts);
CREATE INDEX IF NOT EXISTS cs_tk_clinic ON cs_tickets(clinic_id, ts);
CREATE INDEX IF NOT EXISTS cs_log_clinic_ts ON cs_log(clinic_id, ts);
CREATE INDEX IF NOT EXISTS runs_ts ON runs(ts);

-- old rows came from anonymous browser session ids: they become unreachable legacy demo data and are purged after 7 days
UPDATE shares SET clinic_id='demo_legacy' WHERE clinic_id IS NULL;
UPDATE cs_imports SET clinic_id='demo_legacy' WHERE clinic_id IS NULL;
UPDATE cs_tickets SET clinic_id='demo_legacy' WHERE clinic_id IS NULL;
UPDATE cs_log SET clinic_id='demo_legacy' WHERE clinic_id IS NULL;
UPDATE runs SET clinic_id='demo_legacy' WHERE clinic_id IS NULL;
UPDATE cs_quality SET clinic_id='demo_legacy' WHERE clinic_id IS NOT NULL AND clinic_id NOT LIKE 'demo_%' AND clinic_id NOT LIKE 'c_%';

-- retention: the new code no longer stores visit transcripts or notes; blank every one already stored, and the old assistant log text
UPDATE runs SET input_text=NULL, output_text=NULL WHERE input_text IS NOT NULL OR output_text IS NOT NULL;
UPDATE cs_log SET msg_redacted='', reply='' WHERE msg_redacted<>'' OR reply<>'';
