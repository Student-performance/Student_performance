"""Independent ST calculations from per-row predictions, using standard library only."""
import json
import math
from pathlib import Path

def counts_and_metrics(rows, prefix):
    tp = fp = fn = tn = 0
    for row in rows:
        y, p, score = row['true_label'], row[prefix+'_pred'], row[prefix+'_prob']
        assert type(y) is int and y in (0, 1) and type(p) is int and p in (0, 1)
        assert type(score) in (int, float) and math.isfinite(score) and 0 <= score <= 1
        assert p == int(score >= 0.5), 'Threshold/probability mismatch'
        tp += int(y == 1 and p == 1); fp += int(y == 0 and p == 1)
        fn += int(y == 1 and p == 0); tn += int(y == 0 and p == 0)
    total = len(rows)
    assert total > 0
    denominators = {'precision': tp+fp, 'recall': tp+fn, 'f1': 2*tp+fp+fn}
    return dict(confusion_matrix=dict(tp=tp, fp=fp, fn=fn, tn=tn), accuracy=(tp+tn)/total,
                precision=tp/(tp+fp) if tp+fp else 0, recall=tp/(tp+fn) if tp+fn else 0,
                f1=2*tp/(2*tp+fp+fn) if 2*tp+fp+fn else 0,
                undefined_denominators=[key for key, value in denominators.items() if not value])

def audit():
    rows = json.loads(Path('ml/artifacts/val_predictions_lr.json').read_text())
    manifest = json.loads(Path('ml/artifacts/split_manifest.json').read_text())
    assert len(rows) == len({row['row_id'] for row in rows}) == 59
    assert [row['row_id'] for row in rows] == manifest['val_ids']
    import csv
    labels = {row['row_id']: int(int(row['G3']) < 10) for row in csv.DictReader(Path('data/val.csv').open())}
    assert all(labels[row['row_id']] == row['true_label'] for row in rows), 'Validation label mismatch'
    result = {'population': 'Mathematics validation, N=59', 'threshold': 0.5,
              'class_counts': {str(label): sum(row['true_label'] == label for row in rows) for label in (0, 1)}}
    for prefix, filename in [('lr', 'lr'), ('dummy', 'baseline')]:
        actual = counts_and_metrics(rows, prefix)
        claimed = json.loads(Path(f'ml/artifacts/val_metrics_{filename}.json').read_text())
        assert claimed['val_n'] == 59 and claimed['threshold'] == 0.5
        assert actual['confusion_matrix'] == claimed['confusion_matrix']
        for metric in ['accuracy', 'precision', 'recall', 'f1']:
            assert math.isclose(actual[metric], claimed[metric], abs_tol=0.000051), metric
        assert actual['undefined_denominators'] == claimed['undefined_denominators']
        result[prefix] = actual
    print(json.dumps(result, indent=2))
    print('Independent validation audit passed. Zero denominators use zero_division=0 and are listed explicitly. No final model selected.')

if __name__ == '__main__':
    audit()