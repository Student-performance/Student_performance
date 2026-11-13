"""Validation only; preserve full probabilities and row-level outputs for ST."""
import json
from pathlib import Path
import joblib
import pandas as pd
from sklearn.metrics import confusion_matrix, accuracy_score, precision_score, recall_score, f1_score
from contract import FEATURES

def summary(y, predicted, model):
    tn, fp, fn, tp = confusion_matrix(y, predicted, labels=[0, 1]).ravel()
    return dict(model=model, val_n=len(y), threshold=0.5,
                confusion_matrix=dict(tp=int(tp), fp=int(fp), fn=int(fn), tn=int(tn)),
                accuracy=round(float(accuracy_score(y, predicted)), 4),
                precision=round(float(precision_score(y, predicted, zero_division=0)), 4),
                recall=round(float(recall_score(y, predicted, zero_division=0)), 4),
                f1=round(float(f1_score(y, predicted, zero_division=0)), 4),
                undefined_denominators=[name for name, denominator in [('precision', tp+fp), ('recall', tp+fn), ('f1', 2*tp+fp+fn)] if denominator == 0])

def validate():
    frame = pd.read_csv('data/val.csv')
    assert len(frame) == 59 and frame.row_id.is_unique
    x, y = frame[FEATURES], (frame.G3 < 10).astype(int)
    lr = joblib.load('ml/artifacts/candidate_lr.joblib')
    dummy = joblib.load('ml/artifacts/candidate_dummy.joblib')
    lr_prob = lr.predict_proba(x[list(lr.feature_names_in_)])[:, list(lr.classes_).index(1)]
    dummy_prob = dummy.predict_proba(x)[:, list(dummy.classes_).index(1)]
    lr_pred, dummy_pred = (lr_prob >= 0.5).astype(int), (dummy_prob >= 0.5).astype(int)
    for name, predicted, model in [('lr', lr_pred, 'LogisticRegression'), ('baseline', dummy_pred, 'DummyClassifier')]:
        Path(f'ml/artifacts/val_metrics_{name}.json').write_text(json.dumps(summary(y, predicted, model), indent=2))
    rows = [dict(row_id=str(frame.row_id.iloc[i]), true_label=int(y.iloc[i]),
                 lr_prob=float(lr_prob[i]), lr_pred=int(lr_pred[i]),
                 dummy_prob=float(dummy_prob[i]), dummy_pred=int(dummy_pred[i])) for i in range(len(frame))]
    Path('ml/artifacts/val_predictions_lr.json').write_text(json.dumps(rows, indent=2, allow_nan=False))
    print('Validation outputs: 59 rows; full precision; no held-out evaluation')

if __name__ == '__main__':
    validate()
