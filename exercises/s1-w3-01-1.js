const Database = require('better-sqlite3');
const db = new Database(':memory:');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE account (
    id INTEGER PRIMARY KEY,
    email TEXT NOT NULL UNIQUE
  );
  CREATE TABLE dataset (
    id INTEGER PRIMARY KEY,
    owner_id INTEGER NOT NULL REFERENCES account(id),
    name TEXT NOT NULL
  );
`);

const addAcc = db.prepare('INSERT INTO account(email) VALUES (?)');
const a1 = addAcc.run('ana@example.com').lastInsertRowid;
const a2 = addAcc.run('beto@example.com').lastInsertRowid;

const addDs = db.prepare('INSERT INTO dataset(owner_id, name) VALUES (?, ?)');
addDs.run(a1, 'dataset de Ana');
addDs.run(a2, 'dataset de Beto');

const byOwner = db.prepare('SELECT * FROM dataset WHERE owner_id = ?');
console.log('Ana ve:', byOwner.all(a1));
console.log('Beto ve:', byOwner.all(a2));

try {
  addDs.run(999, 'huérfano');
  console.log('PROBLEMA: se insertó un dataset sin dueño');
} catch (e) {
  console.log('Error esperado:', e.message);
}
