const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const { getDb, closeDb } = require('./database');
const { migrate } = require('./migrate');

function generateSignature(name) {
  const sigPaths = {
    'Maria Santos': 'M10,45 C20,20 35,55 50,35 C60,20 70,50 85,30 Q95,20 110,35',
    'James Thompson': 'M10,40 Q25,15 40,40 T70,35 Q85,25 100,40 L120,30',
    'Priya Patel': 'M10,35 C25,50 35,20 50,40 C60,55 75,25 90,40 L110,30',
    'Robert Johnson': 'M10,45 L25,25 L40,45 L55,20 Q70,40 85,30 L110,35',
    'Ana Rodriguez': 'M10,40 C20,25 30,50 45,35 S65,20 80,35 C90,45 100,25 115,35',
    'David Nguyen': 'M10,35 Q30,55 45,30 T75,35 Q90,20 110,40',
    'Sarah Kim': 'M10,40 C25,20 40,50 55,30 Q70,45 85,25 L105,35',
    'Michael Williams': 'M10,45 C20,25 35,50 50,30 C65,15 80,45 95,25 L115,35',
    'Linda Garcia': 'M10,35 Q25,55 40,30 C55,15 70,50 85,30 Q100,20 115,40',
    'Kevin Chen': 'M10,40 L30,20 Q45,50 60,30 T90,35 L110,30',
  };
  const path = sigPaths[name] || 'M10,40 C30,20 50,50 70,30 Q90,40 110,35';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60" viewBox="0 0 120 60"><path d="${path}" fill="none" stroke="#1a1a1a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
}

async function seed() {
  console.log('[seed] Seeding database with full demo data...');

  migrate();
  const db = getDb();

  // Wipe existing data for clean re-seed
  db.prepare('DELETE FROM audit_log').run();
  db.prepare('DELETE FROM documents').run();
  db.prepare('DELETE FROM sessions').run();
  db.prepare('DELETE FROM caregivers').run();
  db.prepare('DELETE FROM admin_users').run();

  // ─── Admin Users ───────────────────────────────────────────────
  const adminHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'polaris2026', 10);
  const staffHash = await bcrypt.hash('staff2026', 10);

  db.prepare('INSERT INTO admin_users (username, password_hash, name, role) VALUES (?, ?, ?, ?)').run('admin', adminHash, 'Greg Kemper', 'admin');
  db.prepare('INSERT INTO admin_users (username, password_hash, name, role) VALUES (?, ?, ?, ?)').run('jessica', staffHash, 'Jessica Reyes', 'staff');
  console.log('[seed] Admin users created: admin / polaris2026, jessica / staff2026');

  // ─── Date helpers ──────────────────────────────────────────────
  const today = new Date();
  const future = (months) => { const d = new Date(today); d.setMonth(d.getMonth() + months); return d.toISOString().split('T')[0]; };
  const past = (months) => { const d = new Date(today); d.setMonth(d.getMonth() - months); return d.toISOString().split('T')[0]; };
  const pastDays = (days) => { const d = new Date(today); d.setDate(d.getDate() - days); return d.toISOString().split('T')[0]; };
  const dob = (year, month, day) => `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;

  // ─── Full Caregiver Records ────────────────────────────────────
  const caregivers = [
    {
      caregiver_id: '1001', first_name: 'Maria', last_name: 'Santos',
      email: 'maria.santos@gmail.com', phone: '(415) 723-8841',
      address_street: '1847 Folsom Street, Apt 3B', address_city: 'San Francisco', address_state: 'CA', address_zip: '94103',
      date_of_birth: dob(1985, 6, 12),
      emergency_contact_name: 'Carlos Santos', emergency_contact_phone: '(415) 723-9902', emergency_contact_relationship: 'Husband',
      prior_experience: '6 years providing in-home elder care in the Bay Area. Previously employed at Home Instead Senior Care (2018-2022) and Visiting Angels (2022-2024). Specialized in dementia and Alzheimer\'s care. Experienced with hoyer lifts, wheelchair transfers, and medication management.',
      certifications: 'CNA (Certified Nursing Assistant) - CA License #CNA-184729, Active\nCPR/AED - American Red Cross, Expires 2027-08\nAlzheimer\'s Association Dementia Care Certification\nFirst Aid - American Red Cross',
      availability: 'Full-time, Monday through Friday 7:00 AM - 7:00 PM. Available for weekend shifts with 48-hour notice. Prefers San Francisco and Daly City assignments. Has reliable vehicle.',
      status: 'active', viventium_id: '1001',
      signature_data: generateSignature('Maria Santos'),
      signed_at: pastDays(180),
      overall_compliance: 'complete',
      notes: 'Excellent caregiver. Multiple client compliments. Bilingual English/Spanish. Assigned to Mrs. Henderson (ongoing since Jan 2025).',
      created_at: pastDays(180),
    },
    {
      caregiver_id: '1002', first_name: 'James', last_name: 'Thompson',
      email: 'james.thompson.care@gmail.com', phone: '(510) 644-3217',
      address_street: '2230 Telegraph Avenue, Unit 12', address_city: 'Oakland', address_state: 'CA', address_zip: '94612',
      date_of_birth: dob(1991, 11, 3),
      emergency_contact_name: 'Patricia Thompson', emergency_contact_phone: '(510) 644-5580', emergency_contact_relationship: 'Mother',
      prior_experience: '3 years home health aide experience. Worked at Comfort Keepers Oakland (2021-2023). Skilled in mobility assistance, personal hygiene support, companionship care, and light meal preparation. Completed 120-hour HHA training program.',
      certifications: 'HHA (Home Health Aide) - Certificate #HHA-90214\nCPR/First Aid - American Heart Association, Expires 2026-11\nFood Handler\'s Card - Alameda County',
      availability: 'Full-time, flexible schedule. Available Monday-Saturday. Can work overnight shifts. Covers Oakland, Berkeley, Emeryville, and Alameda areas.',
      status: 'active', viventium_id: '1002',
      signature_data: generateSignature('James Thompson'),
      signed_at: pastDays(150),
      overall_compliance: 'incomplete', // car insurance expired
      notes: 'Car insurance expired last month. Sent reminder on 3/15. Waiting for updated proof of insurance.',
      created_at: pastDays(150),
    },
    {
      caregiver_id: '1003', first_name: 'Priya', last_name: 'Patel',
      email: 'priya.patel.care@outlook.com', phone: '(408) 556-7193',
      address_street: '485 South 10th Street', address_city: 'San Jose', address_state: 'CA', address_zip: '95112',
      date_of_birth: dob(1979, 2, 28),
      emergency_contact_name: 'Raj Patel', emergency_contact_phone: '(408) 556-7200', emergency_contact_relationship: 'Brother',
      prior_experience: '10+ years of caregiving experience across multiple agencies. Former lead caregiver at Right at Home San Jose (2015-2021). Specialized in post-surgical recovery care and chronic illness management. Experience with diabetes monitoring, wound care, and catheter management. Also provides cultural meal preparation for South Asian clients.',
      certifications: 'CNA (Certified Nursing Assistant) - CA License #CNA-112084, Active\nCPR/AED - American Red Cross, Expires 2027-03\nWound Care Certification - National Alliance for Wound Care\nMedication Aide Certification - CA\nFirst Aid Certified',
      availability: 'Full-time preferred, 8:00 AM - 6:00 PM weekdays. No overnight shifts. Will travel up to 20 miles from San Jose. Open to Santa Clara, Milpitas, Campbell, and Cupertino.',
      status: 'active', viventium_id: '1003',
      signature_data: generateSignature('Priya Patel'),
      signed_at: pastDays(320),
      overall_compliance: 'complete',
      notes: 'Senior caregiver. Handles complex medical cases. Has been with Polaris for nearly a year. Currently assigned to Mr. Tanaka (post-hip replacement recovery).',
      created_at: pastDays(320),
    },
    {
      caregiver_id: '1004', first_name: 'Robert', last_name: 'Johnson',
      email: 'rob.johnson88@yahoo.com', phone: '(925) 401-6634',
      address_street: '1520 Civic Drive, Apt 7', address_city: 'Walnut Creek', address_state: 'CA', address_zip: '94596',
      date_of_birth: dob(1988, 8, 19),
      emergency_contact_name: 'Denise Johnson', emergency_contact_phone: '(925) 401-7001', emergency_contact_relationship: 'Wife',
      prior_experience: '4 years caregiving. Previously with BrightStar Care Contra Costa (2020-2023). Experienced with male clients needing mobility assistance, veterans care, and companionship. Strong with physical transfers and exercise assistance.',
      certifications: 'HHA (Home Health Aide) - Certificate #HHA-67832\nCPR/First Aid - American Red Cross, Expires 2026-09\nVeterans Care Training Certificate',
      availability: 'Full-time Monday-Friday. Occasional Saturdays. Based in Walnut Creek, covers Concord, Pleasant Hill, Lafayette, and Martinez.',
      status: 'active', viventium_id: '1004',
      signature_data: generateSignature('Robert Johnson'),
      signed_at: pastDays(260),
      overall_compliance: 'incomplete', // DL expired
      notes: 'Driver\'s license expired 2 months ago. Robert says he has a DMV appointment next week. Follow up by end of month.',
      created_at: pastDays(260),
    },
    {
      caregiver_id: '1005', first_name: 'Ana', last_name: 'Rodriguez',
      email: 'ana.m.rodriguez@gmail.com', phone: '(650) 329-4478',
      address_street: '723 Middlefield Road', address_city: 'Redwood City', address_state: 'CA', address_zip: '94063',
      date_of_birth: dob(1982, 4, 7),
      emergency_contact_name: 'Miguel Rodriguez', emergency_contact_phone: '(650) 329-4500', emergency_contact_relationship: 'Husband',
      prior_experience: '8 years caregiving, including 3 years in hospice care. Formerly with Sutter Health at Home (2017-2020) and Kindred at Home (2020-2023). Specialized in end-of-life care, pain management support, and emotional/spiritual support for patients and families. Also experienced in general elder care and light housekeeping.',
      certifications: 'CNA (Certified Nursing Assistant) - CA License #CNA-145601, Active\nHospice and Palliative Care Aide Certification\nCPR/AED - American Heart Association, Expires 2027-06\nFirst Aid Certified\nBilingual Care Provider Certificate (English/Spanish)',
      availability: 'Full-time or part-time, very flexible. Available all days including weekends and holidays. Covers Redwood City, Menlo Park, Palo Alto, San Carlos, and Belmont.',
      status: 'active', viventium_id: '1005',
      signature_data: generateSignature('Ana Rodriguez'),
      signed_at: pastDays(200),
      overall_compliance: 'complete',
      notes: 'Bilingual English/Spanish. Specializes in hospice and end-of-life care. One of our most requested caregivers on the Peninsula.',
      created_at: pastDays(200),
    },
    {
      caregiver_id: '1006', first_name: 'David', last_name: 'Nguyen',
      email: 'david.nguyen.sac@gmail.com', phone: '(916) 442-8815',
      address_street: '3010 J Street, Apt 204', address_city: 'Sacramento', address_state: 'CA', address_zip: '95816',
      date_of_birth: dob(1993, 12, 1),
      emergency_contact_name: 'Linh Nguyen', emergency_contact_phone: '(916) 442-9003', emergency_contact_relationship: 'Father',
      prior_experience: '2 years caregiving with Sacramento Senior Services (2023-2025). Focused on companionship care, transportation to medical appointments, grocery shopping, and light exercise facilitation. Also has experience as a physical therapy aide (1 year).',
      certifications: 'HHA (Home Health Aide) - Certificate #HHA-103477\nCPR/First Aid - American Red Cross, Expires 2027-01\nPhysical Therapy Aide Certificate - Sacramento City College',
      availability: 'Full-time, Monday-Friday 8 AM - 5 PM. Available for Sacramento, West Sacramento, Elk Grove, and Rancho Cordova.',
      status: 'active', viventium_id: '1006',
      signature_data: generateSignature('David Nguyen'),
      signed_at: pastDays(90),
      overall_compliance: 'complete',
      notes: 'Sacramento region. Youngest caregiver on staff. Great with tech - helps clients with video calls to family. Trilingual: English, Vietnamese, some Mandarin.',
      created_at: pastDays(90),
    },
    {
      caregiver_id: '1007', first_name: 'Sarah', last_name: 'Kim',
      email: 'sarah.kim.sf@gmail.com', phone: '(415) 587-2246',
      address_street: '88 Westlake Avenue', address_city: 'Daly City', address_state: 'CA', address_zip: '94015',
      date_of_birth: dob(1987, 9, 23),
      emergency_contact_name: 'Daniel Kim', emergency_contact_phone: '(415) 587-3300', emergency_contact_relationship: 'Husband',
      prior_experience: '5 years caregiving. Worked with CareLinx (2019-2022) and independently (2022-2024). Experienced with Korean and Chinese elderly clients. Provides culturally appropriate meals, companionship, medication reminders, and personal care. Has experience with dementia care and memory exercises.',
      certifications: 'CNA (Certified Nursing Assistant) - CA License #CNA-167823, Active\nCPR/AED - American Red Cross, Expires 2026-12\nDementia Care Specialist Certification\nFirst Aid Certified',
      availability: 'Part-time to full-time, flexible. Monday-Saturday. Covers Daly City, South San Francisco, Pacifica, San Bruno, and Millbrae.',
      status: 'active', viventium_id: '1007',
      signature_data: generateSignature('Sarah Kim'),
      signed_at: pastDays(120),
      overall_compliance: 'incomplete', // missing car insurance
      notes: 'Missing car insurance document. Uses public transit for most assignments but needs insurance on file for company policy. Trilingual: English, Korean, conversational Mandarin.',
      created_at: pastDays(120),
    },
    {
      caregiver_id: '1008', first_name: 'Michael', last_name: 'Williams',
      email: 'mike.w.caregiver@gmail.com', phone: '(510) 848-1190',
      address_street: '1901 University Avenue, Apt 5C', address_city: 'Berkeley', address_state: 'CA', address_zip: '94704',
      date_of_birth: dob(1995, 1, 15),
      emergency_contact_name: 'Sharon Williams', emergency_contact_phone: '(510) 848-2200', emergency_contact_relationship: 'Mother',
      prior_experience: '1.5 years as a home health aide. Previously with Honor Home Care (2024-2025). Completed IHSS training through Alameda County. Experience with personal care, meal prep, and light housekeeping for elderly clients.',
      certifications: 'HHA (Home Health Aide) - Certificate #HHA-118900\nCPR/First Aid - American Red Cross, Expires 2027-05',
      availability: 'Full-time, any day. Very flexible. Willing to travel anywhere in the East Bay. Also open to San Francisco if needed.',
      status: 'applicant', viventium_id: null,
      signature_data: generateSignature('Michael Williams'),
      signed_at: pastDays(10),
      overall_compliance: 'incomplete',
      notes: 'New applicant. Interview completed 3/28. Positive impression. Waiting on background check and remaining documents before making hire decision.',
      created_at: pastDays(10),
    },
    {
      caregiver_id: '1009', first_name: 'Linda', last_name: 'Garcia',
      email: 'linda.garcia.care@hotmail.com', phone: '(408) 249-6671',
      address_street: '2400 El Camino Real, Unit 9', address_city: 'Santa Clara', address_state: 'CA', address_zip: '95051',
      date_of_birth: dob(1976, 7, 30),
      emergency_contact_name: 'Rosa Garcia', emergency_contact_phone: '(408) 249-7780', emergency_contact_relationship: 'Sister',
      prior_experience: '12 years total caregiving experience. 7 years with Maxim Healthcare (2012-2019), 3 years independent caregiver via Care.com (2019-2022), 2 years with Interim HealthCare (2022-2024). Extensive experience with chronic conditions including COPD, congestive heart failure, and diabetes. Skilled in oxygen therapy support, blood sugar monitoring, and complex medication schedules.',
      certifications: 'CNA (Certified Nursing Assistant) - CA License #CNA-098234, Active\nMedication Aide Certification - CA\nCPR/AED - American Heart Association, Expires 2026-08\nFirst Aid Certified\nDiabetes Care Education Certificate',
      availability: 'Full-time, weekdays preferred but flexible. Covers Santa Clara, Sunnyvale, Mountain View, and Los Altos. 15+ years clean driving record.',
      status: 'applicant', viventium_id: null,
      signature_data: generateSignature('Linda Garcia'),
      signed_at: pastDays(5),
      overall_compliance: 'incomplete',
      notes: 'Very experienced applicant. Interview on 4/2 went well. Greg flagged as a strong candidate. Has most documents ready - just needs to complete uploads.',
      created_at: pastDays(5),
    },
    {
      caregiver_id: '1010', first_name: 'Kevin', last_name: 'Chen',
      email: 'kevin.chen.paloalto@gmail.com', phone: '(650) 814-3302',
      address_street: '550 University Avenue, Suite A', address_city: 'Palo Alto', address_state: 'CA', address_zip: '94301',
      date_of_birth: dob(1990, 3, 18),
      emergency_contact_name: 'Wei Chen', emergency_contact_phone: '(650) 814-4410', emergency_contact_relationship: 'Father',
      prior_experience: '2 years caregiving with Sunrise Senior Living as a resident care aide. Also 1 year as a medical assistant at Palo Alto Medical Foundation. Experience with vitals monitoring, medication administration, wound care, and patient documentation.',
      certifications: 'CNA (Certified Nursing Assistant) - CA License #CNA-178445, Active\nCertified Medical Assistant (CMA) - AAMA\nCPR/AED - American Heart Association, Expires 2027-02\nFirst Aid Certified',
      availability: 'Part-time for now, transitioning to full-time in May. Available afternoons and weekends. Covers Palo Alto, Stanford, Mountain View, and Los Altos.',
      status: 'applicant', viventium_id: null,
      signature_data: generateSignature('Kevin Chen'),
      signed_at: pastDays(3),
      overall_compliance: 'incomplete',
      notes: 'Applicant. Has CMA certification which is uncommon - could be great for medically complex clients. Starting part-time, wants full-time by May. Bilingual English/Mandarin.',
      created_at: pastDays(3),
    },
  ];

  // Insert all caregivers with full data
  const insertCaregiver = db.prepare(`
    INSERT INTO caregivers (
      caregiver_id, first_name, last_name, email, phone,
      address_street, address_city, address_state, address_zip,
      date_of_birth, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
      prior_experience, certifications, availability,
      status, viventium_id, signature_data, signed_at,
      overall_compliance, notes, created_at, updated_at
    ) VALUES (
      @caregiver_id, @first_name, @last_name, @email, @phone,
      @address_street, @address_city, @address_state, @address_zip,
      @date_of_birth, @emergency_contact_name, @emergency_contact_phone, @emergency_contact_relationship,
      @prior_experience, @certifications, @availability,
      @status, @viventium_id, @signature_data, @signed_at,
      @overall_compliance, @notes, @created_at, @created_at
    )
  `);

  for (const c of caregivers) {
    insertCaregiver.run(c);
  }
  console.log(`[seed] Inserted ${caregivers.length} caregivers with full profile data.`);

  // ─── Documents ─────────────────────────────────────────────────
  const insertDoc = db.prepare(`
    INSERT INTO documents (
      caregiver_id, document_type, file_path, file_name, file_type, file_size,
      entered_date, ai_extracted_date, date_mismatch, compliance_status,
      uploaded_by, verified_by, verified_at, notes, created_at, updated_at
    ) VALUES (
      @caregiver_id, @document_type, @file_path, @file_name, @file_type, @file_size,
      @entered_date, @ai_extracted_date, @date_mismatch, @compliance_status,
      @uploaded_by, @verified_by, @verified_at, @notes, @created_at, @created_at
    )
  `);

  // Generate a real PDF file on disk for each document
  const uploadsDir = path.resolve(__dirname, '..', 'uploads');

  function generateDocPdf(caregiverId, docType, caregiverName, date) {
    const templates = {
      drivers_license: (name, dt) => [
        'STATE OF CALIFORNIA', 'DEPARTMENT OF MOTOR VEHICLES', 'DRIVER LICENSE', '',
        '====================================================', '',
        `   Name:         ${name.toUpperCase()}`,
        `   DL Number:    D${String(Math.floor(1000000 + Math.random() * 9000000))}`,
        '   Class:        C', '',
        `   Issue Date:   ${pastDays(365)}`,
        `   Expiration:   ${dt || 'N/A'}`, '',
        '====================================================',
        '   RESTRICTIONS: NONE', '   ENDORSEMENTS: NONE', '',
        '   Sample document for compliance portal demo.',
      ],
      tb_test: (name, dt) => [
        'BAY AREA COMMUNITY HEALTH CENTER', '1234 Mission Street, San Francisco, CA 94103', '',
        '====================================================',
        '     TUBERCULOSIS SKIN TEST (TST) RESULT', '====================================================', '',
        `   Patient Name:     ${name}`,
        `   Test Type:        Mantoux Tuberculin Skin Test (PPD)`,
        `   Date Read:        ${dt || 'N/A'}`,
        `   Read By:          Dr. Susan Park, MD`, '',
        '   Induration:       0 mm', '   Result:           NEGATIVE', '',
        '====================================================',
        '   Patient cleared for employment.', '',
        '   Sample document for compliance portal demo.',
      ],
      background_check: (name, dt) => [
        'STATE OF CALIFORNIA', 'DEPARTMENT OF JUSTICE', 'CAREGIVER BACKGROUND CHECK BUREAU', '',
        '====================================================',
        '  HOME CARE AIDE REGISTRATION - CONFIRMATION', '====================================================', '',
        `   Registration #:   HCA-${new Date().getFullYear()}-${String(Math.floor(100000 + Math.random() * 900000))}`,
        '   Status:           APPROVED / CLEARED', '',
        `   Applicant:        ${name.toUpperCase()}`,
        `   Employer:         POLARIS HOME CARE`, '',
        `   Registration:     ${dt || 'N/A'}`, '',
        '   FBI & DOJ:        CLEARED',
        '   Sex Offender:     CLEARED',
        '   Child Abuse:      CLEARED', '',
        '====================================================',
        '   Sample document for compliance portal demo.',
      ],
      car_insurance: (name, dt) => [
        'PROGRESSIVE INSURANCE', 'AUTOMOBILE INSURANCE ID CARD', '',
        '====================================================', '',
        `   Policy #:    ${Math.floor(100 + Math.random() * 900)}-${Math.floor(10 + Math.random() * 90)}-A${Math.floor(1000 + Math.random() * 9000)}`, '',
        `   Insured:     ${name.toUpperCase()}`, '',
        '   Vehicle:     2020 Honda Civic LX', '',
        '   Bodily Injury:     $100,000 / $300,000',
        '   Property Damage:   $50,000', '',
        `   Expiration:  ${dt || 'N/A'}`, '',
        '====================================================',
        '   Sample document for compliance portal demo.',
      ],
      social_security: (name) => [
        'SOCIAL SECURITY', 'UNITED STATES OF AMERICA', '',
        '====================================================', '',
        '', '',
        `            XXX-XX-${String(Math.floor(1000 + Math.random() * 9000))}`, '', '',
        `      ${name.toUpperCase()}`, '', '',
        '====================================================', '',
        '   THIS NUMBER HAS BEEN ESTABLISHED FOR',
        `   ${name.toUpperCase()}`, '',
        '   Sample document for compliance portal demo.',
        '   NOT A VALID GOVERNMENT DOCUMENT.',
      ],
    };

    const lines = (templates[docType] || templates.social_security)(caregiverName, date);
    const textLines = lines.map((line, i) => {
      const y = 750 - i * 22;
      const fontSize = i <= 2 ? (i === 0 ? 16 : 12) : 10;
      const escaped = line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
      return `BT /F1 ${fontSize} Tf 50 ${y} Td (${escaped}) Tj ET`;
    }).join('\n');

    const pdf = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length ${Buffer.byteLength(textLines)}>>
stream
${textLines}
endstream
endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000052 00000 n
0000000101 00000 n
0000000230 00000 n
${String(283 + Buffer.byteLength(textLines)).padStart(10,'0')} 00000 n
trailer<</Size 6/Root 1 0 R>>
startxref
${340 + Buffer.byteLength(textLines)}
%%EOF`;

    // Write to uploads dir
    const dir = path.join(uploadsDir, caregiverId);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, `${docType}.pdf`);
    fs.writeFileSync(filePath, pdf);
    return { size: Buffer.byteLength(pdf) };
  }

  function doc(cid, type, date, status, by, opts = {}) {
    // Find caregiver name for PDF content
    const cg = caregivers.find(c => c.caregiver_id === cid);
    const name = cg ? `${cg.first_name} ${cg.last_name}` : 'Unknown';
    const { size } = generateDocPdf(cid, type, name, date);

    return {
      caregiver_id: cid,
      document_type: type,
      file_path: `${cid}/${type}.pdf`,
      file_name: `${type}.pdf`,
      file_type: 'application/pdf',
      file_size: size,
      entered_date: date,
      ai_extracted_date: opts.aiDate || null,
      date_mismatch: opts.mismatch ? 1 : 0,
      compliance_status: status,
      uploaded_by: by,
      verified_by: opts.verifiedBy || null,
      verified_at: opts.verifiedAt || null,
      notes: opts.notes || null,
      created_at: opts.createdAt || pastDays(30),
    };
  }

  const docs = [
    // ── 1001 Maria Santos (active, COMPLETE) ──
    doc('1001', 'drivers_license', future(18), 'valid', 'caregiver', { aiDate: future(18), createdAt: pastDays(178), verifiedBy: 'Greg Kemper', verifiedAt: pastDays(177) }),
    doc('1001', 'tb_test', past(4), 'valid', 'caregiver', { aiDate: past(4), createdAt: pastDays(178), verifiedBy: 'Greg Kemper', verifiedAt: pastDays(177) }),
    doc('1001', 'background_check', pastDays(175), 'valid', 'admin', { createdAt: pastDays(175), verifiedBy: 'Greg Kemper', verifiedAt: pastDays(175), notes: 'Background check received directly from DOJ.' }),
    doc('1001', 'car_insurance', future(7), 'valid', 'caregiver', { aiDate: future(7), createdAt: pastDays(178), verifiedBy: 'Greg Kemper', verifiedAt: pastDays(177) }),
    doc('1001', 'social_security', null, 'valid', 'caregiver', { createdAt: pastDays(178), verifiedBy: 'Greg Kemper', verifiedAt: pastDays(177) }),

    // ── 1002 James Thompson (active, INCOMPLETE - insurance expired) ──
    doc('1002', 'drivers_license', future(14), 'valid', 'caregiver', { aiDate: future(14), createdAt: pastDays(148) }),
    doc('1002', 'tb_test', past(8), 'valid', 'caregiver', { createdAt: pastDays(148) }),
    doc('1002', 'background_check', pastDays(140), 'valid', 'admin', { createdAt: pastDays(140), notes: 'DOJ clearance received.' }),
    doc('1002', 'car_insurance', past(1), 'expired', 'caregiver', { aiDate: past(1), createdAt: pastDays(148), notes: 'EXPIRED - reminder sent 3/15.' }),
    doc('1002', 'social_security', null, 'valid', 'caregiver', { createdAt: pastDays(148) }),

    // ── 1003 Priya Patel (active, COMPLETE) ──
    doc('1003', 'drivers_license', future(22), 'valid', 'caregiver', { aiDate: future(22), createdAt: pastDays(318), verifiedBy: 'Greg Kemper', verifiedAt: pastDays(317) }),
    doc('1003', 'tb_test', past(10), 'valid', 'caregiver', { createdAt: pastDays(318), notes: 'Chest X-ray (prior TB exposure). X-ray is clear.', verifiedBy: 'Greg Kemper', verifiedAt: pastDays(317) }),
    doc('1003', 'background_check', pastDays(310), 'valid', 'admin', { createdAt: pastDays(310), verifiedBy: 'Greg Kemper', verifiedAt: pastDays(310) }),
    doc('1003', 'car_insurance', future(4), 'valid', 'caregiver', { aiDate: future(4), createdAt: pastDays(60), notes: 'Renewed policy uploaded 2 months ago.', verifiedBy: 'Jessica Reyes', verifiedAt: pastDays(59) }),
    doc('1003', 'social_security', null, 'valid', 'caregiver', { createdAt: pastDays(318), verifiedBy: 'Greg Kemper', verifiedAt: pastDays(317) }),

    // ── 1004 Robert Johnson (active, INCOMPLETE - DL expired) ──
    doc('1004', 'drivers_license', past(2), 'expired', 'caregiver', { aiDate: past(2), createdAt: pastDays(258), notes: 'EXPIRED - DMV appointment scheduled.' }),
    doc('1004', 'tb_test', past(6), 'valid', 'caregiver', { createdAt: pastDays(258), verifiedBy: 'Greg Kemper', verifiedAt: pastDays(257) }),
    doc('1004', 'background_check', pastDays(250), 'valid', 'admin', { createdAt: pastDays(250) }),
    doc('1004', 'car_insurance', future(9), 'valid', 'caregiver', { aiDate: future(9), createdAt: pastDays(258) }),
    doc('1004', 'social_security', null, 'valid', 'caregiver', { createdAt: pastDays(258) }),

    // ── 1005 Ana Rodriguez (active, COMPLETE) ──
    doc('1005', 'drivers_license', future(20), 'valid', 'caregiver', { aiDate: future(20), createdAt: pastDays(198), verifiedBy: 'Greg Kemper', verifiedAt: pastDays(197) }),
    doc('1005', 'tb_test', past(3), 'valid', 'caregiver', { aiDate: past(3), createdAt: pastDays(198), verifiedBy: 'Greg Kemper', verifiedAt: pastDays(197) }),
    doc('1005', 'background_check', pastDays(190), 'valid', 'admin', { createdAt: pastDays(190), verifiedBy: 'Greg Kemper', verifiedAt: pastDays(190) }),
    doc('1005', 'car_insurance', future(5), 'valid', 'caregiver', { aiDate: future(5), createdAt: pastDays(198), verifiedBy: 'Greg Kemper', verifiedAt: pastDays(197) }),
    doc('1005', 'social_security', null, 'valid', 'caregiver', { createdAt: pastDays(198), verifiedBy: 'Greg Kemper', verifiedAt: pastDays(197) }),

    // ── 1006 David Nguyen (active, COMPLETE) ──
    doc('1006', 'drivers_license', future(30), 'valid', 'caregiver', { aiDate: future(30), createdAt: pastDays(88), verifiedBy: 'Jessica Reyes', verifiedAt: pastDays(87) }),
    doc('1006', 'tb_test', past(2), 'valid', 'caregiver', { aiDate: past(2), createdAt: pastDays(88), verifiedBy: 'Jessica Reyes', verifiedAt: pastDays(87) }),
    doc('1006', 'background_check', pastDays(80), 'valid', 'admin', { createdAt: pastDays(80), verifiedBy: 'Jessica Reyes', verifiedAt: pastDays(80), notes: 'DOJ clearance. Clean record.' }),
    doc('1006', 'car_insurance', future(10), 'valid', 'caregiver', { aiDate: future(10), createdAt: pastDays(88), verifiedBy: 'Jessica Reyes', verifiedAt: pastDays(87) }),
    doc('1006', 'social_security', null, 'valid', 'caregiver', { createdAt: pastDays(88), verifiedBy: 'Jessica Reyes', verifiedAt: pastDays(87) }),

    // ── 1007 Sarah Kim (active, INCOMPLETE - missing car insurance) ──
    doc('1007', 'drivers_license', future(11), 'valid', 'caregiver', { aiDate: future(11), createdAt: pastDays(118) }),
    doc('1007', 'tb_test', past(5), 'valid', 'caregiver', { createdAt: pastDays(118) }),
    doc('1007', 'background_check', pastDays(110), 'valid', 'admin', { createdAt: pastDays(110) }),
    // car_insurance MISSING for 1007
    doc('1007', 'social_security', null, 'valid', 'caregiver', { createdAt: pastDays(118) }),

    // ── 1008 Michael Williams (applicant - partial docs) ──
    doc('1008', 'drivers_license', future(24), 'valid', 'caregiver', { aiDate: future(24), createdAt: pastDays(9) }),
    doc('1008', 'tb_test', pastDays(15), 'valid', 'caregiver', { createdAt: pastDays(9) }),
    doc('1008', 'social_security', null, 'valid', 'caregiver', { createdAt: pastDays(9) }),

    // ── 1009 Linda Garcia (applicant - has some docs, one mismatch) ──
    doc('1009', 'drivers_license', future(16), 'valid', 'caregiver', { aiDate: future(15), mismatch: true, createdAt: pastDays(4), notes: 'AI date differs by 1 month. Needs staff review.' }),
    doc('1009', 'tb_test', past(1), 'valid', 'caregiver', { createdAt: pastDays(4), notes: 'Chest X-ray submitted. Prior TB exposure.' }),
    doc('1009', 'car_insurance', future(6), 'valid', 'caregiver', { aiDate: future(6), createdAt: pastDays(4) }),
    doc('1009', 'social_security', null, 'valid', 'caregiver', { createdAt: pastDays(4) }),

    // ── 1010 Kevin Chen (applicant - just started, minimal docs) ──
    doc('1010', 'drivers_license', future(28), 'valid', 'caregiver', { aiDate: future(28), createdAt: pastDays(2) }),
  ];

  for (const d of docs) {
    insertDoc.run(d);
  }
  console.log(`[seed] Inserted ${docs.length} compliance documents.`);

  // ─── Audit Log Entries ─────────────────────────────────────────
  const insertAudit = db.prepare(`
    INSERT INTO audit_log (action, entity_type, entity_id, admin_user_id, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const auditEntries = [
    ['status_change', 'caregiver', '1001', 1, '{"from":"applicant","to":"active"}', pastDays(175)],
    ['status_change', 'caregiver', '1002', 1, '{"from":"applicant","to":"active"}', pastDays(142)],
    ['status_change', 'caregiver', '1003', 1, '{"from":"applicant","to":"active"}', pastDays(310)],
    ['status_change', 'caregiver', '1004', 1, '{"from":"applicant","to":"active"}', pastDays(252)],
    ['status_change', 'caregiver', '1005', 1, '{"from":"applicant","to":"active"}', pastDays(192)],
    ['status_change', 'caregiver', '1006', 2, '{"from":"applicant","to":"active"}', pastDays(82)],
    ['status_change', 'caregiver', '1007', 2, '{"from":"applicant","to":"active"}', pastDays(112)],
    ['document_upload', 'caregiver', '1003', 1, '{"document_type":"background_check","uploaded_by":"admin"}', pastDays(310)],
    ['document_upload', 'caregiver', '1001', 1, '{"document_type":"background_check","uploaded_by":"admin"}', pastDays(175)],
    ['document_upload', 'caregiver', '1004', 1, '{"document_type":"background_check","uploaded_by":"admin"}', pastDays(250)],
    ['compliance_reminder', 'caregiver', '1002', 2, '{"type":"car_insurance","message":"Reminder sent about expired car insurance"}', pastDays(20)],
    ['compliance_reminder', 'caregiver', '1004', 1, '{"type":"drivers_license","message":"Reminder sent about expired DL"}', pastDays(15)],
  ];

  for (const a of auditEntries) {
    insertAudit.run(...a);
  }
  console.log(`[seed] Inserted ${auditEntries.length} audit log entries.`);

  console.log('\n[seed] ═══════════════════════════════════════════');
  console.log('[seed] Demo data summary:');
  console.log('[seed]   Admin users: 2 (admin/polaris2026, jessica/staff2026)');
  console.log('[seed]   Caregivers: 10 (7 active, 3 applicants)');
  console.log('[seed]   Documents: ' + docs.length);
  console.log('[seed]   Fully compliant: 4 (Maria, Priya, Ana, David)');
  console.log('[seed]   Expired docs: 2 (James=insurance, Robert=DL)');
  console.log('[seed]   Missing docs: 3 (Sarah=insurance, Michael=2, Kevin=4)');
  console.log('[seed]   Date mismatches: 1 (Linda=DL)');
  console.log('[seed]   Audit log entries: ' + auditEntries.length);
  console.log('[seed] ═══════════════════════════════════════════\n');

  closeDb();
}

if (require.main === module) {
  require('dotenv').config();
  seed().catch(console.error);
}

module.exports = { seed };
