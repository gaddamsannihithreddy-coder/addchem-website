-- ADDCHEM catalogue editor migration
-- Run once against the same D1 database used by the staff portal.
CREATE TABLE IF NOT EXISTS catalogue_overrides (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_code TEXT NOT NULL UNIQUE COLLATE NOCASE,
  section TEXT,
  product_name TEXT NOT NULL,
  description TEXT,
  cas_number TEXT,
  grade TEXT,
  pack_size TEXT,
  hsn_code TEXT,
  gst_percent TEXT DEFAULT '18',
  notes TEXT,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  updated_by INTEGER REFERENCES staff_users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS catalogue_overrides_name_idx ON catalogue_overrides(product_name);
