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
test('real forms: registration, login, CSRF, upload, ownership, pagination, views and prediction', async () => {
    const a = client(), b = client();
    for (const [request, username] of [[a, 'alice'], [b, 'bob']]) {
        let page = await request('/register'); assert.equal(page.status, 200);
        assert.equal((await request('/register', { method: 'POST', body: new URLSearchParams({ _csrf: page.token, username, email: `${username}@test.edu`, password: 'password123', confirmPassword: 'password123' }) })).status, 302);
        page = await request('/login');
        assert.equal((await request('/login', { method: 'POST', body: new URLSearchParams({ _csrf: page.token, username, password: 'password123' }) })).status, 302);
    }
    if (fs.existsSync(path.join(__dirname, '../src/routes/help.js'))) {
        assert.equal((await client()('/help')).status, 302);
        assert.equal((await a('/help')).status, 200);
    }
    if (fs.existsSync(path.join(__dirname, '../src/routes/evaluation.js'))) {
        assert.equal((await a('/evaluation')).status, 200);
    }
    if (fs.existsSync(path.join(__dirname, '../src/routes/samples.js'))) {
        const sample = await a('/samples/student_sample.csv');
        assert.equal(sample.status, 200); assert.match(sample.disposition, /attachment/);
    }
    const fixture = require('../ml/examples/valid_two_rows.json')[0];
    const headers = [...Object.keys(fixture), 'G2', 'G3'];
    const csv = [headers.join(';'), ...Array.from({ length: 26 }, (_, i) => headers.map(key => key === 'row_identifier' ? `ROW-${i}` : key === 'student_row_id' ? `S-${i}` : key === 'G2' || key === 'G3' ? 10 : fixture[key]).join(';'))].join('\n');
    const upload = async (token, contents) => {
        const form = new FormData(); if (token) form.append('_csrf', token); form.append('dataset', new Blob([contents]), 'sample.csv');
        return a('/datasets/upload', { method: 'POST', body: form });
    };
    assert.equal((await upload(null, csv)).status, 403);
    let page = await a('/datasets/upload');
    const invalid = await upload(page.token, 'school;age\nGP;999'); assert.equal(invalid.status, 400);
    assert.equal(db.get('SELECT COUNT(*) AS n FROM datasets').n, 0);
    const imported = await upload(invalid.token, csv); assert.equal(imported.status, 302);
    const url = imported.location;
    assert.equal((await b(url)).status, 404);
    page = await a(url); assert.match(page.text, /Next/);
    assert.match((await a(url + '?page=2')).text, /ROW-25/);
    const predicted = await a(url + '/predict', { method: 'POST', body: new URLSearchParams({ _csrf: page.token }) });
    assert.equal(predicted.status, 302, predicted.text);
    assert.equal((await b(predicted.location)).status, 404);
    assert.match((await a(predicted.location)).text, /Next/);
    assert.match((await a(predicted.location + '?page=2')).text, /ROW-25/);
    assert.match((await a('/datasets')).text, /Recent (prediction )?runs/i);
});
