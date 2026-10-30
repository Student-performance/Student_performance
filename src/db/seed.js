require('dotenv').config();
const bcrypt = require('bcryptjs');
const { randomUUID } = require('node:crypto');
const db = require('./connection');
const { runMigrations } = require('./migrate');
function seed() {
  runMigrations();
  if (!db.get('SELECT id FROM accounts WHERE username = ?', 'admin')) {
    db.run('INSERT INTO accounts (id, email, username, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      randomUUID(), 'admin@school.edu', 'admin', bcrypt.hashSync('password123', 10), 'student');
  }
}
if (require.main === module) {
  try { seed(); console.log('Demo account ready: admin / password123'); }
  finally { db.close(); }
}
module.exports = { seed };
