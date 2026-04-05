const express = require('express');
const { getDb } = require('../../db/database');
const { generateCaregiverId } = require('../utils/id-generator');

const router = express.Router();

router.post('/submit', (req, res) => {
  try {
    const {
      first_name, last_name, email, phone,
      address_street, address_city, address_state, address_zip,
      date_of_birth, emergency_contact_name, emergency_contact_phone,
      emergency_contact_relationship, prior_experience, certifications,
      availability, signature_data,
    } = req.body;

    if (!first_name || !last_name) {
      return res.status(400).json({ error: 'First name and last name are required' });
    }

    const db = getDb();
    const caregiverId = generateCaregiverId();

    db.prepare(`
      INSERT INTO caregivers (
        caregiver_id, first_name, last_name, email, phone,
        address_street, address_city, address_state, address_zip,
        date_of_birth, emergency_contact_name, emergency_contact_phone,
        emergency_contact_relationship, prior_experience, certifications,
        availability, signature_data, signed_at, status, overall_compliance
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 'applicant', 'incomplete')
    `).run(
      caregiverId, first_name, last_name, email || null, phone || null,
      address_street || null, address_city || null, address_state || 'CA', address_zip || null,
      date_of_birth || null, emergency_contact_name || null, emergency_contact_phone || null,
      emergency_contact_relationship || null, prior_experience || null, certifications || null,
      availability || null, signature_data || null
    );

    console.log(`[onboarding] New caregiver created: ${caregiverId} - ${first_name} ${last_name}`);

    res.json({
      success: true,
      caregiverId,
      message: `Welcome, ${first_name}! Your caregiver ID is ${caregiverId}. Please proceed to upload your compliance documents.`,
    });
  } catch (err) {
    console.error('[onboarding] Submission error:', err);
    res.status(500).json({ error: 'Failed to create caregiver record' });
  }
});

router.get('/status/:caregiverId', (req, res) => {
  const db = getDb();
  const caregiver = db.prepare('SELECT caregiver_id, first_name, last_name, status FROM caregivers WHERE caregiver_id = ?')
    .get(req.params.caregiverId);

  if (!caregiver) {
    return res.status(404).json({ error: 'Caregiver not found' });
  }

  res.json(caregiver);
});

module.exports = router;
