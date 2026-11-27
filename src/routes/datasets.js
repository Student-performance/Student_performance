const router = require('express').Router();
const csrfProtection = require('csurf')();
const upload = require('../middleware/upload');
const { ensureAuthenticated } = require('../middleware/auth');
const { importCsvDataset } = require('../services/dataset');
const db = require('../db/connection');
router.use(ensureAuthenticated);
router.get('/upload', (req, res) => res.render('datasets/upload', { title: 'Upload CSV', error: null }));
router.post('/upload', upload.single('dataset'), csrfProtection, async (req, res, next) => {
    try {
        if (!req.file) throw new Error('Choose a CSV file');
        const dataset = await importCsvDataset({ buffer: req.file.buffer, filename: req.file.originalname, accountId: req.session.userId });
        res.redirect(`/datasets/${dataset.id}`);
    } catch (error) {
        res.locals.csrfToken = req.csrfToken();
        res.status(400).render('datasets/upload', { title: 'Upload CSV', error: error.message });
    }
});
router.get('/', (req, res) => {
    const accountId = req.session.userId;
    const total = db.get('SELECT COUNT(*) AS n FROM datasets WHERE account_id = ?', accountId).n;
    const totalPages = Math.max(1, Math.ceil(total / 25));
    const page = Math.min(totalPages, Math.max(1, Number.parseInt(req.query.page, 10) || 1));
    const datasets = db.all('SELECT * FROM datasets WHERE account_id = ? ORDER BY created_at DESC, id DESC LIMIT 25 OFFSET ?', accountId, (page - 1) * 25);
    const recentRuns = db.all('SELECT runs.*, datasets.filename FROM runs JOIN datasets ON datasets.id = runs.dataset_id WHERE runs.account_id = ? ORDER BY runs.created_at DESC, runs.id DESC LIMIT 10', accountId);
    res.render('datasets/index', { title: 'My datasets', datasets, recentRuns, pagination: { page, totalPages, total } });
});
router.get('/:id', (req, res) => {
    const dataset = db.get('SELECT * FROM datasets WHERE id = ? AND account_id = ?', req.params.id, req.session.userId);
    if (!dataset) return res.status(404).render('errors/404', { title: 'Not found' });
    const totalPages = Math.max(1, Math.ceil(dataset.row_count / 25));
    const page = Math.min(totalPages, Math.max(1, Number.parseInt(req.query.page, 10) || 1));
    const rows = db.all('SELECT * FROM student_rows WHERE dataset_id = ? ORDER BY row_index LIMIT 25 OFFSET ?', dataset.id, (page - 1) * 25);
    res.render('datasets/show', {
        title: dataset.filename,
        dataset,
        rows,
        predictionAvailable: true,
        csrfToken: (res.locals && res.locals.csrfToken) || (req.csrfToken && req.csrfToken()) || '',
        pagination: { page, totalPages, total: dataset.row_count }
    });
});
module.exports = router;
