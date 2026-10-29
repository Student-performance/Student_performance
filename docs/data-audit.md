# UCI source audit

Source: https://archive.ics.uci.edu/static/public/320/student+performance.zip

SHA-256: e47f9ee225e1ee6e69b7564e6dac7123e80b8486677fe111f351964cef5dec80

Citation: Cortez, P. (2008). Student Performance [Dataset]. UCI Machine Learning Repository. https://doi.org/10.24432/C5TG7T

License: CC BY 4.0, https://creativecommons.org/licenses/by/4.0/ (see https://archive.ics.uci.edu/dataset/320/student+performance).

## Measured source checks
- row_count: 395
- column_count: 33
- missing_cells: 0
- invalid_cells: 0
- duplicate_observations: 0

G2/G3 are excluded from model features. G3 is only the offline target source. Retrospective educational experiment only. Field availability at the end of Period 1 is not established.

## Canonical Inference Feature Allowlist (31 Attributes)
1. school, 2. sex, 3. age, 4. address, 5. famsize, 6. Pstatus, 7. Medu, 8. Fedu,
9. Mjob, 10. Fjob, 11. reason, 12. guardian, 13. traveltime, 14. studytime,
15. failures, 16. schoolsup, 17. famsup, 18. paid, 19. activities, 20. nursery,
21. higher, 22. internet, 23. romantic, 24. famrel, 25. freetime, 26. goout,
27. Dalc, 28. Walc, 29. health, 30. absences, 31. G1

STRICTLY EXCLUDED: G2, G3 (target/leakage)

## Ethical Notice & Deployment Constraints
- Retrospective course demonstration only.
- Predictions represent statistical risk correlations, not deterministic human student evaluations.
- Never use for academic tracking or student penalties without human review.