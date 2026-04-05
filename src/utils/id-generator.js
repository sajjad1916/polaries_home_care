const { getDb } = require('../../db/database');

function generateCaregiverId() {
  const db = getDb();
  const last = db.prepare('SELECT caregiver_id FROM caregivers ORDER BY CAST(caregiver_id AS INTEGER) DESC LIMIT 1').get();
  const nextId = last ? parseInt(last.caregiver_id, 10) + 1 : 1001;
  return String(nextId).padStart(4, '0');
}

module.exports = { generateCaregiverId };
