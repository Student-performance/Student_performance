const crypto = require('node:crypto');
const db = require('../db/connection');

function requireText(value, name) {
  if (typeof value !== 'string' || !value) throw new Error(`${name} required`);
}

function saveCompletedRun({ accountId, datasetId, modelVersion, schemaVersion, threshold, results }) {
  requireText(accountId, 'Authenticated account');
  requireText(datasetId, 'datasetId');
  requireText(modelVersion, 'modelVersion');
  requireText(schemaVersion, 'schemaVersion');
  if (typeof threshold !== 'number' || !(threshold >= 0 && threshold <= 1)) throw new Error('threshold must be a number between 0 and 1');
  if (!Array.isArray(results) || results.length === 0) throw new Error('results required');

  return db.transaction(() => {
    // Validate everything inside the transaction before any write.
    if (!db.get('SELECT id FROM datasets WHERE id = ? AND account_id = ?', datasetId, accountId)) throw new Error('Dataset not found');
    const records = db.all('SELECT id, row_identifier FROM student_rows WHERE dataset_id = ?', datasetId);
    const idByLabel = new Map(records.map(r => [r.row_identifier, r.id]));
    const seen = new Set();
    for (const r of results) {
      const label = r && r.row_identifier;
      if (typeof label !== 'string' || !idByLabel.has(label)) throw new Error(`Unknown record for this dataset: ${label}`);
      if (r.row_id !== undefined && r.row_id !== label) throw new Error(`Mismatched row_id for ${label}`);
      if (r.student_row_id !== undefined && r.student_row_id !== idByLabel.get(label)) throw new Error(`Other-dataset student_row_id for ${label}`);
      if (seen.has(label)) throw new Error(`Duplicate record: ${label}`);
      seen.add(label);
      if (typeof r.risk_score !== 'number' || !(r.risk_score >= 0 && r.risk_score <= 1)) throw new Error(`Invalid risk_score for ${label}`);
      if (r.risk_flag !== undefined) {
        const expectedFlag = r.risk_score >= threshold;
        const validFlag = typeof r.risk_flag === 'boolean'
          ? r.risk_flag === expectedFlag
          : (r.risk_flag === 0 || r.risk_flag === 1) && r.risk_flag === Number(expectedFlag);
        if (!validFlag) throw new Error(`Invalid risk_flag for ${label}`);
      }
    }
    if (seen.size !== records.length) throw new Error(`Missing results: expected ${records.length}, got ${seen.size}`);

    const runId = crypto.randomUUID();
    const atRisk = results.filter(r => r.risk_score >= threshold).length;
    db.run(
      'INSERT INTO runs (id, dataset_id, account_id, model_version, schema_version, threshold, total_records, at_risk_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      runId, datasetId, accountId, modelVersion, schemaVersion, threshold, results.length, atRisk
    );
    const insert = db.prepare('INSERT INTO prediction_results (id, run_id, student_row_id, risk_score, risk_flag) VALUES (?, ?, ?, ?, ?)');
    for (const r of results) {
      insert.run(crypto.randomUUID(), runId, idByLabel.get(r.row_identifier), r.risk_score, r.risk_score >= threshold ? 1 : 0);
    }
    return { id: runId, total_records: results.length, at_risk_count: atRisk };
  })();
}

function savePredictionRun(params) {
  return saveCompletedRun(params).id;
}
module.exports = { saveCompletedRun, savePredictionRun };

function clampInt(value, fallback, min, max) {
  const n = Number.parseInt(value, 10);
  return Number.isInteger(n) ? Math.min(Math.max(n, min), max) : fallback;
}

function getOwnedRun({ accountId, runId, page = 1, pageSize = 20 }) {
  requireText(accountId, 'Authenticated account');
  if (typeof runId !== 'string' || !runId) return null;
  const run = db.get(
    'SELECT runs.*, d.filename FROM runs JOIN datasets d ON d.id = runs.dataset_id WHERE runs.id = ? AND runs.account_id = ?',
    runId, accountId
  );
  if (!run) return null;
  const size = clampInt(pageSize, 20, 1, 100);
  const totalResults = db.get('SELECT COUNT(*) AS n FROM prediction_results WHERE run_id = ?', runId).n;
  const totalPages = Math.max(1, Math.ceil(totalResults / size));
  const current = clampInt(page, 1, 1, totalPages);
  const results = db.all(
    `SELECT pr.id, sr.row_identifier, sr.g1, pr.risk_score, pr.risk_flag
       FROM prediction_results pr
       JOIN student_rows sr ON sr.id = pr.student_row_id
      WHERE pr.run_id = ?
      ORDER BY sr.row_index
      LIMIT ? OFFSET ?`,
    runId, size, (current - 1) * size
  );
  return { run, results, pagination: { page: current, pageSize: size, totalPages, totalResults } };
}

function listOwnedRuns({ accountId, limit = 10 }) {
  requireText(accountId, 'Authenticated account');
  return db.all(
    'SELECT * FROM runs WHERE account_id = ? ORDER BY created_at DESC, id LIMIT ?',
    accountId, clampInt(limit, 10, 1, 100)
  );
}
module.exports.getOwnedRun = getOwnedRun;
module.exports.listOwnedRuns = listOwnedRuns;
