// Prepare at Step 1; execute after the parser is supplied at Step 2.
const assert = require('node:assert/strict');
const { parseCsv } = require('../src/services/csvParser');
const parsed = parseCsv(Buffer.from('school,comment\r\nGP,"two, fields"\r\nMS,"a ""quoted"" word"\r\n'));
assert.equal(parsed.rows.length, 2);
assert.equal(parsed.rows[0].comment, 'two, fields');
assert.equal(parsed.rows[1].comment, 'a "quoted" word');
assert.throws(() => parseCsv(Buffer.from('school,comment\nGP,"unclosed')), /Unterminated/);
console.log('Quoted CSV exercise passed: CRLF, embedded comma, doubled quotes and invalid quoting');
