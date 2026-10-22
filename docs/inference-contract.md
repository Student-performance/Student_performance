# Inference contract (v1) — handoff to W1/W3

Owner: Carla Susana López Puma (AI). Status: **Sprint 1 toy stub**. `ml/predict.py` returns a constant placeholder score (version `toy-0`). It is not a model and its scores must never be shown or described as predictions. In Sprint 3 the toy score is replaced by the trained pipeline; the input and output format below stays the same.

## Setup (Windows, once)

From the repository root:

```
python -m venv .venv
.venv\Scripts\activate
pip install pandas scikit-learn
```

The interpreter the backend must call is `.venv\Scripts\python.exe` (on macOS/Linux: `.venv/bin/python`), with the repository root as working directory. The toy stub itself only uses the Python standard library.

## How to call it

The backend starts one process per request, writes one JSON object to stdin, and reads one JSON object from stdout:

```
.venv\Scripts\python.exe ml\predict.py < ml\examples\valid_input.json
```

Input: an object with a non-empty `records` list. Each record has exactly `row_id` (non-empty string, unique in the request) plus the integer features `G1` (0–20), `failures` (0–4) and `studytime` (1–4). Any missing, null, non-integer, out-of-range or extra field (for example `G2` or `G3`) rejects the whole request. The full rules are in `ml/schema-v1.json`.

Output (exit code 0):

```json
{"mode": "toy", "schema_version": "v1", "predictions": [
  {"row_id": "synthetic-001", "score": 0.5, "risk_flag": true, "version": "toy-0"}
]}
```

`score` is a finite number between 0 and 1, `risk_flag` is true when `score >= 0.5`, and `version` identifies the model. On any error the script prints `ERROR: ...` lines to stderr, writes nothing to stdout and exits with code 1; the backend should treat a nonzero exit as a failed prediction and must not parse stdout. Stderr may also contain warnings when the exit code is 0.

## Checks run

Observed on Windows (Python in `.venv`), Sprint 1:

```
> python ml\predict.py < ml\examples\valid_input.json
WARNING: toy mode (toy-0); scores are placeholders, not predictions
{"mode": "toy", "schema_version": "v1", "predictions": [{"row_id": "synthetic-001", "score": 0.5, "risk_flag": true, "version": "toy-0"}, {"row_id": "synthetic-002", "score": 0.5, "risk_flag": true, "version": "toy-0"}]}
> echo %ERRORLEVEL%
0

> python ml\predict.py < ml\examples\invalid_input.json
ERROR: record 0: 'G1'=25 out of range 0-20
ERROR: record 1: field 'G2' is not allowed
> echo %ERRORLEVEL%
1
```

No model logic belongs in the frontend or in the Express backend; they only call this script and display its output.
