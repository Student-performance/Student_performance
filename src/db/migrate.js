require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('./index');

function runMigrations() {
  db.exec(`CREATE TABLE IF NOT EXISTS _migrations (id TEXT PRIMARY KEY, applied_at DATETIME DEFAULT CURRENT_TIMESTAMP);`);
  const dir = path.join(__dirname, '../../migrations');
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
  for (const f of files) {
    const applied = db.get('SELECT 1 FROM _migrations WHERE id = ?', [f]);
    if (!applied) {
      const sql = fs.readFileSync(path.join(dir, f), 'utf8');
      db.transaction(() => {
        db.exec(sql);
        db.run('INSERT INTO _migrations (id) VALUES (?)', [f]);
      })();
      console.log(`Applied migration: ${f}`);
    }
  }
}
if (require.main === module) {
  runMigrations();
}
module.exports = { runMigrations };
