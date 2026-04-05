-- Polaris Home Care: Caregiver Compliance Database Schema

CREATE TABLE IF NOT EXISTS caregivers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  caregiver_id TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address_street TEXT,
  address_city TEXT,
  address_state TEXT DEFAULT 'CA',
  address_zip TEXT,
  date_of_birth TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,
  prior_experience TEXT,
  certifications TEXT,
  availability TEXT,
  status TEXT DEFAULT 'applicant' CHECK(status IN ('applicant', 'active')),
  viventium_id TEXT,
  signature_data TEXT,
  signed_at TEXT,
  overall_compliance TEXT DEFAULT 'incomplete' CHECK(overall_compliance IN ('complete', 'incomplete')),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  caregiver_id TEXT NOT NULL REFERENCES caregivers(caregiver_id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK(document_type IN ('drivers_license', 'tb_test', 'background_check', 'car_insurance', 'social_security')),
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  entered_date TEXT,
  ai_extracted_date TEXT,
  date_mismatch INTEGER DEFAULT 0,
  compliance_status TEXT DEFAULT 'missing' CHECK(compliance_status IN ('valid', 'expired', 'missing')),
  uploaded_by TEXT DEFAULT 'caregiver' CHECK(uploaded_by IN ('caregiver', 'admin')),
  verified_by TEXT,
  verified_at TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(caregiver_id, document_type)
);

CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'staff' CHECK(role IN ('admin', 'staff')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  admin_user_id INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  admin_user_id INTEGER,
  details TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_caregivers_status ON caregivers(status);
CREATE INDEX IF NOT EXISTS idx_caregivers_compliance ON caregivers(overall_compliance);
CREATE INDEX IF NOT EXISTS idx_caregivers_name ON caregivers(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_documents_caregiver ON documents(caregiver_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_compliance ON documents(compliance_status);
CREATE INDEX IF NOT EXISTS idx_documents_date ON documents(entered_date);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
