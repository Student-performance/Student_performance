"""S3-AI-01: random forest validation outputs for ST (validation only, never test)."""
import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_score, recall_score

from contract import FEATURES


def summary(y, predicted):
    # same format as val_metrics_lr.json / val_metrics_baseline.json
    tn, fp, fn, tp = confusion_matrix(y, predicted, labels=[0, 1]).ravel()
    return dict(model='RandomForestClassifier', val_n=len(y), threshold=0.5,
                confusion_matrix=dict(tp=int(tp), fp=int(fp), fn=int(fn), tn=int(tn)),
                accuracy=round(float(accuracy_score(y, predicted)), 4),
                precision=round(float(precision_score(y, predicted, zero_division=0)), 4),
                recall=round(float(recall_score(y, predicted, zero_division=0)), 4),
                f1=round(float(f1_score(y, predicted, zero_division=0)), 4),
                undefined_denominators=[name for name, d in [('precision', tp + fp), ('recall', tp + fn), ('f1', 2 * tp + fp + fn)] if d == 0])


def validate():
    frame = pd.read_csv('data/val.csv')
    manifest = json.loads(Path('ml/artifacts/split_manifest.json').read_text())
    # same 59 validation rows, in the same order, as the Sprint 2 candidates
    assert len(frame) == 59 and frame.row_id.tolist() == manifest['val_ids']
    x, y = frame[FEATURES], (frame.G3 < 10).astype(int)

    rf = joblib.load('ml/artifacts/candidate_rf.joblib')
    rf_prob = rf.predict_proba(x[list(rf.feature_names_in_)])[:, list(rf.classes_).index(1)]
    rf_pred = (rf_prob >= 0.5).astype(int)

    Path('ml/artifacts/val_metrics_rf.json').write_text(json.dumps(summary(y, rf_pred), indent=2))
    rows = [dict(row_id=str(frame.row_id.iloc[i]), true_label=int(y.iloc[i]),
                 rf_prob=float(rf_prob[i]), rf_pred=int(rf_pred[i])) for i in range(len(frame))]
    Path('ml/artifacts/val_predictions_rf.json').write_text(json.dumps(rows, indent=2, allow_nan=False))
    print('RF validation outputs: 59 rows; same IDs as LR/Dummy; no held-out evaluation')


if __name__ == '__main__':
    validate()
