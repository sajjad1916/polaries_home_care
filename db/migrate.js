const fs = require('fs');
const path = require('path');
const { getDb, closeDb } = require('./database');

function migrate() {
  console.log('[migrate] Running database migrations...');

  const db = getDb();
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  db.exec(schema);

  console.log('[migrate] Schema applied successfully.');
  closeDb();
}

if (require.main === module) {
  require('dotenv').config();
  migrate();
}

module.exports = { migrate };
