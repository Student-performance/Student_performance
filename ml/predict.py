"""
Sprint 1 TOY predictor: input/output contract spike, NOT a model.

Reads ONE JSON object from stdin, writes ONE JSON object to stdout.
Diagnostics go to stderr. Exits with code 1 on any input error.

Input:   {"records": [{"row_id": "...", "G1": 8, "failures": 1, "studytime": 1}, ...]}
Output:  {"mode": "toy", "schema_version": "v1", "predictions": [
            {"row_id": "...", "score": 0.5, "risk_flag": true, "version": "toy-0"}, ...]}

Usage (Windows, from the repo root):
    .venv\\Scripts\\python.exe ml\\predict.py < ml\\examples\\valid_input.json

In Sprint 3 the toy score is replaced by the trained, frozen pipeline.
The contract (input fields, output fields) stays the same.
"""
import json
import math
import sys
from pathlib import Path

SCHEMA_PATH = Path(__file__).parent / "schema-v1.json"
MODEL_VERSION = "toy-0"
THRESHOLD = 0.5
TOY_SCORE = 0.5  # constant on purpose: toy output must never look like a real prediction


def log(msg):
    print(msg, file=sys.stderr)


def validate_record(record, features, id_name):
    """Return a list of error messages for one record (empty list = valid)."""
    if not isinstance(record, dict):
        return ["record is not a JSON object"]

    errors = []
    row_id = record.get(id_name)
    if not isinstance(row_id, str) or not row_id:
        errors.append(f"'{id_name}' must be a non-empty string")

    allowed = {id_name} | {f["name"] for f in features}
    for key in record:
        if key not in allowed:
            errors.append(f"field '{key}' is not allowed")

    for f in features:
        name = f["name"]
        if name not in record or record[name] is None:
            errors.append(f"missing feature '{name}'")
            continue
        value = record[name]
        # bool is a subclass of int in Python, so exclude it explicitly
        if not isinstance(value, int) or isinstance(value, bool):
            errors.append(f"'{name}' must be an integer, got {value!r}")
        elif not (f["min"] <= value <= f["max"]):
            errors.append(f"'{name}'={value} out of range {f['min']}-{f['max']}")
    return errors


def toy_predict(record, id_name):
    score = TOY_SCORE
    assert math.isfinite(score)
    return {
        "row_id": record[id_name],
        "score": score,
        "risk_flag": score >= THRESHOLD,
        "version": MODEL_VERSION,
    }


def main():
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    features = schema["features"]
    id_name = schema["id_field"]["name"]

    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError as e:
        log(f"ERROR: input is not valid JSON: {e}")
        return 1

    records = payload.get("records") if isinstance(payload, dict) else None
    if not isinstance(records, list) or not records:
        log("ERROR: input must be an object with a non-empty 'records' list")
        return 1

    all_errors = []
    seen_ids = set()
    for i, record in enumerate(records):
        for err in validate_record(record, features, id_name):
            all_errors.append(f"record {i}: {err}")
        rid = record.get(id_name) if isinstance(record, dict) else None
        if rid in seen_ids:
            all_errors.append(f"record {i}: duplicate row_id '{rid}'")
        seen_ids.add(rid)

    if all_errors:
        for err in all_errors:
            log(f"ERROR: {err}")
        return 1

    log(f"WARNING: toy mode ({MODEL_VERSION}); scores are placeholders, not predictions")
    output = {
        "mode": "toy",
        "schema_version": schema["schema_version"],
        "predictions": [toy_predict(r, id_name) for r in records],
    }
    print(json.dumps(output))
    return 0


if __name__ == "__main__":
    sys.exit(main())