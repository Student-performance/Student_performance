# Sprint 3 random forest training and validation record (S3-AI-01)

- Source and split: unchanged Sprint 2 artifacts. `data/student-mat.csv` (SHA-256 e47f9ee225e1ee6e69b7564e6dac7123e80b8486677fe111f351964cef5dec80) and `ml/artifacts/split_manifest.json` (seed 42, 276 train / 59 validation / 60 test). The test split was not read.
- Fixed settings, written to `ml/artifacts/rf_settings.json` before training and before any validation result was seen. They are the settings preregistered in `docs/evaluation-protocol.md` section 4: RandomForestClassifier(n_estimators=100, max_depth=5, min_samples_leaf=5, max_features='sqrt', bootstrap=True, class_weight='balanced', random_state=42). Only this one forest was trained; there was no hyperparameter search.
- Features and preprocessing: the same 31 canonical features as the Sprint 2 candidates (no G2/G3), with the same train-only preprocessing (StandardScaler on 14 numeric features, OneHotEncoder with handle_unknown='ignore' on 17 categorical features).
- Commands and exit codes (Windows, Python 3.12.10 in `.venv`, run from the repository root):
  - `python ml\train_forest.py` → exit 0 ("Random forest trained on 276 rows and saved to ml/artifacts/candidate_rf.joblib")
  - `python ml\predict_val_rf.py` → exit 0 ("RF validation outputs: 59 rows; same IDs as LR/Dummy; no held-out evaluation")
- Versions: Python 3.12.10; numpy 1.26.2; pandas 2.1.4; scikit-learn 1.3.2; joblib 1.3.2 (pinned in `requirements.txt`).
- Validation result (N=59; 19 at risk, 40 not at risk; threshold 0.5), from `ml/artifacts/val_metrics_rf.json`: TP=17, FP=4, FN=2, TN=36; accuracy 0.8983; precision 0.8095; recall 0.8947; F1 0.85; no undefined denominators.
- Row-level outputs for ST: `ml/artifacts/val_predictions_rf.json`, with row_id, true_label, rf_prob (full precision) and rf_pred for the same 59 validation IDs, in the same order as `val_predictions_lr.json`.
- Not done here: no model is selected or frozen and no test labels were opened. The comparison and the freeze decision belong to ST (S3-ST-01).
- Note for ST (protocol deviation to log): `docs/evaluation-protocol.md` section 4 specifies Logistic Regression with solver liblinear and C=1, but the Sprint 2 `ml/train_candidates.py` (S2-AI-01) used scikit-learn's default solver (lbfgs) with C=1, max_iter=1000, class_weight='balanced' and random_state=42. ST should record this deviation when comparing candidates.
- Reviewer decision/date: pending until performed (reviewer: ST, Madina Khaimuldina).
