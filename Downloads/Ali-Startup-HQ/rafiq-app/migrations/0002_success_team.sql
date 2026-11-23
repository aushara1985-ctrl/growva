-- Rafiq "فريق نجاحك" (customer success team). Demo data only: never real patient data.
CREATE TABLE IF NOT EXISTS cs_imports (
  id TEXT PRIMARY KEY, ts INTEGER NOT NULL, sid TEXT, filename TEXT,
  ready INTEGER, fixed INTEGER, dup INTEGER, mapping TEXT, rows TEXT
);
CREATE INDEX IF NOT EXISTS cs_imp_sid ON cs_imports(sid);
CREATE TABLE IF NOT EXISTS cs_tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  no TEXT, ts INTEGER NOT NULL, sid TEXT, urgency TEXT, topic TEXT,
  message TEXT, email TEXT, source TEXT, status TEXT DEFAULT 'open'
);
CREATE INDEX IF NOT EXISTS cs_tk_sid ON cs_tickets(sid);
CREATE TABLE IF NOT EXISTS cs_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL, sid TEXT, kind TEXT, model TEXT, ok INTEGER, ms INTEGER,
  intent TEXT, action TEXT, screen TEXT, msg_redacted TEXT, reply TEXT, ticket_no TEXT, error TEXT
);
CREATE INDEX IF NOT EXISTS cs_log_sid_ts ON cs_log(sid, ts);
