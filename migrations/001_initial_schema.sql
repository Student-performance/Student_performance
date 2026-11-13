PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT UNIQUE NOT NULL COLLATE NOCASE,
  username TEXT UNIQUE NOT NULL COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  sid TEXT PRIMARY KEY NOT NULL,
  expired INTEGER NOT NULL,
  sess TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS datasets (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  row_count INTEGER NOT NULL,
  g1_count INTEGER NOT NULL,
  g1_mean REAL NOT NULL,
  g1_min REAL NOT NULL,
  g1_max REAL NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE IF NOT EXISTS student_rows (
  id TEXT PRIMARY KEY NOT NULL,
  dataset_id TEXT NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  row_index INTEGER NOT NULL,
  row_identifier TEXT NOT NULL,
  features_json TEXT NOT NULL,
  g1 INTEGER NOT NULL,
  UNIQUE(dataset_id, row_identifier)
);
CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY NOT NULL,
  dataset_id TEXT NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  model_version TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  threshold REAL NOT NULL,
  total_records INTEGER NOT NULL,
  at_risk_count INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE IF NOT EXISTS prediction_results (
  id TEXT PRIMARY KEY NOT NULL,
  run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  student_row_id TEXT NOT NULL REFERENCES student_rows(id) ON DELETE CASCADE,
  risk_score REAL NOT NULL,
  risk_flag INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE(run_id, student_row_id)
);
-- 002_indexes.sql
CREATE INDEX IF NOT EXISTS idx_datasets_account_id ON datasets(account_id);
CREATE INDEX IF NOT EXISTS idx_student_rows_dataset_id ON student_rows(dataset_id);
CREATE INDEX IF NOT EXISTS idx_runs_account_id ON runs(account_id);
CREATE INDEX IF NOT EXISTS idx_runs_dataset_id ON runs(dataset_id);
CREATE INDEX IF NOT EXISTS idx_prediction_results_run_id ON prediction_results(run_id);
