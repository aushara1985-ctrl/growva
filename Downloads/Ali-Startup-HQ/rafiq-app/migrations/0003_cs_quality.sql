-- Rafiq harness: one row per self-check of an AI step (assistant answer, column mapping, import, quiz explanation, health).
-- clinic_id: the clinic when real accounts exist; in the public demo it holds the demo session id.
CREATE TABLE IF NOT EXISTS cs_quality (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  clinic_id TEXT,
  step TEXT NOT NULL,        -- ask | quiz | map | import | health (health: passed=0 means the clinic was flagged at risk, reasons = the usage signals)
  passed INTEGER NOT NULL,   -- 1 = delivered after passing the check, 0 = failed (handed to a human / reported to the clinic)
  reasons TEXT,              -- JSON array of check codes that failed on the LAST round ([] when passed)
  rounds INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS cs_quality_ts ON cs_quality(ts);
CREATE INDEX IF NOT EXISTS cs_quality_clinic ON cs_quality(clinic_id, step);

-- Import report: rows the clinic file had vs rows stored, so a mismatch is visible and never silent.
ALTER TABLE cs_imports ADD COLUMN received INTEGER;
ALTER TABLE cs_imports ADD COLUMN rejected INTEGER;
ALTER TABLE cs_imports ADD COLUMN omitted INTEGER;
