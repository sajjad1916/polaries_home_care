const { getDb } = require('../../db/database');
const settings = require('../../config/settings');

function computeDocumentCompliance(documentType, enteredDate) {
  const docConfig = settings.documentTypes.find(d => d.key === documentType);

  // Social Security card has no expiration
  if (!docConfig.hasExpiration || !enteredDate) {
    return enteredDate || documentType === 'social_security' ? 'valid' : 'missing';
  }

  // TB test: "valid" if test was within the last 4 years
  if (documentType === 'tb_test') {
    const testDate = new Date(enteredDate);
    const fourYearsAgo = new Date();
    fourYearsAgo.setFullYear(fourYearsAgo.getFullYear() - 4);
    return testDate >= fourYearsAgo ? 'valid' : 'expired';
  }

  // Background check: valid if registration date exists (doesn't expire per se, but track for recency)
  if (documentType === 'background_check') {
    return enteredDate ? 'valid' : 'missing';
  }

  // For documents with expiration dates (DL, car insurance)
  const expDate = new Date(enteredDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return expDate >= today ? 'valid' : 'expired';
}

function updateCaregiverCompliance(caregiverId) {
  const db = getDb();
  const docs = db.prepare('SELECT document_type, compliance_status FROM documents WHERE caregiver_id = ?').all(caregiverId);

  const requiredTypes = settings.documentTypes.map(d => d.key);
  const docMap = {};
  for (const doc of docs) {
    docMap[doc.document_type] = doc.compliance_status;
  }

  const allComplete = requiredTypes.every(type => docMap[type] === 'valid');

  db.prepare('UPDATE caregivers SET overall_compliance = ?, updated_at = datetime(\'now\') WHERE caregiver_id = ?')
    .run(allComplete ? 'complete' : 'incomplete', caregiverId);

  return allComplete ? 'complete' : 'incomplete';
}

function getComplianceSummary(caregiverId) {
  const db = getDb();
  const docs = db.prepare('SELECT * FROM documents WHERE caregiver_id = ? ORDER BY document_type').all(caregiverId);

  const summary = {};
  for (const docType of settings.documentTypes) {
    const doc = docs.find(d => d.document_type === docType.key);
    summary[docType.key] = {
      label: docType.label,
      hasExpiration: docType.hasExpiration,
      dateLabel: docType.dateLabel,
      status: doc ? doc.compliance_status : 'missing',
      enteredDate: doc?.entered_date || null,
      aiExtractedDate: doc?.ai_extracted_date || null,
      dateMismatch: doc?.date_mismatch === 1,
      filePath: doc?.file_path || null,
      fileName: doc?.file_name || null,
      uploadedBy: doc?.uploaded_by || null,
      uploadedAt: doc?.created_at || null,
    };
  }

  return summary;
}

function getNearestExpiration(caregiverId) {
  const db = getDb();
  const doc = db.prepare(`
    SELECT entered_date, document_type FROM documents
    WHERE caregiver_id = ? AND entered_date IS NOT NULL AND compliance_status = 'valid'
    AND document_type IN ('drivers_license', 'car_insurance')
    ORDER BY entered_date ASC LIMIT 1
  `).get(caregiverId);
  return doc || null;
}

module.exports = {
  computeDocumentCompliance,
  updateCaregiverCompliance,
  getComplianceSummary,
  getNearestExpiration,
};
