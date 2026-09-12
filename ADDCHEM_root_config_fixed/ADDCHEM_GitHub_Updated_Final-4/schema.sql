PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS staff_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff' CHECK(role IN ('staff','admin')),
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_hash TEXT NOT NULL UNIQUE,
  staff_id INTEGER NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS inventory_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku TEXT NOT NULL UNIQUE COLLATE NOCASE,
  product_key TEXT,
  product_name TEXT NOT NULL,
  cas_number TEXT,
  grade TEXT,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK(quantity >= 0),
  unit TEXT NOT NULL,
  batch_no TEXT,
  expiry_date TEXT,
  internal_notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by INTEGER REFERENCES staff_users(id)
);

CREATE INDEX IF NOT EXISTS inventory_product_idx ON inventory_items(product_name);
CREATE INDEX IF NOT EXISTS inventory_cas_idx ON inventory_items(cas_number);
CREATE INDEX IF NOT EXISTS inventory_grade_idx ON inventory_items(grade);
CREATE INDEX IF NOT EXISTS inventory_updated_idx ON inventory_items(updated_at DESC);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inventory_id INTEGER NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  delta_quantity INTEGER NOT NULL,
  movement_type TEXT NOT NULL CHECK(movement_type IN ('opening','receipt','adjustment','sale','return')),
  reference TEXT,
  reason TEXT,
  staff_id INTEGER REFERENCES staff_users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS inventory_movements_inventory_idx ON inventory_movements(inventory_id, created_at DESC);

CREATE TABLE IF NOT EXISTS bills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_no TEXT NOT NULL UNIQUE,
  customer_name TEXT,
  customer_reference TEXT,
  notes TEXT,
  staff_id INTEGER NOT NULL REFERENCES staff_users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bill_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bill_id INTEGER REFERENCES bills(id) ON DELETE CASCADE,
  invoice_no TEXT NOT NULL,
  inventory_id INTEGER NOT NULL REFERENCES inventory_items(id),
  sku TEXT NOT NULL,
  product_name TEXT NOT NULL,
  cas_number TEXT,
  grade TEXT,
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  unit TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS bill_items_bill_idx ON bill_items(bill_id);

CREATE TRIGGER IF NOT EXISTS inventory_no_negative
BEFORE UPDATE OF quantity ON inventory_items
WHEN NEW.quantity < 0
BEGIN
  SELECT RAISE(ABORT, 'Insufficient inventory');
END;

CREATE TRIGGER IF NOT EXISTS inventory_updated_timestamp
AFTER UPDATE ON inventory_items
BEGIN
  UPDATE inventory_items SET updated_at = datetime('now') WHERE id = NEW.id;
END;
