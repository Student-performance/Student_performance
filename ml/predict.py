"""Frozen prediction CLI (S3-AI-02). Replaces the Sprint 1 toy probe.

One JSON request on stdin -> one JSON result on stdout.
Errors go to stderr only, with exit code 1 and nothing on stdout.
Command used by W1:
    python ml/predict.py --model ml/models/student_risk_v1.pkl --threshold 0.5
"""
import argparse
import hashlib
import json
import math
import sys
from importlib.metadata import version
from pathlib import Path

import joblib
import pandas as pd

from contract import SCHEMA_VERSION, validate_rows


def load_frozen_model(model_path, threshold):
    model_path = Path(model_path)
    metadata = json.loads((model_path.parent / 'model_metadata.json').read_text())
    # only load the team-produced artifact that matches the frozen metadata
    if hashlib.sha256(model_path.read_bytes()).hexdigest() != metadata['artifact_sha256']:
        raise ValueError('Model file does not match model_metadata.json (untrusted or changed artifact)')
    if threshold != metadata['threshold']:
        raise ValueError(f"Threshold must be the frozen value {metadata['threshold']}")
    if metadata['schema_version'] != SCHEMA_VERSION:
        raise ValueError('Schema version mismatch between model and contract')
    for name, expected in metadata['package_versions'].items():
        if version(name) != expected:
            raise ValueError(f'{name} {version(name)} installed, but the model was frozen with {expected}')
    return joblib.load(model_path), metadata


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--model', default='ml/models/student_risk_v1.pkl')
    parser.add_argument('--threshold', type=float, default=0.5)
    args = parser.parse_args()
    try:
        model, metadata = load_frozen_model(args.model, args.threshold)
        envelope, features, identifiers = validate_rows(json.load(sys.stdin))
        x = pd.DataFrame(features)[metadata['features']]  # frozen feature order
        scores = model.predict_proba(x)[:, list(model.classes_).index(1)]
        results = []
        for score, ids in zip(scores, identifiers):
            score = float(score)
            if not (math.isfinite(score) and 0 <= score <= 1):
                raise ValueError(f"Invalid score for {ids['row_id']}")
            results.append(dict(**ids, risk_score=score, risk_flag=score >= metadata['threshold']))
        if envelope:
            output = dict(success=True, model_version=metadata['model_version'], schema_version=metadata['schema_version'],
                          threshold=metadata['threshold'], count=len(results), results=results)
        else:
            output = results  # bare array input keeps the Sprint 1 array protocol
        sys.stdout.write(json.dumps(output, allow_nan=False))
        return 0
    except Exception as error:
        print(f'ERROR: {error}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
