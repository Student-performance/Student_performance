# Edupredict — Evaluation Protocol
Owner: Madina Khaimuldina (ST) · Reviewer: Carla Susana López Puma (AI) · Sprint 1

## 1. Product, scope and changes
Edupredict is a student web-project prototype intended to estimate the risk of a final grade below 10 using first-period grades and selected student information. This experiment evaluates whether simple models can support that aim; it does not establish a reliable real-world early-warning service.

Revision: use the 395-record Mathematics-subject dataset (student-mat.csv) as the working basis. Select the model using validation F1 for class 1. These rules are defined in Sprint 1; model training and measured scores may follow in Sprint 2. Final confirmation of the dataset change is still required.

The broad topic is approved. The reduced scope and whether a locally running website/demo is sufficient remain subject to instructor confirmation. Offline model comparison is one part of the project; it does not by itself remove the website deliverable.

## 2. Dataset, target and inputs
- Data: UCI Student Performance, student-mat.csv, 395 observations. Do not combine it with the Portuguese dataset. Verify the actual CSV against the audit before splitting.
- Target: class 1 if `G3 < 10`; class 0 if `G3 >= 10`. Retain zero final grades; do not automatically interpret them as dropout.
- Inputs: `G1`, `failures`, `studytime`, matching the current inference contract. Demographics are not included.
- Intended prediction point: after the first grading period, once G1 is available. Exclude G2 because it is later information; exclude G3 because it defines the outcome. Confirm the availability of the other inputs at that point. Until their collection timing is verified, describe results as retrospective.
- Verify the meaning of the `failures` categories with Carla before preprocessing.

## 3. Shared split and leakage prevention
Use one stratified split, preserving approximately the same class proportions: 276 training / 59 validation / 60 test observations. With seed 42, first allocate 70% to training, then split the remainder equally into validation and test, stratifying both stages. Record library versions and save the actual row assignments; a seed alone is not a complete reproducibility record.

Assign stable source-row IDs. Check full-row duplicates before splitting; stop and resolve any found rather than silently changing the sample size. Check that split IDs are disjoint and cover all 395 records, and that duplicate full-row hashes do not cross splits. Record input-file hash and class counts per split.

Fit all preprocessing only on training data, then apply it unchanged to validation and test. Keep test labels and scores out of model selection.

## 4. Models and selection
Compare a most-frequent Dummy baseline, Logistic Regression and one fixed Random Forest. Dummy is a reference, not a candidate for the tie-break rule.

Proposed fixed settings — Carla to confirm before training:
- Preprocessing: standardize G1; one-hot encode failures and studytime after confirming their allowed categories.
- Logistic Regression: L2 penalty, C=1, liblinear solver, max_iter=1000, no class weighting, seed 42.
- Random Forest: 100 trees, max_depth=3, min_samples_leaf=5, max_features=sqrt, bootstrap enabled, no class weighting, seed 42.
Record the complete effective configuration and library versions. Do not tune additional settings on validation results.

Predict class 1 when its model probability is >= 0.5. Select Logistic Regression or Random Forest by the highest validation F1 for class 1; an exact tie before rounding selects Logistic Regression. Do not adjust the threshold.

Freeze the selected training-fitted pipeline and threshold. Do not refit on training plus validation under this protocol. Then evaluate the selected model and the predeclared Dummy baseline once on the test set. No further selection uses test results.

## 5. Reporting and manual check
Report F1, precision, recall, TP, FP, FN, TN, total sample count and class counts. Clearly distinguish validation comparisons from final test results. Do not claim calibrated probabilities, causality or a guaranteed performance level.

If a metric's denominator is zero, use 0.0 as the software reporting convention and explicitly mark that metric as undefined for that case.

## 6. Agreement and evidence
Madina (ST) maintains the statistical protocol; Carla (AI) reviews its compatibility with the data and implementation. Confirm the 395-record dataset change, category meanings and proposed model settings, then commit the agreed protocol before training. Log any later deviations with reasons.

This document states planned rules, not proof that checks or training have run. Attach actual check outputs when available. Separate Sprint 1 deliverables remain: requirements with observable acceptance conditions and the course-document inventory; the instructor scope-confirmation draft; task evidence, actual hours and the named review request.

Basis: S1-ST-01 task card, the supplied AI data audit and inference contract, and the team's reported decision to use F1. Dataset counts still require verification against the CSV.
