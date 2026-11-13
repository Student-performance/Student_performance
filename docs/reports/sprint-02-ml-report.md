# Sprint 2 training and validation execution record
- Source/split manifest and reviewed commit: `ml/artifacts/split_manifest.json` (source `data/student-mat.csv`, SHA-256 e47f9ee225e1ee6e69b7564e6dac7123e80b8486677fe111f351964cef5dec80; seed 42; 276/59/60 IDs and per-file SHA-256 recorded in the manifest). Commit: published on branch `ai/s2-ai-01`; the actual SHA and PR URL are recorded on card S2-AI-01.
- Commands and exit codes (Windows, Python 3.12.10 in `.venv`, run from the repository root):
  - `python ml\split_data.py` → exit 0
  - `python ml\train_candidates.py` → exit 0 ("Baseline and Logistic Regression trained and saved to ml/artifacts/")
  - `python ml\predict_val_lr.py` → exit 0 ("Validation outputs: 59 rows; full precision; no held-out evaluation")
- Python/scikit-learn/pandas/numpy/joblib versions: Python 3.12.10; numpy 1.26.2; pandas 2.1.4; scikit-learn 1.3.2; joblib 1.3.2 (output of `ml/check_sprint2_ml.py`).
- Training population: 276 Mathematics rows; validation: 59; fixed target=int(G3<10); threshold=0.5.
- Candidate settings: Dummy most_frequent; LogisticRegression class_weight=balanced, max_iter=1000, random_state=42; train-only preprocessing (StandardScaler on 14 numeric features, OneHotEncoder with handle_unknown='ignore' on 17 categorical features; all 31 canonical features, no G2/G3 in X).
- Both validation metric artifact paths and actual values (N=59; 19 at risk, 40 not at risk):
  - `ml/artifacts/val_metrics_lr.json`, LogisticRegression: TP=16, FP=8, FN=3, TN=32; accuracy 0.8136; precision 0.6667; recall 0.8421; F1 0.7442; no undefined denominators.
  - `ml/artifacts/val_metrics_baseline.json`, DummyClassifier: TP=0, FP=0, FN=19, TN=40; accuracy 0.678; precision 0.0; recall 0.0; F1 0.0; precision has an undefined denominator (0/0, reported as 0.0 by the zero_division=0 convention, not a measured ratio).
- Per-row ID/probability/label/prediction artifact: ml/artifacts/val_predictions_lr.json.
- Reproducibility outcome: see Step 7 below (structural check passed; two-pass reproducibility passed).
- No held-out performance used; no final model selected.

# S2-AI-01 evidence — Step 7
- Reviewed commit and artifact paths: branch `ai/s2-ai-01` (SHA/PR recorded on card S2-AI-01); `ml/artifacts/split_manifest.json`, `candidate_dummy.joblib`, `candidate_lr.joblib`, `val_metrics_lr.json`, `val_metrics_baseline.json`, `val_predictions_lr.json`.
- Command and exit:
  - `python ml\check_sprint2_ml.py` → exit 0: "Structural split/hash/ID checks passed; reproducibility NOT RUN (use --reproduce). No held-out model evaluation performed."
  - `python ml\check_sprint2_ml.py --reproduce` → exit 0: "Two-pass validation reproducibility passed: split IDs, probabilities and metrics match. No held-out model evaluation performed."
  - Versions printed by both runs: Python 3.12.10; numpy 1.26.2; pandas 2.1.4; scikit-learn 1.3.2; joblib 1.3.2.
- Measured values / limitations: validation only (N=59, 19 positives), no held-out model evaluation. With so few positives, one or two students change F1 noticeably; the LR result is not a model selection, which stays open until the Sprint 3 random forest comparison. Retrospective experiment; timing of the 30 non-G1 fields is unverified.
- Reproducibility scope: `--reproduce` passed on Windows (Python 3.12.10). Regenerating on macOS/Linux writes LF instead of CRLF CSV line endings and changes LR probabilities only at ~1e-14, so the exact-equality check can fail there even though IDs, predictions and metrics are identical. The structural check (without `--reproduce`) passes on Linux against the committed files.
- Reviewer decision/date: pending until performed (reviewer: ST, Madina Khaimuldina).
