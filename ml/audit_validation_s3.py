"""Independent ST calculations from per-row predictions, Sprint 3 (adds Random Forest).

Extends ml/audit_validation.py (Sprint 2, LR + Dummy only) with the RF candidate
delivered in S3-AI-01, and checks that all three candidates share identical
validation row IDs and true labels before any metric is trusted.
"""
import csv
import json
import math
from pathlib import Path


def counts_and_metrics(rows, prefix):
    tp = fp = fn = tn = 0
    for row in rows:
        y, p, score = row['true_label'], row[prefix + '_pred'], row[prefix + '_prob']
        assert type(y) is int and y in (0, 1) and type(p) is int and p in (0, 1)
        assert type(score) in (int, float) and math.isfinite(score) and 0 <= score <= 1
        assert p == int(score >= 0.5), 'Threshold/probability mismatch'
        tp += int(y == 1 and p == 1); fp += int(y == 0 and p == 1)
        fn += int(y == 1 and p == 0); tn += int(y == 0 and p == 0)
    total = len(rows)
    assert total > 0
    denominators = {'precision': tp + fp, 'recall': tp + fn, 'f1': 2 * tp + fp + fn}
    return dict(confusion_matrix=dict(tp=tp, fp=fp, fn=fn, tn=tn), accuracy=(tp + tn) / total,
                precision=tp / (tp + fp) if tp + fp else 0, recall=tp / (tp + fn) if tp + fn else 0,
                f1=2 * tp / (2 * tp + fp + fn) if 2 * tp + fp + fn else 0,
                undefined_denominators=[key for key, value in denominators.items() if not value])


def audit():
    lr_rows = json.loads(Path('ml/artifacts/val_predictions_lr.json').read_text())
    rf_rows = json.loads(Path('ml/artifacts/val_predictions_rf.json').read_text())
    manifest = json.loads(Path('ml/artifacts/split_manifest.json').read_text())

    # --- identity checks across all three candidates (Dummy/LR share a file with RF) ---
    assert len(lr_rows) == len(rf_rows) == 59
    lr_ids = [row['row_id'] for row in lr_rows]
    rf_ids = [row['row_id'] for row in rf_rows]
    assert lr_ids == manifest['val_ids'], 'LR/Dummy file row order does not match split manifest'
    assert rf_ids == manifest['val_ids'], 'RF file row order does not match split manifest'
    assert lr_ids == rf_ids, 'LR/Dummy and RF files are not in the same row order'

    lr_labels = {row['row_id']: row['true_label'] for row in lr_rows}
    rf_labels = {row['row_id']: row['true_label'] for row in rf_rows}
    assert lr_labels == rf_labels, 'true_label disagrees between LR/Dummy file and RF file'

    labels_csv = {row['row_id']: int(int(row['G3']) < 10) for row in csv.DictReader(Path('data/val.csv').open())}
    assert all(labels_csv[row['row_id']] == row['true_label'] for row in lr_rows), 'Validation label mismatch vs data/val.csv'

    result = {'population': 'Mathematics validation, N=59', 'threshold': 0.5,
              'class_counts': {str(label): sum(row['true_label'] == label for row in lr_rows) for label in (0, 1)}}

    # --- recompute + cross-check each candidate against its claimed metrics file ---
    checks = [('dummy', 'baseline', lr_rows), ('lr', 'lr', lr_rows), ('rf', 'rf', rf_rows)]
    for prefix, filename, rows in checks:
        actual = counts_and_metrics(rows, prefix)
        claimed = json.loads(Path(f'ml/artifacts/val_metrics_{filename}.json').read_text())
        assert claimed['val_n'] == 59 and claimed['threshold'] == 0.5
        assert actual['confusion_matrix'] == claimed['confusion_matrix']
        for metric in ['accuracy', 'precision', 'recall', 'f1']:
            assert math.isclose(actual[metric], claimed[metric], abs_tol=0.000051), metric
        assert actual['undefined_denominators'] == claimed['undefined_denominators']
        result[prefix] = actual

    # --- apply the precommitted selection/tie rule (Dummy is reference only, not a candidate) ---
    f1_lr, f1_rf = result['lr']['f1'], result['rf']['f1']
    if abs(f1_lr - f1_rf) <= 0.001:
        winner = 'LogisticRegression'  # tie-break rule
    else:
        winner = 'LogisticRegression' if f1_lr > f1_rf else 'RandomForestClassifier'
    result['selection'] = {'f1_lr': f1_lr, 'f1_rf': f1_rf, 'winner': winner}

    print(json.dumps(result, indent=2))
    print('Independent validation audit passed for Dummy, LR and RF. Zero denominators use zero_division=0 '
          'and are listed explicitly. Test set was not opened. Selected candidate: ' + winner)


if __name__ == '__main__':
    audit()