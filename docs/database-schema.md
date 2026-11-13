## Six canonical tables
accounts, sessions, datasets, student_rows, runs, prediction_results.
sessions stores sid/expired/sess for connect-sqlite3; it has no account FK because the serialized session holds the user ID.

Accounts (1) -> (N) Datasets -> (N) StudentRows
Datasets (1) -> (N) Runs -> (N) PredictionResults
StudentRows (1) -> (N) PredictionResults across runs; UNIQUE(run_id, student_row_id) within each run.

# Database Invariants
- SQLite PRAGMA foreign_keys = ON enforced on every connection.
- Cascade deletions on accounts -> datasets -> student_rows.
- Unique constraint on (dataset_id, row_identifier).
- Role column defaults to 'student'.

## Enforced by SQLite
- Foreign keys: a dataset needs an existing account, a row needs an existing dataset, a run needs an existing dataset and account, and a result needs an existing run and student row.
- `ON DELETE CASCADE`: deleting an account removes its datasets, rows, runs and results; deleting a dataset removes its rows, runs and results.
- `UNIQUE(dataset_id, row_identifier)`: the same source row cannot appear twice in one dataset.
- `UNIQUE(run_id, student_row_id)`: a run gives at most one result per student row.
- `NOT NULL`, unique email/username (case-insensitive) and default values.

## Enforced by the service, not by SQLite
- `features_json` is stored as plain text. The import service must validate it against the frozen schema.
- Input rules such as username format and password length (8-72 bytes) are checked in the routes.
- `runs.account_id` must match the owner of `runs.dataset_id`. SQLite checks each foreign key separately, not that both point to the same account.
- A result's `student_row_id` must belong to the same dataset as its run. The foreign key only checks that the row exists.
- Ownership: every query must filter by the logged-in account, otherwise one user could read another user's datasets.
- `role` has no CHECK constraint, so the service must only write valid values.
- The `sessions` table belongs to connect-sqlite3 and has no foreign key; the user ID lives inside the serialized `sess` column.
