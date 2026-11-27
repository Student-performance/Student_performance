"""S3-AI-02: freeze the candidate that ST selected (no retraining).

Usage (after ST signs the freeze decision):
    python ml/freeze_model.py rf docs/reports/<ST freeze record>.md
    (or "lr" if ST selected the logistic regression)

It copies the ALREADY TRAINED pipeline to ml/models/student_risk_v1.pkl, writes
ml/models/model_metadata.json and creates the expected-output fixture for W1.
It never reads data/test.csv and never refits on train+validation.
"""
import hashlib
import json
import shutil
import subprocess
import sys
from datetime import date
from importlib.metadata import version
from pathlib import Path

import joblib

from contract import FEATURES, SCHEMA_VERSION

CANDIDATES = {'lr': ('ml/artifacts/candidate_lr.joblib', 'LogisticRegression'),
              'rf': ('ml/artifacts/candidate_rf.joblib', 'RandomForestClassifier')}
THRESHOLD = 0.5


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def freeze(candidate, decision_record):
    assert candidate in CANDIDATES, 'candidate must be lr or rf'
    assert Path(decision_record).exists(), 'ST freeze record not found: freeze only after ST decision'
    source, model_name = CANDIDATES[candidate]

    # the trained pipeline is copied as it is (no refit)
    pipeline = joblib.load(source)
    assert sorted(pipeline.feature_names_in_) == sorted(FEATURES) and len(FEATURES) == 31
    Path('ml/models').mkdir(parents=True, exist_ok=True)
    model_path = Path('ml/models/student_risk_v1.pkl')
    shutil.copyfile(source, model_path)

    manifest = json.loads(Path('ml/artifacts/split_manifest.json').read_text())
    metadata = {
        'model_version': 'student_risk_v1',  # name expected by W1's adapter test
        'model': model_name,
        'schema_version': SCHEMA_VERSION,
        'threshold': THRESHOLD,
        'positive_class': 'at risk = int(G3 < 10)',
        'features': list(pipeline.feature_names_in_),
        'trained_on': 'data/train.csv (276 rows); no refit on validation or test',
        'source_sha256': manifest['source_sha256'],
        'split_manifest_sha256': sha256('ml/artifacts/split_manifest.json'),
        'train_sha256': manifest['train_sha256'],
        'val_sha256': manifest['val_sha256'],
        'test_sha256_unopened': manifest['test_sha256'],
        'artifact_sha256': sha256(model_path),
        'package_versions': {name: version(name) for name in ['numpy', 'pandas', 'scikit-learn', 'joblib']},
        'python_version': sys.version.split()[0],
        'freeze_decision_record': decision_record,
        'frozen_on': date.today().isoformat(),
    }
    Path('ml/models/model_metadata.json').write_text(json.dumps(metadata, indent=2))

    # expected output for W1: the frozen model on the shared two-row fixture
    request = Path('ml/examples/valid_two_rows_envelope.json').read_text(encoding='utf-8')
    result = subprocess.run([sys.executable, 'ml/predict.py', '--model', str(model_path), '--threshold', str(THRESHOLD)],
                            input=request, text=True, capture_output=True, timeout=30)
    assert result.returncode == 0, result.stderr
    Path('ml/examples/expected_output_v1.json').write_text(json.dumps(json.loads(result.stdout), indent=2))
    print(f'Frozen {model_name} as {model_path} ({metadata["model_version"]}); metadata and expected fixture written')


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit('Usage: python ml/freeze_model.py <lr|rf> <path to ST freeze record>')
    freeze(sys.argv[1], sys.argv[2])
