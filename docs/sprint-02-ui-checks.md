# Sprint 2 browser acceptance — record actual observations

Use the local target repository, not the planning-site repository.

**Current status:** Full browser acceptance testing is blocked pending W1 router and W3 data-layer integration.

Terminal A: `node server.js` (leave running). Use Terminal B for later commands; Ctrl+C stops Terminal A after testing.

Open http://localhost:3000/login in a browser once the backend integration is available.

For each row replace `[actual]` with PASS/FAIL and the observed result. A compilation result is not a browser observation. Leave failures open and name their owner.

| Case | Exact action | Expected | Actual |
|---|---|---|---|
| Empty list | Register/sign in with a new synthetic account; open /datasets | Empty dataset message and upload link | NOT TESTED — backend integration pending |
| Upload guidance | Open /datasets/upload | Feature list, UTF-8 comma/semicolon format, 1 MiB/500-row limits, native picker and CSRF-protected form | NOT TESTED — browser verification pending |
| Success/submitting | Select data/examples/student_two_rows.csv and submit once | Button shows validating/importing; redirect to saved dataset | NOT TESTED — backend integration pending |
| Observed values | Compare detail tiles with the two G1 values in that synthetic file | Row count 2; mean/min/max computed from G1, clearly observed statistics | NOT TESTED — backend integration pending |
| Refresh | Refresh the saved detail URL | No second import | NOT TESTED — backend integration pending |
| Invalid input | Make a separate copy of the synthetic CSV with G1=25 in one row; upload it | Error states row/column/reason, summary receives focus; reselect guidance; no success and no new dataset | NOT TESTED — backend integration pending |
| Row paging | Upload a synthetic 26-row file (or ask W1 to show its HTTP fixture); inspect detail Next/Previous | 25 rows then 1, same dataset path, no overflow beyond scrollable table | BLOCKED — W1 router/W3 data layer |
| Dataset-list paging | Use an account with 26 synthetic uploads; open /datasets?page=1 then page=2 | 25 datasets then 1; Next/Previous retain /datasets path | BLOCKED — W1 router/W3 data layer |
| Keyboard/375px | Set viewport width 375px; tab through form, table links and paging | Visible focus, readable errors, single-column stat grid and scrollable wide table | NOT TESTED — browser verification pending |
| Future boundary | Inspect detail before frozen model and runs router exist | Prediction unavailable text; no working prediction claim | NOT TESTED — browser verification pending |

Record browser/version, tested commit, actual test date and reviewer/PR.

W1 Step 7 supplies automated two-user, missing/foreign-ID, statistics and pagination assertions after this view handoff merges.

Retain the complete error views supplied in Sprint 1.

## Outstanding dependencies

- W1: Dataset router, integration and application-level acceptance support.
- W3: Dataset persistence, queries and validation integration.
- W2: Frontend templates, CSS and JavaScript implemented; browser acceptance pending integration.