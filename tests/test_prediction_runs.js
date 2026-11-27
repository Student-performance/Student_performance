const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'runs-'));
const file = path.join(dir, 'test.sqlite');
process.env.DATABASE_PATH = file;
const db = require('../src/db/connection');
require('../src/db/migrate').runMigrations();
const { persistDatasetAtomic, calculateG1Stats } = require('../src/services/dataset');
const { validateStudentRows } = require('../src/validators/studentSchema');
const { saveCompletedRun, getOwnedRun, listOwnedRuns } = require('../src/services/predictionRuns');

const rows = validateStudentRows(require('../ml/examples/valid_two_rows.json')).validRows;
const count = t => db.get('SELECT COUNT(*) AS n FROM ' + t).n;
const state = () => JSON.stringify([count('runs'), count('prediction_results')]);
for (const [id, user] of [['A', 'alice'], ['B', 'bob']]) db.run('INSERT INTO accounts(id,email,username,password_hash) VALUES(?,?,?,?)', id, user + '@test.edu', user, 'hash');
const dsA = persistDatasetAtomic({ accountId: 'A', filename: 'a.csv', rows, stats: calculateG1Stats(rows) });
const dsB = persistDatasetAtomic({ accountId: 'B', filename: 'b.csv', rows, stats: calculateG1Stats(rows) });
const good = rows.map((r, i) => ({ row_identifier: r.row_identifier, risk_score: i ? 0.2 : 0.8 }));
const save = (over = {}) => saveCompletedRun({ accountId: 'A', datasetId: dsA.id, modelVersion: 'm1', schemaVersion: 's1', threshold: 0.5, results: good, ...over });

// Complete run: counts match and every record belongs to the run's dataset.
const run = save();
assert.equal(run.total_records, count('prediction_results'));
assert.equal(run.at_risk_count, 1);
assert.equal(db.get('SELECT COUNT(*) AS n FROM prediction_results pr JOIN runs r ON r.id=pr.run_id JOIN student_rows sr ON sr.id=pr.student_row_id WHERE sr.dataset_id <> r.dataset_id').n, 0);
const before = state();

// Missing, duplicate, unknown, out-of-range and other-owner input save nothing.
assert.throws(() => save({ results: good.slice(0, 1) }), /Missing results/);
assert.throws(() => save({ results: [good[0], good[0]] }), /Duplicate record/);
assert.throws(() => save({ results: [good[0], { row_identifier: 'ROW-999', risk_score: 0.1 }] }), /Unknown record/);
assert.throws(() => save({ results: [good[0], { ...good[1], risk_score: 1.5 }] }), /Invalid risk_score/);
assert.throws(() => save({ accountId: 'B' }), /Dataset not found/);
assert.equal(state(), before);

// Forced write failure on the second result leaves no run/result rows.
db.exec("CREATE TRIGGER fail_second BEFORE INSERT ON prediction_results WHEN NEW.risk_score = 0.2 BEGIN SELECT RAISE(ABORT,'injected failure'); END");
assert.throws(() => save(), /injected failure/);
assert.equal(state(), before);
db.exec('DROP TRIGGER fail_second');

// Database-level constraints.
const rowA = db.get('SELECT id FROM student_rows WHERE dataset_id = ? LIMIT 1', dsA.id).id;
const rowB = db.get('SELECT id FROM student_rows WHERE dataset_id = ? LIMIT 1', dsB.id).id;
const addResult = (id, r, score) => db.run('INSERT INTO prediction_results(id,run_id,student_row_id,risk_score,risk_flag) VALUES(?,?,?,?,?)', id, run.id, r, score, 0);
assert.throws(() => addResult('x1', rowA, 0.1), /UNIQUE/);
assert.throws(() => addResult('x2', rowB, 0.5), /same dataset|belong to the run dataset/);
assert.throws(() => addResult('x3', rowA, 2), /between 0 and 1|UNIQUE/);
assert.throws(() => db.run('INSERT INTO runs(id,dataset_id,account_id,model_version,schema_version,threshold,total_records,at_risk_count) VALUES(?,?,?,?,?,?,?,?)', 'rx', dsA.id, 'B', 'm', 's', 0.5, 0, 0), /must own the dataset/);
assert.equal(state(), before);

// Ownership and pagination.
const own = getOwnedRun({ accountId: 'A', runId: run.id, page: 1, pageSize: 1 });
assert.equal(own.results.length, 1);
assert.deepEqual(own.pagination, { page: 1, pageSize: 1, totalPages: 2, totalResults: 2 });
assert.equal(getOwnedRun({ accountId: 'B', runId: run.id }), null);
assert.equal(listOwnedRuns({ accountId: 'B' }).length, 0);

// Persistence across a process restart: read the same file from a new process.
db.close();
const service = JSON.stringify(path.join(__dirname, '..', 'src', 'services', 'predictionRuns'));
const out = execFileSync(process.execPath, ['-e',
  `const s=require(${service});const r=s.getOwnedRun({accountId:'A',runId:${JSON.stringify(run.id)}});console.log(JSON.stringify({m:r.run.model_version,t:r.run.threshold,n:r.results.length}))`],
  { env: { ...process.env, DATABASE_PATH: file }, encoding: 'utf8' });
assert.deepEqual(JSON.parse(out.trim().split('\n').pop()), { m: 'm1', t: 0.5, n: 2 });
fs.rmSync(dir, { recursive: true, force: true });
console.log('Complete runs, all-or-none saving, owner filtering and restart persistence verified');
