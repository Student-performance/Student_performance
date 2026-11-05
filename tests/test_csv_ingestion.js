const assert = require('node:assert/strict');
const { parseCsv } = require('../src/services/csvParser');
const { validateStudentRows } = require('../src/validators/studentSchema');
assert.equal(parseCsv(Buffer.from('school;sex\nGP;F\nMS;M')).rows.length, 2);
assert.throws(() => parseCsv(Buffer.from('school,school\nGP,MS')), /Duplicate column/);
assert.throws(() => parseCsv(Buffer.from('school,sex\nGP,F,extra')), /column count/);
assert.throws(() => parseCsv(Buffer.from([0xff])), /UTF-8/);
assert.equal(validateStudentRows(Array.from({ length: 60 }, () => ({ age: 999 }))).errors.length, 50);
assert.equal(validateStudentRows([]).isValid, false);
console.log('CSV encoding, counts, headers and error cap verified');

const fixture=require('../ml/examples/valid_two_rows.json');
const good=validateStudentRows(fixture.map(row=>({...row,G2:12,G3:15})));
assert.equal(good.isValid,true);
for(const row of good.validRows){assert.ok(!('G2' in row)&&!('G3' in row));assert.equal(Object.keys(row).filter(key=>key!=='row_identifier').length,31);}
assert.equal(validateStudentRows([{...fixture[0],row_identifier:' ' }]).isValid,false);
assert.equal(validateStudentRows([{...fixture[0],row_identifier:'ROW-002'},{...fixture[1],row_identifier:undefined,student_row_id:undefined}]).isValid,false);
assert.equal(validateStudentRows([{...fixture[0],G1:25}]).isValid,false);
assert.throws(()=>parseCsv(Buffer.alloc(1024*1024+1)),/1 MiB/);
assert.throws(()=>parseCsv(Buffer.from('a,b\n"unclosed,2')),/Unterminated/);
assert.equal(parseCsv(Buffer.from('a,b\r\n"a,b","escaped""quote"\r\n')).rows[0].b,'escaped"quote');
assert.throws(()=>parseCsv(Buffer.from('a\n'+Array(501).fill('1').join('\n'))),/500/);

// Own properties only: prototype names are not permitted CSV headers.
for (const rejectedHeader of ['constructor', 'toString', '__proto__']) {
  const unexpected = { ...fixture[0] };
  Object.defineProperty(unexpected, rejectedHeader, { value: 'unexpected', enumerable: true });
  const rejected = validateStudentRows([unexpected]);
  assert.equal(rejected.isValid, false, rejectedHeader);
  assert.ok(rejected.errors.some(error => error.includes('unsupported column '+rejectedHeader)));
  const keys = Object.keys(fixture[0]).filter(key=>!['row_identifier','student_row_id','row_id'].includes(key));
  const input = Buffer.from([...keys,rejectedHeader].join(',')+'\n'+[...keys.map(key=>fixture[0][key]),'unexpected'].join(','));
  assert.equal(validateStudentRows(parseCsv(input).rows).isValid, false, 'CSV '+rejectedHeader);
}
console.log('Prototype-name CSV columns correctly rejected');
