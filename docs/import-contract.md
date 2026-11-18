# CSV import contract
Call importCsvDataset({buffer, filename, accountId}); await a dataset with id on success. The trusted authenticated route supplies accountId; never take ownership from input rows.
Filename must end .csv, UTF-8 buffer <=1 MiB, comma/semicolon RFC-4180 format, 1–500 rows. Every canonical feature is required with exact casing. G2/G3 are accepted only to discard; row_identifier/student_row_id are optional synthetic labels, not personal identifiers. Blank/duplicate labels are rejected and absent labels become ROW-001, ROW-002, etc. No generated-label collisions are allowed.
Validate before writes; maximum 50 row/column error messages. One same-connection SQLite transaction inserts datasets and student_rows; failure rolls back both. Keep only 31 validated features in features_json; raw bytes and G2/G3 are not retained. Repeated uploads intentionally create new datasets.
calculateG1Stats returns count/mean/min/max with mean rounded to two decimals for stored/displayed statistics. The [10,15,5,20,0] fixture gives count=5, mean=10, min=0, max=20.
Synthetic fixture: data/examples/student_two_rows.csv. Raw student-mat.csv is semicolon-delimited and contains 33 source columns; source/training files remain separate from uploaded inference data.

## Ingestion Standards and Flexible Header Ordering (Sprint 3 Enhancement)
- **Column sequence is flexible**: CSV columns do not need to be in any specific order; values are parsed and matched strictly by canonical header name (case-sensitive).
- **Mandatory features**: All 31 canonical features must be present for every student row with non-empty values. Rows with missing feature fields are rejected with descriptive errors (capped at 50 errors).
- **Target leakage prevention**: Optional historical grade columns `G2` and `G3` are stripped upon ingestion and never stored in `student_rows` or `features_json`.
- **Timestamp & ID disambiguation**: Repeated uploads of the same filename are permitted and disambiguated in the user interface by a unique sequential `#ID` badge and exact UTC upload timestamp (`YYYY-MM-DD HH:mm:ss`), displayed newest-first.
