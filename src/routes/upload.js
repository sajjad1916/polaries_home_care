const express = require('express');
const multer = require('multer');
const { getDb } = require('../../db/database');
const { saveFile } = require('../services/storage');
const { computeDocumentCompliance, updateCaregiverCompliance } = require('../services/compliance');
const { extractDateFromDocument } = require('../services/ai-scanner');
const settings = require('../../config/settings');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: settings.upload.maxFileSize },
  fileFilter: (req, file, cb) => {
    if (settings.upload.allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Accepted: JPEG, PNG, PDF'));
    }
  },
});

router.post('/:caregiverId/:documentType', upload.single('file'), async (req, res) => {
  try {
    const { caregiverId, documentType } = req.params;
    const { entered_date } = req.body;
    const uploadedBy = req.body.uploaded_by || 'caregiver';

    // Validate document type
    const validTypes = settings.documentTypes.map(d => d.key);
    if (!validTypes.includes(documentType)) {
      return res.status(400).json({ error: 'Invalid document type' });
    }

    // Verify caregiver exists
    const db = getDb();
    const caregiver = db.prepare('SELECT caregiver_id FROM caregivers WHERE caregiver_id = ?').get(caregiverId);
    if (!caregiver) {
      return res.status(404).json({ error: 'Caregiver not found' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Save file to storage
    const fileInfo = saveFile(caregiverId, documentType, req.file);

    // Attempt AI date extraction (non-blocking, best effort)
    let aiResult = { date: null, confidence: 0 };
    if (documentType !== 'social_security') {
      aiResult = await extractDateFromDocument(documentType, req.file.buffer, req.file.mimetype);
    }

    // Compute compliance status
    const complianceStatus = computeDocumentCompliance(documentType, entered_date || null);

    // Check for date mismatch
    const dateMismatch = aiResult.date && entered_date && aiResult.date !== entered_date ? 1 : 0;

    // Upsert document record
    db.prepare(`
      INSERT INTO documents (caregiver_id, document_type, file_path, file_name, file_type, file_size, entered_date, ai_extracted_date, date_mismatch, compliance_status, uploaded_by, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(caregiver_id, document_type) DO UPDATE SET
        file_path = excluded.file_path,
        file_name = excluded.file_name,
        file_type = excluded.file_type,
        file_size = excluded.file_size,
        entered_date = excluded.entered_date,
        ai_extracted_date = excluded.ai_extracted_date,
        date_mismatch = excluded.date_mismatch,
        compliance_status = excluded.compliance_status,
        uploaded_by = excluded.uploaded_by,
        updated_at = datetime('now')
    `).run(
      caregiverId, documentType, fileInfo.filePath, fileInfo.fileName,
      fileInfo.fileType, fileInfo.fileSize, entered_date || null,
      aiResult.date || null, dateMismatch, complianceStatus, uploadedBy
    );

    // Recalculate overall compliance
    const overallStatus = updateCaregiverCompliance(caregiverId);

    console.log(`[upload] ${documentType} uploaded for caregiver ${caregiverId} - status: ${complianceStatus}`);

    res.json({
      success: true,
      document: {
        documentType,
        complianceStatus,
        enteredDate: entered_date || null,
        aiExtractedDate: aiResult.date || null,
        dateMismatch: dateMismatch === 1,
        fileName: fileInfo.fileName,
      },
      overallCompliance: overallStatus,
    });
  } catch (err) {
    console.error('[upload] Error:', err);
    if (err.message?.includes('Invalid file type')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Upload failed' });
  }
});

module.exports = router;
