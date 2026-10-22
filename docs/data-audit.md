# Data audit — S1-AI-01

Owner: Carla Susana López Puma (AI) · Reviewer: Madina Khaimuldina (ST) · Sprint 1

## Source

We use a single subject file from the UCI Student Performance dataset: `student-por.csv` (Portuguese language course). The Mathematics file (`student-mat.csv`) is deliberately not combined with it, because some students appear in both files and merging them would duplicate people across the training and test data.

Source: UCI Machine Learning Repository, *Student Performance* (dataset id 320), https://archive.ics.uci.edu/dataset/320/student+performance. Citation: P. Cortez and A. Silva, "Using Data Mining to Predict Secondary School Student Performance", Proceedings of the 5th FUture BUsiness TEChnology Conference (FUBUTEC 2008), Porto, Portugal, 2008. License: CC BY 4.0.

The raw CSV is not committed to the repository. To reproduce, download the zip from the link above, extract `student.zip`, place `student-por.csv` in `data/` and check the hash below.

## Audit results

These figures come from running `python ml/audit_data.py data/student-por.csv` (pandas 3.1.0).

| Check | Result |
|---|---|
| SHA-256 | `a7594a11d7771c0efe1a740824e0e833da9c4cad07c39a9766a874575563fb3f` |
| Rows × columns | 649 × 33 |
| Missing values | None |
| Out-of-range values (G1, G2, G3 in 0–20; failures 0–4; studytime 1–4) | None |
| Exact duplicate rows | 0 |
| Grades equal to 0 | G1 = 1, G2 = 7, G3 = 15 |
| Target `G3 < 10` | 100 fail (15.4%) · 549 pass (84.6%) |

The data is clean in the technical sense, with no missing, invalid or duplicated rows, so no rows were removed. The target is imbalanced: only about one student in seven fails. Accuracy alone would therefore be misleading (always predicting "pass" already gives about 85%), and the evaluation metric (e.g. recall on the fail class or balanced accuracy) will be chosen with ST in Sprint 2. A grade of exactly 0 in G3 probably means the student did not sit the final assessment rather than scoring zero. Those rows are kept and count as "fail": a student who drops out or does not sit the final assessment is a case the system should flag, and removing them would make the results look better than they are.

## Research question and inputs

Task (decided by AI, following the card definition; shared with ST for review): classify whether a student's final Portuguese grade will be below 10/20 (`target = int(G3 < 10)`), computed only during offline training.

Candidate inputs are `G1` (first-period grade, 0–20), `failures` (number of past class failures, 0–3, where 4 means 3 or more) and `studytime` (weekly study time, coded 1 = <2h, 2 = 2–5h, 3 = 5–10h, 4 = >10h). `G2` and `G3` are excluded from inference inputs: G3 is the target itself, and G2 is a second-period grade that arrives too late to be useful and is so close to G3 that it would leak the answer.

## Timing and limits

G1 only exists after the first grading period, so any prediction using it can be made from that point onward and not at the start of the school year. The dataset does not state when the questionnaire fields (`failures`, `studytime`) were collected. Unless we find evidence, this project should be presented as a retrospective educational experiment and not as a validated early-warning system.

The data comes from two Portuguese secondary schools in 2005–2006, and `studytime` is self-reported. Results may not transfer to other schools, countries, years or grading systems, and the model must not be used to make decisions about individual real students.
