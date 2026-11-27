const router = require('express').Router();
const { ensureAuthenticated } = require('../middleware/auth');
const { executePrediction } = require('../services/predictionAdapter');
const { validatePredictionOutput } = require('../services/predictionValidator');
const { savePredictionRun } = require('../services/predictionRuns');
const db = require('../db/connection');
router.post('/datasets/:id/predict', ensureAuthenticated, async (req, res, next) => {
    try {
        const dataset = db.get('SELECT * FROM datasets WHERE id = ? AND account_id = ?', req.params.id, req.session.userId);
        if (!dataset) return res.status(404).render('errors/404', { title: 'Not found' });
        const rows = db.all('SELECT * FROM student_rows WHERE dataset_id = ? ORDER BY row_index', dataset.id);
        const input = rows.map(row => ({
            row_id: row.row_identifier, row_identifier: row.row_identifier,
            student_row_id: row.id, features: JSON.parse(row.features_json)
        }));
        const output = await executePrediction(input);
        validatePredictionOutput(output, input);
        const id = savePredictionRun({
            datasetId: dataset.id, accountId: req.session.userId,
            modelVersion: output.model_version, schemaVersion: output.schema_version, threshold: output.threshold, results: output.results
        });
        res.redirect(`/runs/${id}`);
    } catch (error) { next(error); }
});
router.get('/runs/:id', ensureAuthenticated, (req, res, next) => {
    try {
        const run = db.get('SELECT runs.*, datasets.filename FROM runs JOIN datasets ON datasets.id = runs.dataset_id WHERE runs.id = ? AND runs.account_id = ?', req.params.id, req.session.userId);
        if (!run) return res.status(404).render('errors/404', { title: 'Not found' });
        const totalPages = Math.max(1, Math.ceil(run.total_records / 25));
        const page = Math.min(totalPages, Math.max(1, Number.parseInt(req.query.page, 10) || 1));
        const results = db.all('SELECT prediction_results.*, student_rows.row_identifier, student_rows.g1 FROM prediction_results JOIN student_rows ON student_rows.id = prediction_results.student_row_id WHERE run_id = ? ORDER BY student_rows.row_index LIMIT 25 OFFSET ?', run.id, (page - 1) * 25);
        res.render('runs/show', { title: 'Prediction results', run, results, rows: results, dataset: { id: run.dataset_id, filename: run.filename }, pagination: { page, totalPages } });
    } catch (error) { next(error); }
});
module.exports = router;
