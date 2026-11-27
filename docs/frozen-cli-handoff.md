# Frozen prediction CLI — handoff to W1 (S3-AI-02)

## Setup (Windows, once, from the repository root)
```
py -3.12 -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```
Pinned versions: Python 3.12, numpy 1.26.2, pandas 2.1.4, scikit-learn 1.3.2, joblib 1.3.2. The CLI refuses to run with other versions of these packages, because the frozen model was saved with them. Set `PYTHON_PATH` in `.env` to the absolute path of `.venv\Scripts\python.exe`.

## Fixed command (already used by `src/services/predictionAdapter.js`)
```
python ml/predict.py --model ml/models/student_risk_v1.pkl --threshold 0.5
```
- Input: one JSON object on stdin, `{"schema_version": "schema-v1", "rows": [...]}`, with the 31 features per row as in `ml/schemas/schema-v1.json` (G2/G3 rejected).
- Output: one JSON object on stdout with `success`, `model_version` (`student_risk_v1`), `schema_version` (`schema-v1`), `threshold` (0.5), `count` and `results`. Each result has `row_id`, `student_row_id`, `row_identifier`, `risk_score` (class-1 probability, finite, between 0 and 1) and `risk_flag` (boolean, `risk_score >= 0.5`).
- Errors: message on stderr, nothing on stdout, exit code 1 (invalid input, wrong threshold, changed model file, wrong package versions).

## Versioned metadata and fixture
- `ml/models/model_metadata.json`: model version and type, schema version, threshold, feature order, source/split hashes, artifact SHA-256, package versions and the link to ST's freeze record.
- `ml/examples/expected_output_v1.json`: the exact output for `ml/examples/valid_two_rows_envelope.json`. Express and the CLI should give the same results on this fixture.

## Checks
- `python ml/check_sprint3_cli.py`: compares the CLI with the expected fixture and checks the three invalid fixtures and a wrong threshold.
- `node tests/test_prediction_adapter.js` passes with the frozen model.
- `ml/check_spike_contract.py` is the Sprint 1 toy check. It expects the toy model version, so it no longer applies after this change; use `ml/check_sprint3_cli.py` instead (the README command should be updated).
- No held-out (test) metrics are available until Sprint 4.
