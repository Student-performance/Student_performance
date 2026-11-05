function calculateG1Stats(rows) {
  if (!rows || rows.length === 0) return { count: 0, mean: 0, min: 0, max: 0 };
  let sum = 0, min = Infinity, max = -Infinity;
  for (const r of rows) {
    const val = Number(r.G1 !== undefined ? r.G1 : r.g1);
    sum += val;
    if (val < min) min = val;
    if (val > max) max = val;
  }
  return { count: rows.length, mean: round(sum / rows.length, 2), min, max };
}
function round(val, d) { const factor = Math.pow(10, d); return Math.round(val * factor) / factor; }
module.exports.calculateG1Stats = calculateG1Stats;

const db = require('../db/connection');
const crypto = require('crypto');

function persistDatasetAtomic({ accountId, filename, rows, stats }) {
  return db.transaction(() => {
    const datasetId = crypto.randomUUID();
    db.run(
      'INSERT INTO datasets (id, account_id, filename, row_count, g1_count, g1_mean, g1_min, g1_max) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [datasetId, accountId, filename, rows.length, stats.count, stats.mean, stats.min, stats.max]
    );
    const insertRow = db.prepare(
      'INSERT INTO student_rows (id, dataset_id, row_index, row_identifier, features_json, g1) VALUES (?, ?, ?, ?, ?, ?)'
    );
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const rowId = r.row_identifier || `ROW-${String(i + 1).padStart(3, '0')}`;
      const g1 = r.G1 !== undefined ? r.G1 : r.g1;
      insertRow.run(crypto.randomUUID(), datasetId, i + 1, rowId, JSON.stringify(Object.fromEntries(Object.entries(r).filter(([key]) => key !== 'row_identifier'))), g1);
    }
    return { id: datasetId, row_count: rows.length, ...stats };
  })();
}
module.exports.persistDatasetAtomic = persistDatasetAtomic;

const { parseCsv } = require('./csvParser');
const { validateStudentRows } = require('../validators/studentSchema');

async function importCsvDataset({ buffer, filename, accountId }) {
  if (typeof filename !== 'string' || !/\.csv$/i.test(filename)) throw new Error('Choose a .csv file');
  if (typeof accountId !== 'string' || !accountId) throw new Error('Authenticated account required');
  const { rows } = parseCsv(buffer);
  if (rows.length > 500) throw new Error('Dataset exceeds maximum limit of 500 records');
  const { isValid, errors, validRows } = validateStudentRows(rows);
  if (!isValid) throw new Error(`Validation failed:\n${errors.slice(0, 50).join('\n')}`);
  const stats = calculateG1Stats(validRows);
  return persistDatasetAtomic({ accountId, filename, rows: validRows, stats });
}
module.exports.importCsvDataset = importCsvDataset;
