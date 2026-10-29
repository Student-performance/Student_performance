# Edupredict — Evaluation Protocol (S1-ST-01, Sprint 1)
Owner: Madina Khaimuldina (ST) · Reviewer: Carla Susana López Puma (AI)
Status: DRAFT until the items in Section 7 are confirmed and this file is committed. It states planned rules only; no checks or training have been run yet.

## 1. Purpose and scope status
Edupredict is a student web-project prototype that estimates the risk of a final grade below 10 (Portuguese 0–20 scale) from first-period grades and a few student fields. This experiment tests whether simple models can support that aim. It does not establish a reliable real-world early-warning service.

- Dataset: the 395-record Mathematics file (`student-mat.csv`). This replaces the earlier dataset choice; the change still needs final confirmation (Section 7).
- Topic: the broad topic is approved. The reduced scope and whether a locally running website/demo is sufficient are NOT yet confirmed by the instructor. Offline model comparison is one part of the project and does not by itself remove the website deliverable.
- Why F1 for class 1: the at-risk class is the minority class, so accuracy would reward a model that never flags anyone.

## 2. Data, target and inputs
- Data: UCI Student Performance, `student-mat.csv` (395 rows, 33 columns, `;` separator). Do not combine it with the Portuguese-language subject file (`student-por.csv`). Verify the actual CSV against Carla's audit before splitting.
- Target: class 1 if `G3 < 10`, class 0 if `G3 >= 10`. Keep rows with `G3 = 0`; do not interpret them as dropout.
- Inputs: All 31 canonical features from Carla's Mathematics audit (30 demographic and school attributes plus `G1`).
- Excluded: `G2` (later information) and `G3` (defines the outcome).
- Intended prediction point: after the first grading period, when `G1` exists. The availability of all other features at that exact moment is unverified, so results are described as retrospective, with no intervention-window or causal-benefit claim.
- Intended population and canonical feature list: taken directly from Carla's Mathematics audit (33 total columns minus `G2` and `G3`).
- Category meanings of `failures` (the UCI description says values above 2 are coded as a single "many" category; check what the actual file contains) and `studytime` are confirmed with Carla before preprocessing.

## 3. Shared split and leakage control
- One stratified split on the target, seed 42, in two stages: (1) 70% train / 30% remainder; (2) remainder split 50/50 into validation and test, stratified. Expected sizes: 276 train / 59 validation / 60 test. Check the sizes after running; do not assume them.
- Assign a stable source-row ID to every record. Save the actual ID lists per split, library versions, the input-file hash and class counts per split. A seed alone is not a reproducibility record.
- Before splitting, check for exact full-row duplicates. If any exist, stop and resolve them with the team; do not silently change the sample size.
- Verify that the three ID sets are disjoint and together cover all 395 records.
- Fit all preprocessing on training data only, then apply it unchanged to validation and test. Test labels and scores never enter model selection.

## 4. Models and selection
Candidates: Logistic Regression and one fixed Random Forest. The most-frequent Dummy classifier is a reference only and does not take part in selection.

Proposed fixed settings (Carla confirms before training):
   - Preprocessing: one `ColumnTransformer` fit on the training split only. The 14 numeric features (`age`, `Medu`, `Fedu`, `traveltime`, `studytime`, `failures`, `famrel`, `freetime`, `goout`, `Dalc`, `Walc`, `health`, `absences`, `G1`) are standardized with `StandardScaler`; ordinal codes such as `failures` and `studytime` stay numeric. The 17 categorical features (`school`, `sex`, `address`, `famsize`, `Pstatus`, `Mjob`, `Fjob`, `reason`, `guardian`, `schoolsup`, `famsup`, `paid`, `activities`, `nursery`, `higher`, `internet`, `romantic`) are one-hot encoded with the category lists from `ml/contract.py` and `handle_unknown='ignore'`, so a category missing from one split does not crash the pipeline. Feature names and ranges follow `ml/schemas/schema-v1.json`.
- Logistic Regression: L2, C=1, liblinear, max_iter=1000, class_weight='balanced', seed 42.
- Random Forest: 100 trees, max_depth=5, min_samples_leaf=5, max_features=sqrt, bootstrap on, class_weight='balanced', seed 42.
- Record the full effective configuration. No further tuning on validation results.

Decision rule:
- Predict class 1 when P(class 1) >= 0.5. The threshold is fixed and is not adjusted.
- Select the candidate with the higher validation F1 for class 1. An exact tie (before rounding) selects Logistic Regression.
- Freeze the selected pipeline and threshold. Do not refit on train + validation.
- Evaluate the selected model and the Dummy baseline once on the test set. Nothing is selected or changed afterwards based on test results.

## 5. Reporting
- Report: F1, precision, recall, TP, FP, FN, TN, total sample size and class counts, separately for validation (comparison) and test (final).
- Zero denominator: if precision or recall has a zero denominator (for example, Dummy never predicts class 1, so precision is 0/0), report 0.0 as a software convention and mark the metric as undefined in that case.
- No claims of calibrated probabilities, causality or guaranteed performance.

## 6. Limitations
- The validation set (~59 rows) and test set (~60 rows) contain only about 20 positive cases each, so one or two students can change F1 noticeably. A small difference between candidates is not evidence that one is better.
- The data come from one school and one subject. Results do not transfer automatically to other students.

## 7. Agreement and evidence
Open before committing: (a) instructor confirmation of the scope and the dataset change; (b) Carla's confirmation of category meanings and model settings; (c) verification of the 395-row file against the audit.
After confirmation, commit this protocol before any training, and log later deviations with reasons. Attach actual check outputs when available.
Other Sprint 1 deliverables: requirements with observable acceptance conditions and the course-document inventory; the instructor scope-confirmation draft; task evidence, actual hours and the named review request.
