const assert=require('node:assert/strict');
process.env.DATABASE_PATH=':memory:';
const db=require('../src/db/connection');
require('../src/db/migrate').runMigrations();
const {persistDatasetAtomic,calculateG1Stats,importCsvDataset}=require('../src/services/dataset');
const fixture=require('../ml/examples/valid_two_rows.json');
const {validateStudentRows}=require('../src/validators/studentSchema');
const rows=validateStudentRows(fixture).validRows;
const known=calculateG1Stats([10,15,5,20,0].map(G1=>({G1})));
assert.deepEqual(known,{count:5,mean:10,min:0,max:20});
db.run('INSERT INTO accounts(id,email,username,password_hash) VALUES(?,?,?,?)','owner','owner@example.test','owner','synthetic-hash');
const counts=()=>[db.get('SELECT COUNT(*) AS n FROM datasets').n,db.get('SELECT COUNT(*) AS n FROM student_rows').n];
(async()=>{
  const before=counts();
  // The trigger injects a second-row failure after both dataset and first-row insert began.
  db.exec("CREATE TRIGGER fail_second BEFORE INSERT ON student_rows WHEN NEW.row_index=2 BEGIN SELECT RAISE(ABORT,'injected insert failure'); END");
  assert.throws(()=>persistDatasetAtomic({accountId:'owner',filename:'example.csv',rows,stats:calculateG1Stats(rows)}),/injected insert failure/);
  assert.deepEqual(counts(),before);
  db.exec('DROP TRIGGER fail_second');
  await assert.rejects(importCsvDataset({accountId:'owner',filename:'invalid.csv',buffer:Buffer.from('school,age\nGP,999')}),/Validation/);
  assert.deepEqual(counts(),before);
  const saved=persistDatasetAtomic({accountId:'owner',filename:'example.csv',rows,stats:calculateG1Stats(rows)});
  assert.deepEqual(counts(),[1,2]);
  assert.equal(db.get('SELECT account_id FROM datasets WHERE id=?',saved.id).account_id,'owner');
  for(const row of db.all('SELECT features_json FROM student_rows')) {
    const features=JSON.parse(row.features_json);
    assert.equal(Object.keys(features).length,31); assert.ok(!('G2' in features)&&!('G3' in features));
  }
  console.log('Injected write failure and invalid input roll back completely; valid rows preserve owner and 31 features');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>db.close());
