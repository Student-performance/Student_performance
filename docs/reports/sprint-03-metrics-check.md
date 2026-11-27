# S3-ST-01 evidence — Step 2
- Reviewed commit and artifact paths: ml/artifacts/val_metrics_rf.json, ml/artifacts/val_predictions_rf.json, ml/artifacts/rf_settings.json, docs/reports/sprint-03-rf-report.md (S3-AI-01, PR #19, commit 39555e8), alongside the existing ml/artifacts/val_metrics_baseline.json and val_predictions_lr.json (S2-AI-01).
- Command and exit: git fetch origin (Exit code 0); git show origin/ai/s3-ai-01:ml/artifacts/val_predictions_rf.json (Exit code 0)
- Measured values / limitations: RF validation outputs read — 59 rows, same row IDs and order as the LR/Dummy file and as split_manifest.json's val_ids. No held-out (test) evaluation; test set not opened.
- Reviewer decision/date: [pending until performed]

# S3-ST-01 evidence — Step 3
- Reviewed commit and artifact paths: ml/audit_validation_s3.py (new); ml/artifacts/split_manifest.json, val_predictions_lr.json, val_predictions_rf.json, val_metrics_baseline.json, val_metrics_lr.json, val_metrics_rf.json; data/val.csv
- Command and exit: .venv/Scripts/python.exe ml/audit_validation_s3.py (Exit code 0)
- Measured values / limitations: Independent recomputation from row-level predictions matches all three candidates' claimed metrics exactly:
  - Dummy: TP=0, FP=0, FN=19, TN=40, accuracy=0.6780, precision undefined (reported 0.0), recall=0.0, F1=0.0
  - Logistic Regression: TP=16, FP=8, FN=3, TN=32, accuracy=0.8136, precision=0.6667, recall=0.8421, F1=0.7442
  - Random Forest: TP=17, FP=4, FN=2, TN=36, accuracy=0.8983, precision=0.8095, recall=0.8947, F1=0.85
  Row IDs and true labels are identical and in the same order across the LR/Dummy file, the RF file and the split manifest's val_ids (59 rows, 19 at-risk / 40 not-at-risk). Validation only — test set not opened.
- Reviewer decision/date: [pending until performed]

## Validation comparison (all three candidates)
Population: UCI Mathematics; N=59 validation records; class 1 = int(G3<10); threshold=0.5.

| Candidate | TP/FP/FN/TN | Accuracy | Precision | Recall | F1 | Undefined denominator notes |
|---|---|---|---|---|---|---|
| Dummy most-frequent (reference only) | 0/0/19/40 | 0.6780 | 0.0 | 0.0 | 0.0 | precision undefined (0/0, reported 0.0) |
| Logistic Regression | 16/8/3/32 | 0.8136 | 0.6667 | 0.8421 | 0.7442 | none |
| Random Forest | 17/4/2/36 | 0.8983 | 0.8095 | 0.8947 | 0.85 | none |

Class counts: 40 not-at-risk (class 0), 19 at-risk (class 1), N=59.

# S3-ST-01 evidence — Step 4
- Reviewed commit and artifact paths: ml/audit_validation_s3.py output (selection block); docs/evaluation-protocol.md section 4 (decision rule)
- Command and exit: see Step 3 above
- Measured values / limitations: Per the precommitted rule (select the candidate with the higher validation F1 for class 1; tie only if the two F1 values differ by ≤0.001), Random Forest (F1=0.85) beats Logistic Regression (F1=0.7442) by 0.1058 — not a tie. **Random Forest is selected.** Dummy is a reference only and was not eligible for selection.
- Protocol deviation to log (flagged by Carla in docs/reports/sprint-03-rf-report.md): the protocol specifies Logistic Regression with solver=liblinear, C=1, but S2-AI-01 trained it with scikit-learn's default solver (lbfgs), C=1, max_iter=1000, class_weight='balanced', random_state=42. This does not change the Step 4 decision (RF wins by a wide margin either way) but is recorded here as a deviation from the written protocol.
- Reviewer decision/date: [pending until performed]

# S3-ST-01 evidence — Step 5
- Reviewed commit and artifact paths: ml/artifacts/val_metrics_rf.json, val_metrics_lr.json, val_metrics_baseline.json
- Command and exit: see Step 3 above
- Measured values / limitations: Threshold confirmed unchanged at the preregistered 0.5 for all three candidates. Class/sample counts: N=59 validation rows, 19 at-risk (32.2%) / 40 not-at-risk. Small-sample/domain limits (unchanged from docs/evaluation-protocol.md section 6): validation (~59 rows) and test (~60 rows) contain only about 19–20 positive cases each, so one or two students can shift F1 noticeably; data come from one school and one subject and do not transfer automatically to other students. No bootstrap or formal significance test was run or is required for this core check.
- Reviewer decision/date: [pending until performed]

# S3-ST-01 evidence — Step 6: Freeze record
```
freeze_record = {
  "candidate": "RandomForestClassifier",
  "validation_rule": "Select the candidate with the higher validation F1 for class 1 (docs/evaluation-protocol.md section 4); tie only if F1 values differ by <= 0.001, in which case Logistic Regression wins. Dummy is a reference only.",
  "threshold": 0.5,
  "validation_ids_hash": "59985ee9eb2a09c59e2ada52212f49ffa33f58fcf39cd54efd6e190055750436",
  "timestamp": "2026-11-27 00:45",
  "reviewed_by": "[pending — Carla Susana López Puma]"
}
# Test metrics remain absent — test_sha256 61e5e4aac60f2284619ae1d9bccdd64d2742e5dd2e2314aa89084704be436daa recorded in split_manifest.json but not opened.
```
The selected pipeline and threshold are now frozen: no refitting on train+validation, no further tuning. Nothing about this choice changes after test results are seen.

# S3-ST-01 — Step 7: Publish
- Commit SHA: c1747e2f2777d0ad27cb6bc35538725007033a58
- PR: (https://github.com/Student-performance/Student_performance/pull/20)
- Reviewer: Carla Susana López Puma — review requested [27.11.2026]