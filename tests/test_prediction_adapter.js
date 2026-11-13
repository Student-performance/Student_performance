const assert = require('node:assert/strict');
const { executePrediction } = require('../src/services/predictionAdapter');
const rows = require('../ml/examples/valid_two_rows.json');

if (!rows){ throw new Error('AI member has not yet done the prediction adapter or the rows data is missing');}
(async () => {
    const output = await executePrediction(rows);
    assert.ok(['v0.1-toy-contract-spike', 'student_risk_v1'].includes(output.model_version));
    assert.equal(output.schema_version, 'schema-v1');
    assert.equal(output.results.length, 2);
    assert.ok(output.results.every(row => Number.isFinite(row.risk_score) && row.risk_score >= 0 && row.risk_score <= 1));
    const original = process.env.PYTHON_PATH;
    try {
        process.env.PYTHON_PATH = '__missing_python_interpreter__';
        await assert.rejects(executePrediction(rows), /ENOENT|spawn/i);
    } finally { if (original === undefined) delete process.env.PYTHON_PATH; else process.env.PYTHON_PATH = original; }
    console.log('Two-row envelope and missing-interpreter handling passed');
})().catch(error => { console.error(error); process.exitCode = 1; });


// TODO: run the test after Carla's prediction adapter is implemented and the ml/examples/valid_two_rows.json file is available.
// node tests/test_prediction_adapter.js