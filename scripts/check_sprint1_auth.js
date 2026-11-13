// Run from Terminal B against the local Sprint 1 server running in Terminal A.
const assert = require('node:assert/strict');
const base = process.env.APP_URL || 'http://localhost:3000';
const parsed = new URL(base);
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname), 'Use a local disposable course server');
let cookie = '';
async function request(route, fields, customCookie = cookie) {
    const response = await fetch(new URL(route, base), {
        method: fields ? 'POST' : 'GET', redirect: 'manual', signal: AbortSignal.timeout(10000),
        headers: { ...(customCookie ? { Cookie: customCookie } : {}), ...(fields ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) },
        ...(fields ? { body: new URLSearchParams(fields) } : {})
    });
    if (customCookie === cookie) {
        const session = response.headers.getSetCookie().find(value => value.startsWith('connect.sid='));
        if (session) cookie = session.split(';')[0];
    }
    return response;
}
async function token(route) {
    const response = await request(route);
    assert.equal(response.status, 200, route);
    const match = (await response.text()).match(/name="_csrf"\s+value="([^"]+)"/);
    assert.ok(match, 'CSRF hidden field');
    return match[1];
}
async function main() {
    let response = await request('/datasets');
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('location'), '/login');
    const registerToken = await token('/register');
    const username = 's1_' + Date.now();
    const fields = { username, email: username + '@example.test', password: 'Course-Test-123!', confirmPassword: 'Course-Test-123!', _csrf: registerToken };
    assert.equal((await request('/register', { ...fields, _csrf: '' })).status, 403, 'Missing CSRF');
    assert.equal((await request('/register', { ...fields, password: 'short', confirmPassword: 'short' })).status, 400, 'Weak password');
    assert.equal((await request('/register', { ...fields, confirmPassword: 'Different-123!' })).status, 400, 'Mismatched confirmation');
    assert.equal((await request('/register', fields)).status, 302, 'Registration');
    assert.equal((await request('/register', { ...fields, email: 'other_' + fields.email })).status, 400, 'Duplicate username');
    assert.equal((await request('/register', { ...fields, username: username + '_2' })).status, 400, 'Duplicate email');
    const loginToken = await token('/login');
    assert.equal((await request('/login', { email: fields.email, password: 'Wrong-123!', _csrf: loginToken })).status, 400, 'Failed login');
    const oldCookie = cookie;
    response = await request('/login', { email: fields.email, password: fields.password, _csrf: loginToken });
    assert.equal(response.status, 302, 'Valid login');
    assert.notEqual(cookie, oldCookie, 'Login rotates session ID');
    assert.equal((await request('/datasets', undefined, oldCookie)).status, 302, 'Old session cannot access dashboard');
    assert.equal((await request('/datasets')).status, 200, 'Authenticated dashboard');
    const logoutToken = await token('/datasets');
    assert.equal((await request('/logout', { _csrf: 'invalid' })).status, 403, 'Invalid logout CSRF');
    assert.equal((await request('/datasets')).status, 200, 'Rejected logout retains session');
    const authenticatedCookie = cookie;
    assert.equal((await request('/logout', { _csrf: logoutToken })).status, 302, 'POST logout');
    assert.equal((await request('/datasets', undefined, authenticatedCookie)).status, 302, 'Destroyed session rejected');
    assert.equal((await request('/datasets')).status, 302, 'Logged-out route protected');
    console.log('Sprint 1 authentication, session rotation, CSRF and logout checks passed');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
