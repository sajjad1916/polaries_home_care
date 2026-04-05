const express = require('express');
const { getDb } = require('../../db/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { getComplianceSummary, updateCaregiverCompliance, getNearestExpiration } = require('../services/compliance');
const { getFilePath, fileExists, deleteFile } = require('../services/storage');
const path = require('path');

const router = express.Router();

// List all caregivers with filters
router.get('/', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const { status, compliance, search, sort, order } = req.query;

    let query = 'SELECT * FROM caregivers WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (compliance) {
      query += ' AND overall_compliance = ?';
      params.push(compliance);
    }

    if (search) {
      query += ' AND (first_name LIKE ? OR last_name LIKE ? OR caregiver_id LIKE ? OR email LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    // Sorting
    const sortField = {
      name: 'last_name',
      id: 'CAST(caregiver_id AS INTEGER)',
      status: 'status',
      compliance: 'overall_compliance',
      created: 'created_at',
    }[sort] || 'last_name';

    const sortOrder = order === 'desc' ? 'DESC' : 'ASC';
    query += ` ORDER BY ${sortField} ${sortOrder}`;

    const caregivers = db.prepare(query).all(...params);

    // Add nearest expiration for each caregiver
    const result = caregivers.map(c => {
      const nearest = getNearestExpiration(c.caregiver_id);
      return {
        ...c,
        nearestExpiration: nearest?.entered_date || null,
        nearestExpirationType: nearest?.document_type || null,
        signature_data: undefined, // Don't send signature in list view
      };
    });

    res.json(result);
  } catch (err) {
    console.error('[caregivers] List error:', err);
    res.status(500).json({ error: 'Failed to fetch caregivers' });
  }
});

// Dashboard stats (must be before /:caregiverId route)
router.get('/stats/summary', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const total = db.prepare('SELECT COUNT(*) as count FROM caregivers').get().count;
    const active = db.prepare("SELECT COUNT(*) as count FROM caregivers WHERE status = 'active'").get().count;
    const applicants = db.prepare("SELECT COUNT(*) as count FROM caregivers WHERE status = 'applicant'").get().count;
    const compliant = db.prepare("SELECT COUNT(*) as count FROM caregivers WHERE overall_compliance = 'complete'").get().count;
    const nonCompliant = db.prepare("SELECT COUNT(*) as count FROM caregivers WHERE overall_compliance = 'incomplete'").get().count;
    const expiredDocs = db.prepare("SELECT COUNT(*) as count FROM documents WHERE compliance_status = 'expired'").get().count;
    const mismatches = db.prepare('SELECT COUNT(*) as count FROM documents WHERE date_mismatch = 1').get().count;

    res.json({ total, active, applicants, compliant, nonCompliant, expiredDocs, mismatches });
  } catch (err) {
    console.error('[caregivers] Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Recent activity feed (must be before /:caregiverId)
router.get('/activity/recent', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const entries = db.prepare(`
      SELECT al.*, au.name as admin_name
      FROM audit_log al
      LEFT JOIN admin_users au ON au.id = al.admin_user_id
      ORDER BY al.created_at DESC
      LIMIT 15
    `).all();
    res.json(entries);
  } catch (err) {
    console.error('[caregivers] Activity feed error:', err);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// Expiring soon documents (must be before /:caregiverId)
router.get('/expiring-soon', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];
    const in90 = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const rows = db.prepare(`
      SELECT d.caregiver_id, d.document_type, d.entered_date, d.compliance_status,
             c.first_name, c.last_name
      FROM documents d
      JOIN caregivers c ON c.caregiver_id = d.caregiver_id
      WHERE d.document_type IN ('drivers_license', 'car_insurance')
        AND d.compliance_status = 'valid'
        AND d.entered_date >= ?
        AND d.entered_date <= ?
      ORDER BY d.entered_date ASC
    `).all(today, in90);

    res.json(rows);
  } catch (err) {
    console.error('[caregivers] Expiring soon error:', err);
    res.status(500).json({ error: 'Failed to fetch expiring documents' });
  }
});

// Get single caregiver detail
router.get('/:caregiverId', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const caregiver = db.prepare('SELECT * FROM caregivers WHERE caregiver_id = ?').get(req.params.caregiverId);

    if (!caregiver) {
      return res.status(404).json({ error: 'Caregiver not found' });
    }

    const compliance = getComplianceSummary(caregiver.caregiver_id);

    res.json({ ...caregiver, documents: compliance });
  } catch (err) {
    console.error('[caregivers] Detail error:', err);
    res.status(500).json({ error: 'Failed to fetch caregiver' });
  }
});

// Update caregiver (all profile fields, status, Viventium ID, notes)
router.patch('/:caregiverId', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const { caregiverId } = req.params;

    const caregiver = db.prepare('SELECT * FROM caregivers WHERE caregiver_id = ?').get(caregiverId);
    if (!caregiver) {
      return res.status(404).json({ error: 'Caregiver not found' });
    }

    // All editable fields
    const allowedFields = [
      'first_name', 'last_name', 'email', 'phone',
      'address_street', 'address_city', 'address_state', 'address_zip',
      'date_of_birth',
      'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship',
      'prior_experience', 'certifications', 'availability',
      'viventium_id', 'notes',
    ];

    const updates = [];
    const params = [];

    // Status has validation
    if (req.body.status && ['applicant', 'active'].includes(req.body.status)) {
      updates.push('status = ?');
      params.push(req.body.status);
    }

    // All other text fields
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(req.body[field] || null);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updates.push("updated_at = datetime('now')");
    params.push(caregiverId);

    db.prepare(`UPDATE caregivers SET ${updates.join(', ')} WHERE caregiver_id = ?`).run(...params);

    // Log the action
    db.prepare('INSERT INTO audit_log (action, entity_type, entity_id, admin_user_id, details) VALUES (?, ?, ?, ?, ?)')
      .run('update_caregiver', 'caregiver', caregiverId, req.admin.id, JSON.stringify(req.body));

    const updated = db.prepare('SELECT * FROM caregivers WHERE caregiver_id = ?').get(caregiverId);
    const compliance = getComplianceSummary(caregiverId);

    res.json({ ...updated, documents: compliance });
  } catch (err) {
    console.error('[caregivers] Update error:', err);
    res.status(500).json({ error: 'Failed to update caregiver' });
  }
});

// Delete caregiver (admin only)
router.delete('/:caregiverId', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { caregiverId } = req.params;

    const caregiver = db.prepare('SELECT * FROM caregivers WHERE caregiver_id = ?').get(caregiverId);
    if (!caregiver) {
      return res.status(404).json({ error: 'Caregiver not found' });
    }

    // Delete files from disk
    const docs = db.prepare('SELECT * FROM documents WHERE caregiver_id = ?').all(caregiverId);
    for (const doc of docs) {
      if (doc.file_path) {
        try { deleteFile(doc.file_path); } catch (e) { /* file may not exist */ }
      }
    }

    // Delete DB records
    db.prepare('DELETE FROM documents WHERE caregiver_id = ?').run(caregiverId);
    db.prepare('DELETE FROM caregivers WHERE caregiver_id = ?').run(caregiverId);

    // Audit log
    const name = [caregiver.first_name, caregiver.last_name].filter(Boolean).join(' ');
    db.prepare('INSERT INTO audit_log (action, entity_type, entity_id, admin_user_id, details) VALUES (?, ?, ?, ?, ?)')
      .run('delete_caregiver', 'caregiver', caregiverId, req.admin.id, JSON.stringify({ name }));

    res.json({ success: true });
  } catch (err) {
    console.error('[caregivers] Delete error:', err);
    res.status(500).json({ error: 'Failed to delete caregiver' });
  }
});

// Resolve date mismatch
router.post('/:caregiverId/documents/:documentType/resolve', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const { caregiverId, documentType } = req.params;
    const { accepted_date } = req.body;

    if (!accepted_date) {
      return res.status(400).json({ error: 'accepted_date is required' });
    }

    const { computeDocumentCompliance } = require('../services/compliance');
    const complianceStatus = computeDocumentCompliance(documentType, accepted_date);

    db.prepare(`
      UPDATE documents SET entered_date = ?, date_mismatch = 0, compliance_status = ?,
        verified_by = ?, verified_at = datetime('now'), updated_at = datetime('now')
      WHERE caregiver_id = ? AND document_type = ?
    `).run(accepted_date, complianceStatus, req.admin.name, caregiverId, documentType);

    updateCaregiverCompliance(caregiverId);

    res.json({ success: true, complianceStatus });
  } catch (err) {
    console.error('[caregivers] Resolve error:', err);
    res.status(500).json({ error: 'Failed to resolve mismatch' });
  }
});

// Download/view a document file
router.get('/:caregiverId/documents/:documentType/file', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const doc = db.prepare('SELECT * FROM documents WHERE caregiver_id = ? AND document_type = ?')
      .get(req.params.caregiverId, req.params.documentType);

    if (!doc || !doc.file_path) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const fullPath = getFilePath(doc.file_path);
    if (!fileExists(doc.file_path)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    res.setHeader('Content-Type', doc.file_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${doc.file_name}"`);
    res.sendFile(path.resolve(fullPath));
  } catch (err) {
    console.error('[caregivers] File download error:', err);
    res.status(500).json({ error: 'Failed to retrieve file' });
  }
});

module.exports = router;
