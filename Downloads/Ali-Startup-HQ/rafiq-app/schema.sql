CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  sid TEXT, ref TEXT, page TEXT, name TEXT NOT NULL,
  props TEXT, ua TEXT
);
CREATE INDEX IF NOT EXISTS ev_ts ON events(ts);
CREATE INDEX IF NOT EXISTS ev_sid ON events(sid);
CREATE TABLE IF NOT EXISTS runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL, sid TEXT, ref TEXT, kind TEXT, specialty TEXT,
  ok INTEGER, ms INTEGER, input_chars INTEGER, input_text TEXT, output_text TEXT, error TEXT
);
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL, sid TEXT, ref TEXT,
  name TEXT, clinic TEXT, city TEXT, specialty TEXT, phone TEXT, doctors TEXT, note TEXT
);
