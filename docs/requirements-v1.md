# Edupredict — Requirements v1 (Sprint 1)
Owner: Madina Khaimuldina (ST) · Reviewer: Carla Susana López Puma (AI)
Status: DRAFT. Instructor scope confirmation is pending. No checks or training have been run; every condition below is a plan until its evidence is attached.

## 1. Product and scope
- Purpose: Edupredict is a student web-project prototype that estimates the risk of a final grade (`G3`) below 10 (0–20 scale) from the first-period grade and all canonical features (including demographic and school attributes).
- Nature: an offline, retrospective experiment. It gives no intervention guarantee, no causal claim and no real-time early warning, and it must not be used for decisions about real students.
- Deliverables: (a) the offline evaluation protocol and model comparison; (b) a locally running web demo. Whether a local demo is sufficient, and the reduced scope itself, are not yet confirmed by the instructor.

## 2. Acceptance conditions
Each condition is met only when the named evidence is attached to card S1-ST-01 or its follow-up cards.

| ID | Observable condition | How to check | Evidence |
|---|---|---|---|
| R1 | The working file is `student-mat.csv`: 395 rows, 33 columns, `;` separator; the SHA-256 hash is recorded. | Audit script output on this file. | Pending (Carla's audit is being redone for this file) |
| R2 | Target is `1` if `G3 < 10`, else `0`. Rows with `G3 = 0` are kept. Class counts overall and per split are recorded. | Printed counts. | Pending |
| R3 | Model inputs are all 31 canonical features from Carla's Mathematics audit (30 demographic and school attributes plus G1). G2 and G3 are excluded. | Feature list in the pipeline code. | Pending
| R4 | One stratified split with seed 42 gives 276 train / 59 validation / 60 test records. Split IDs are disjoint, together cover all 395 records, and are saved to a file. | Printed sizes and an ID-overlap check. | Pending |
| R5 | There are no exact duplicate rows. If any are found, the work stops and the team resolves them before training. | Duplicate count printed before the split. | Pending |
| R6 | Preprocessing (scaling, encoding) is fit on training data only and applied unchanged to validation and test. | Code review by Carla. | Pending |
| R7 | The candidates are Logistic Regression and one fixed Random Forest; the most-frequent Dummy is a reference only. Settings follow the protocol and are confirmed by Carla before training. | Config file or printed parameters, library versions. | Pending |
| R8 | Class 1 is predicted at probability >= 0.5. The model is chosen by the highest validation F1 for class 1; an exact tie selects Logistic Regression. | Validation table and the selected model name. | Pending |
| R9 | The selected model and the Dummy are scored once on the test set after the choice is frozen. | Single test-evaluation log. | Pending |
| R10 | Reports contain F1, precision, recall, TP, FP, FN, TN, sample size and class counts, validation and test shown separately. | Results table. | Pending |
| R11 | A zero denominator is reported as `0.0` and tagged as undefined (see Section 4). | Manual toy check below, then the code output. | Toy check done by hand below; code output pending |

## 3. Course-document inventory
| Document | Path | Owner | Status |
|---|---|---|---|
| Evaluation protocol | `docs/evaluation-protocol.md` | Madina | In review: PR #3 is open and not yet merged |
| Requirements v1 | `docs/requirements-v1.md` | Madina | Draft; awaiting review |
| Data audit and inference contract | AI deliverable (S1-AI-01) | Carla | In progress; being redone for `student-mat.csv` |
Scope-confirmation draft for the instructor | `docs/professor-scope-note.md` | Madina | Draft; not sent, no answer yet |
| Individual sprint summary | S1-ST-SUMMARY | Madina | Not started |

Complete this table against the official course document list before submission.

## 4. Manual metric check (toy example)
Definitions: Precision = TP / (TP + FP); Recall = TP / (TP + FN); F1 = 2TP / (2TP + FP + FN).

Example 1: TP = 3, FP = 1, FN = 2, TN = 4 (10 cases).
- Precision = 3/4 = 0.75; Recall = 3/5 = 0.60; F1 = 6/9 ≈ 0.667; accuracy = 7/10 = 0.70.

Example 2 (no positive predictions, as the Dummy gives): TP = 0, FP = 0, FN > 0.
- Precision = 0/0 → undefined; report `0.0` and tag `[UNDEFINED: ZERO DENOMINATOR]`.
- Recall = 0/FN = 0.0 (defined). F1 = 0.0; note that it was computed with an undefined precision.

## 5. Limits
- Results are retrospective. The collection time of `failures` and `studytime` is unverified, so no claim is made about when a prediction could be used in practice.
- The test set has about 60 records and about 20 positive cases, so scores are imprecise and a small difference between models is not evidence that one is better.
- The data come from one school and one subject (2005–2006), and `studytime` is self-reported.
