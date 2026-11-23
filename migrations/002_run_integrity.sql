CREATE TRIGGER IF NOT EXISTS trg_results_score_bounds
BEFORE INSERT ON prediction_results
WHEN NEW.risk_score < 0 OR NEW.risk_score > 1
BEGIN
  SELECT RAISE(ABORT, 'risk_score must be between 0 and 1');
END;

CREATE TRIGGER IF NOT EXISTS trg_results_same_dataset
BEFORE INSERT ON prediction_results
WHEN (SELECT dataset_id FROM student_rows WHERE id = NEW.student_row_id)
  IS NOT (SELECT dataset_id FROM runs WHERE id = NEW.run_id)
BEGIN
  SELECT RAISE(ABORT, 'result record must belong to the run dataset');
END;

CREATE TRIGGER IF NOT EXISTS trg_runs_owner_matches_dataset
BEFORE INSERT ON runs
WHEN (SELECT account_id FROM datasets WHERE id = NEW.dataset_id) IS NOT NEW.account_id
BEGIN
  SELECT RAISE(ABORT, 'run account must own the dataset');
END;
