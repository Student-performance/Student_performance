# S2-ST-01 evidence – Step 1
- Reviewed commit and artifact paths: e8d290b (PR #13: ml/artifacts/split_manifest.json, ml/artifacts/val_metrics_baseline.json, ml/artifacts/val_metrics_lr.json, ml/artifacts/val_predictions_lr.json, docs/reports/sprint-02-ml-report.md)
- - Command and exit: git fetch origin (Exit code 0); git show origin/ai/s2-ai-01:ml/artifacts/split_manifest.json (Exit code 0)
- Measured values / limitations: Source/split/validation handoff read; population=395 (276 train / 59 val / 60 test), binary target pass/fail (G3 >= 10); validation only, no held-out model evaluation
- Reviewer decision/date: [pending until performed]

# S2-ST-01 evidence — Step 2
- Reviewed commit and artifact paths: exercises/s2-st-g1.js (commit hash pending final push)
- Command and exit: node --check 'exercises/s2-st-g1.js' (Exit code 0); node exercises/s2-st-g1.js (Exit code 0)
- Measured values / limitations: count=5, mean=10, min=0, max=20; validation only, no held-out model evaluation
- Reviewer decision/date: [pending until performed]

## Synthetic G1 oracle
For [10,15,5,20,0]: count=5, mean=10, min=0, max=20. These values are hand-checkable input statistics, not model metrics. Record the exercise output and share with W2/W3.

# S2-ST-01 evidence — Step 3
- Reviewed commit and artifact paths: tests/test_g1_statistics.js; src/services/dataset.js (from main)
- Command and exit: npm.cmd install --ignore-scripts (Exit code 0); npm.cmd rebuild better-sqlite3 (failed — native build tools not available); node tests/test_g1_statistics.js → Error: Could not locate the bindings file
- Measured values / limitations: test logic verified by code review — calculateG1Stats in src/services/dataset.js handles both {g1: N} and {G1: N}, and its implementation matches the Step 2 oracle (count=5, mean=10, min=0, max=20). Could not execute: dataset.js unconditionally requires ../db/connection at the top of the file, loading better-sqlite3's native binding even though this test never touches the database. No prebuilt binary exists for Node v26.13.0, and native build tools are not installed on this machine.
- Reviewer decision/date: [pending until performed]

# S2-ST-01 evidence — Step 4
- Reviewed commit and artifact paths: ml/artifacts/split_manifest.json, ml/artifacts/val_predictions_lr.json, ml/artifacts/val_metrics_lr.json, ml/artifacts/val_metrics_baseline.json, data/val.csv (from main, merge commit after Update from main)
- Command and exit: .venv/Scripts/python.exe -c "import ast; ..." (Exit code 0); .venv/Scripts/python.exe ml/audit_validation.py (Exit code 0)
- Measured values / limitations: Independent recomputation from val_predictions_lr.json matches claimed metrics exactly — LR: TP=16, FP=8, FN=3, TN=32, accuracy=0.8136, precision=0.6667, recall=0.8421, F1=0.7442; Dummy: TP=0, FP=0, FN=19, TN=40, accuracy=0.6780, precision undefined (reported 0.0), recall=0.0, F1=0.0. Class counts: 40 not-at-risk, 19 at-risk (N=59). Validation only, no held-out model evaluation; no final model selected (Random Forest comparison deferred to Sprint 3).
- Reviewer decision/date: [pending until performed]

## Validation comparison (copy actual audit output)
Population: UCI Mathematics; N=59 validation records; class 1=int(G3<10); threshold=0.5.
| Candidate | TP/FP/FN/TN | Accuracy | Precision | Recall | F1 | Undefined denominator notes |
|---|---|---|---|---|---|---|
| Dummy most-frequent | 0/0/19/40 | 0.6780 | 0.0 | 0.0 | 0.0 | precision undefined (0/0, reported 0.0) |
| Logistic Regression | 16/8/3/32 | 0.8136 | 0.6667 | 0.8421 | 0.7442 | none |
Class counts: 40 not-at-risk (class 0), 19 at-risk (class 1), N=59. Accuracy can hide poor recall under class imbalance — the Dummy's 0.678 accuracy looks reasonable but it never identifies a single at-risk student (recall=0.0). Zero denominators use numeric 0 with an explicit undefined note. This is validation, not held-out evaluation; no final winner until Sprint 3 RF comparison.

# S2-ST-01 evidence — Step 6
- Reviewed commit and artifact paths: ml/audit_validation.py; ml/artifacts/split_manifest.json, val_predictions_lr.json, val_metrics_lr.json, val_metrics_baseline.json; data/val.csv; src/services/dataset.js; exercises/s2-st-g1.js; tests/test_g1_statistics.js (all from main after Update from main merge)
- Command and exit: see Steps 1–5 above for individual commands and exit codes
- Measured values / limitations: Independent audit (Step 4) confirms LR and Dummy validation metrics exactly match Carla's reported figures (abs_tol=0.000051), split IDs are disjoint and match the manifest, and labels in val.csv agree with true_label in the predictions file. This is validation only (N=59, 19 positives) — no held-out/test evaluation was performed, and no final model is selected: the Random Forest comparison and final Dummy/LR/RF selection remain open until Sprint 3. Remaining issue: Step 3 (G1 service test) could not be executed — dataset.js eagerly requires ../db/connection, and better-sqlite3 has no prebuilt binary for Node v26.13.0 with native build tools unavailable on this machine; the service's logic was verified by code review instead (calculateG1Stats correctly handles both {g1} and {G1} inputs and matches the Step 2 oracle). This blocker should be resolved before Sprint 3 if row-level service testing becomes required there.
- Reviewer decision/date: [pending until performed]

# S2-ST-01 — Step 7: Publish
- Commit SHA: 78554ef0ed1dc430d5746c97270cd0fbd5e3a24a
- PR: (https://github.com/Student-performance/Student_performance/pull/12)
- Reviewer: Carla Susana López Puma — review requested [13.11.2026]