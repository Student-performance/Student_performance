"""S3-AI-01: train ONE fixed random forest (settings from docs/evaluation-protocol.md).

Uses the same train split and the same 31 features as the Sprint 2 candidates.
No tuning, no validation or test data here. The settings are saved first, before
any validation result is seen.
"""
import json
import os

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

# same feature lists as ml/train_candidates.py (Sprint 2)
NUM_COLS = ['age', 'Medu', 'Fedu', 'traveltime', 'studytime', 'failures', 'famrel', 'freetime', 'goout', 'Dalc', 'Walc', 'health', 'absences', 'G1']
CAT_COLS = ['school', 'sex', 'address', 'famsize', 'Pstatus', 'Mjob', 'Fjob', 'reason', 'guardian', 'schoolsup', 'famsup', 'paid', 'activities', 'nursery', 'higher', 'internet', 'romantic']

# fixed settings from the evaluation protocol, section 4
RF_SETTINGS = dict(n_estimators=100, max_depth=5, min_samples_leaf=5, max_features='sqrt',
                   bootstrap=True, class_weight='balanced', random_state=42)


def train():
    os.makedirs('ml/artifacts', exist_ok=True)
    # 1) record the settings before training or looking at validation
    with open('ml/artifacts/rf_settings.json', 'w') as f:
        json.dump({'model': 'RandomForestClassifier', 'settings': RF_SETTINGS,
                   'features': NUM_COLS + CAT_COLS, 'train_file': 'data/train.csv',
                   'target': 'int(G3 < 10)'}, f, indent=2)

    # 2) train only on the training rows
    train_df = pd.read_csv('data/train.csv')
    X_train = train_df[NUM_COLS + CAT_COLS]
    y_train = (train_df['G3'] < 10).astype(int)
    assert len(train_df) == 276 and not {'G2', 'G3'} & set(X_train.columns)

    preprocessor = ColumnTransformer(transformers=[
        ('num', StandardScaler(), NUM_COLS),
        ('cat', OneHotEncoder(handle_unknown='ignore'), CAT_COLS)
    ])
    pipe_rf = Pipeline([('pre', preprocessor), ('clf', RandomForestClassifier(**RF_SETTINGS))])
    pipe_rf.fit(X_train, y_train)
    joblib.dump(pipe_rf, 'ml/artifacts/candidate_rf.joblib')
    print('Random forest trained on 276 rows and saved to ml/artifacts/candidate_rf.joblib')


if __name__ == '__main__':
    train()
