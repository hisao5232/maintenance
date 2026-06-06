CREATE TABLE IF NOT EXISTS maintenance_records (
  id            INTEGER PRIMARY KEY AUTOINCREMENT, -- SERIAL → AUTOINCREMENT
  category      TEXT,                              -- character varying → TEXT
  date          TEXT,                              -- DATE → TEXT ('YYYY-MM-DD'形式で保存)
  model_name    TEXT,
  serial_number TEXT,                              -- NULLあり、そのままOK
  content       TEXT
);

-- インデックス（PostgreSQLと同じ）
CREATE INDEX IF NOT EXISTS ix_maintenance_records_model_name
  ON maintenance_records (model_name);

CREATE INDEX IF NOT EXISTS ix_maintenance_records_serial_number
  ON maintenance_records (serial_number);
