const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'student-http-'));
process.env.DATABASE_PATH = path.join(temp, 'app.sqlite');
process.env.SESSION_SECRET = 'test-session-secret-at-least-32-characters';
const { app, sessionStore } = require('../server');
const db = require('../src/db/connection');
let server, base;
test.before(async () => { server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); }); base = `http://127.0.0.1:${server.address().port}`; });
test.after(async () => { await new Promise(resolve => server.close(resolve)); await new Promise((resolve, reject) => sessionStore.db.close(error => error ? reject(error) : resolve())); db.close(); fs.rmSync(temp, { recursive: true, force: true }); });
function client() {
    let cookie = '';
    return async (url, options = {}) => {
        const response = await fetch(base + url, { ...options, redirect: 'manual', headers: { ...options.headers, cookie } });
        const set = response.headers.get('set-cookie'); if (set) cookie = set.split(';')[0];
        const text = await response.text();
        return { status: response.status, text, disposition: response.headers.get('content-disposition'), location: response.headers.get('location'), token: text.match(/name="_csrf" value="([^"]+)"/)?.[1] };
    };
}
test('real forms: registration, login, CSRF, upload, ownership, pagination, views (prediction is unavailable in Sprint 2)', async () => {
    const a = client(), b = client();
    for (const [request, username] of [[a, 'alice'], [b, 'bob']]) {
        let page = await request('/register'); assert.equal(page.status, 200);
        assert.equal((await request('/register', { method: 'POST', body: new URLSearchParams({ _csrf: page.token, username, email: `${username}@test.edu`, password: 'password123', confirmPassword: 'password123' }) })).status, 302);
        page = await request('/login');
        assert.equal((await request('/login', { method: 'POST', body: new URLSearchParams({ _csrf: page.token, username, password: 'password123' }) })).status, 302);
    }
    if (fs.existsSync(path.join(__dirname, '../src/routes/samples.js'))) {
        const sample = await a('/samples/student_sample.csv');
        assert.equal(sample.status, 200); assert.match(sample.disposition, /attachment/);
    }
    const fixture = require('../ml/examples/valid_two_rows.json')[0];
    const headers = [...Object.keys(fixture), 'G2', 'G3'];
    const csv = [headers.join(';'), ...Array.from({ length: 26 }, (_, i) => headers.map(key => key === 'row_identifier' ? `ROW-${i}` : key === 'student_row_id' ? `S-${i}` : key === 'G2' || key === 'G3' ? 10 : fixture[key]).join(';'))].join('\n');
    const upload = async (token, contents, filename = 'sample.csv') => {
        const form = new FormData(); if (token) form.append('_csrf', token); form.append('dataset', new Blob([contents]), filename);
        return a('/datasets/upload', { method: 'POST', body: form });
    };
    assert.equal((await upload(null, csv)).status, 403);
    assert.equal((await client()('/datasets/upload')).status, 302);
    const guestForm = new FormData(); guestForm.append('dataset', new Blob([csv]), 'example.csv');
    assert.equal((await client()('/datasets/upload', { method: 'POST', body: guestForm })).status, 302);
    let page = await a('/datasets/upload');
    const empty = new FormData(); empty.append('_csrf', page.token);
    assert.equal((await a('/datasets/upload', { method: 'POST', body: empty })).status, 400);
    assert.equal((await upload(page.token, csv, 'wrong.txt')).status, 400);
    assert.equal((await upload(page.token, 'x'.repeat(1024 * 1024 + 1))).status, 400);
    const invalid = await upload(page.token, 'school;age\nGP;999'); assert.equal(invalid.status, 400);
    assert.equal(db.get('SELECT COUNT(*) AS n FROM datasets').n, 0);
    const imported = await upload(invalid.token, csv); assert.equal(imported.status, 302);
    const url = imported.location;
    const stored = db.all("SELECT features_json FROM student_rows");
    assert.equal(stored.length, 26);
    for (const row of stored) { const features = JSON.parse(row.features_json); assert.equal(Object.keys(features).length, 31); assert.ok(!("G2" in features) && !("G3" in features)); }
    const saved = db.get('SELECT * FROM datasets WHERE id=?', url.split('/').pop());
    assert.equal(saved.row_count, 26);
    assert.equal(saved.g1_count, 26);
    assert.equal(saved.g1_mean, fixture.G1);
    assert.equal(saved.g1_min, fixture.G1);
    assert.equal(saved.g1_max, fixture.G1);
    const rendered = await a(url);
    assert.ok(rendered.text.includes('<strong>' + fixture.G1.toFixed(2) + '/20</strong>'), 'Rendered G1 mean');
    assert.ok(rendered.text.includes('<strong>' + fixture.G1 + '/20</strong>'), 'Rendered G1 min/max');
    assert.ok(rendered.text.includes('<strong>26</strong>'), 'Rendered student count');
    const missing = await b('/datasets/00000000-0000-0000-0000-000000000000');
    const foreign = await b(url);
    assert.equal(missing.status, 404); assert.equal(foreign.status, 404);
    assert.equal(missing.text, foreign.text, 'Missing/foreign IDs have the same not-found response');

    page = await a(url); assert.match(page.text, /Next/);
    assert.match((await a(url + '?page=2')).text, /ROW-25/);
    assert.equal((await a("/datasets")).status, 200);
    assert.equal(db.get("SELECT COUNT(*) AS n FROM datasets").n, 1);
    if (!fs.existsSync(path.join(__dirname, '../src/routes/runs.js')) || !fs.existsSync(path.join(__dirname, '../ml/models/student_risk_v1.pkl'))) assert.doesNotMatch(page.text, /<button[^>]*>Run Risk Prediction/);
    // Twenty-five more imports prove dataset-list paging separately from student-row paging.
    for (let i = 0; i < 25; i++) {
        const result = await upload(page.token, csv, 'paging-' + i + '.csv');
        assert.equal(result.status, 302);
    }
    assert.equal(db.get('SELECT COUNT(*) AS n FROM datasets').n, 26);
    const first = await a('/datasets?page=1');
    const second = await a('/datasets?page=2');
    assert.equal(first.status, 200); assert.equal(second.status, 200);
    assert.match(first.text, /Next/); assert.match(second.text, /Previous/);
    const ids = text => [...text.matchAll(/href="\/datasets\/([a-f0-9-]{36})"/g)].map(match => match[1]);
    const pageOne = ids(first.text), pageTwo = ids(second.text);
    assert.equal(pageOne.length, 25); assert.equal(pageTwo.length, 1);
    assert.equal(new Set([...pageOne, ...pageTwo]).size, 26);
    assert.doesNotMatch((await b('/datasets')).text, /paging-\d+\.csv/, 'Other owner datasets excluded from list');

});
