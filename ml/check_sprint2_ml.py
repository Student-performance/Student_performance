"""Split integrity and reproducibility; never evaluate a held-out model."""
import argparse
import csv
import hashlib
import json
import platform
import subprocess
import sys
from pathlib import Path

def check():
    manifest = json.loads(Path('ml/artifacts/split_manifest.json').read_text())
    assert manifest['seed'] == 42 and manifest['total_rows'] == 395
    assert hashlib.sha256(Path('data/student-mat.csv').read_bytes()).hexdigest() == manifest['source_sha256']
    sets = []
    for name, expected in [('train', 276), ('val', 59), ('test', 60)]:
        filename = Path('data/'+name+'.csv')
        with filename.open(newline='') as source:
            ids = [row['row_id'] for row in csv.DictReader(source)]
        assert len(ids) == len(set(ids)) == expected == manifest[name+'_rows']
        assert ids == manifest[name+'_ids']
        assert hashlib.sha256(filename.read_bytes()).hexdigest() == manifest[name+'_sha256']
        sets.append(set(ids))
    assert not (sets[0]&sets[1] or sets[0]&sets[2] or sets[1]&sets[2])
    for filename in ['ml/train_candidates.py', 'ml/predict_val_lr.py']:
        assert 'data/test.csv' not in Path(filename).read_text(), filename
    from contract import FEATURES
    assert len(FEATURES) == 31 and not {'G2','G3'} & set(FEATURES)
    return {filename: json.loads(Path('ml/artifacts/'+filename).read_text()) for filename in
            ['split_manifest.json', 'val_predictions_lr.json', 'val_metrics_lr.json', 'val_metrics_baseline.json']}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--reproduce', action='store_true')
    args = parser.parse_args()
    before = check()
    if args.reproduce:
        for _ in range(2):
            for script in ['ml/split_data.py', 'ml/train_candidates.py', 'ml/predict_val_lr.py']:
                subprocess.run([sys.executable, script], check=True, timeout=120)
            assert check() == before, 'Split IDs or validation predictions/metrics changed'
        print('Two-pass validation reproducibility passed: split IDs, probabilities and metrics match.')
    else:
        print('Structural split/hash/ID checks passed; reproducibility NOT RUN (use --reproduce).')
    print('No held-out model evaluation performed.')
    print('Python:', platform.python_version())
    from importlib.metadata import version
    print({name: version(name) for name in ['numpy','pandas','scikit-learn','joblib']})

if __name__ == '__main__':
    main()
