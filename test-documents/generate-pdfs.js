// Generates 5 test compliance document PDFs with realistic content
// Uses raw PDF syntax - no external dependencies needed

const fs = require('fs');
const path = require('path');

function makePdf(lines, title) {
  // Build a minimal valid PDF with text content
  const textLines = lines.map((line, i) => {
    const y = 750 - i * 20;
    const escaped = line.replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    return `BT /F1 ${line.startsWith('===') || line.startsWith('   ') && line.includes(':') ? 11 : i === 0 ? 18 : i <= 2 ? 14 : 11} Tf 50 ${y} Td (${escaped}) Tj ET`;
  }).join('\n');

  const stream = `stream
${textLines}
endstream`;

  const streamLength = textLines.length + 1;

  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj

2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj

3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]
   /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj

4 0 obj
<< /Length ${Buffer.byteLength(textLines)} >>
stream
${textLines}
endstream
endobj

5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj

xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000266 00000 n
${String(300 + Buffer.byteLength(textLines)).padStart(10, '0')} 00000 n

trailer
<< /Size 6 /Root 1 0 R >>
startxref
${360 + Buffer.byteLength(textLines)}
%%EOF`;

  return pdf;
}

const outputDir = __dirname;

// 1. Driver's License
const dl = makePdf([
  'STATE OF CALIFORNIA',
  'DEPARTMENT OF MOTOR VEHICLES',
  'DRIVER LICENSE',
  '',
  '===================================================',
  '',
  '   DL Number:    D7294018',
  '   Class:        C',
  '',
  '   Name:         VELASQUEZ, CARMEN MARIA',
  '   DOB:          03/14/1988',
  '   Sex:          F',
  '   Hair:         BRN',
  '   Eyes:         BRN',
  '   Height:       5-06',
  '   Weight:       135 lbs',
  '',
  '   Address:      742 GEARY STREET APT 3B',
  '                 SAN FRANCISCO, CA 94109',
  '',
  '   Issue Date:   06/15/2023',
  '   Expiration:   03/14/2028',
  '',
  '===================================================',
  '   RESTRICTIONS: NONE',
  '   ENDORSEMENTS: NONE',
  '',
  '   This is a sample document for testing purposes.',
], 'California Drivers License');
fs.writeFileSync(path.join(outputDir, 'drivers_license_carmen_velasquez.pdf'), dl);

// 2. TB Test Result
const tb = makePdf([
  'BAY AREA COMMUNITY HEALTH CENTER',
  '1234 Mission Street, San Francisco, CA 94103',
  'Phone: (415) 555-0200  |  Fax: (415) 555-0201',
  '',
  '===================================================',
  '     TUBERCULOSIS SKIN TEST (TST) RESULT',
  '===================================================',
  '',
  '   Patient Name:     Carmen M. Velasquez',
  '   Date of Birth:    03/14/1988',
  '   Patient ID:       BACH-20260115-0847',
  '',
  '   Test Type:        Mantoux Tuberculin Skin Test (PPD)',
  '   Date Placed:      01/13/2026',
  '   Date Read:        01/15/2026',
  '   Read By:          Dr. Susan Park, MD',
  '',
  '   Induration:       0 mm',
  '   Result:           NEGATIVE',
  '',
  '===================================================',
  '   INTERPRETATION: No evidence of TB infection.',
  '   Patient cleared for employment.',
  '',
  '   Physician Signature: Dr. Susan Park, MD',
  '   License #: CA-A098712',
  '',
  '   This is a sample document for testing purposes.',
], 'TB Test Result');
fs.writeFileSync(path.join(outputDir, 'tb_test_carmen_velasquez.pdf'), tb);

// 3. Background Check Registration
const bg = makePdf([
  'STATE OF CALIFORNIA',
  'DEPARTMENT OF JUSTICE',
  'CAREGIVER BACKGROUND CHECK BUREAU',
  '',
  '===================================================',
  '  HOME CARE AIDE REGISTRATION - CONFIRMATION',
  '===================================================',
  '',
  '   Registration Number:   HCA-2026-0293847',
  '   Status:                APPROVED / CLEARED',
  '',
  '   Applicant Name:        VELASQUEZ, CARMEN MARIA',
  '   Date of Birth:         03/14/1988',
  '   SSN (last 4):          **-***-4829',
  '',
  '   Employer:              POLARIS HOME CARE',
  '   Employer Address:      San Francisco, CA',
  '',
  '   Registration Date:     02/10/2026',
  '   Effective Through:     02/10/2028',
  '',
  '   Background Check:      FBI & DOJ - CLEARED',
  '   Sex Offender Registry: CLEARED',
  '   Child Abuse Index:     CLEARED',
  '',
  '===================================================',
  '   This individual has met all requirements under',
  '   Health & Safety Code Section 1796.18.',
  '',
  '   This is a sample document for testing purposes.',
], 'Background Check');
fs.writeFileSync(path.join(outputDir, 'background_check_carmen_velasquez.pdf'), bg);

// 4. Car Insurance
const ins = makePdf([
  'PROGRESSIVE INSURANCE',
  'AUTOMOBILE INSURANCE ID CARD',
  '',
  '===================================================',
  '',
  '   Policy Number:     916-28-A4729',
  '   NAIC Number:       24260',
  '',
  '   Named Insured:',
  '   CARMEN M. VELASQUEZ',
  '   742 GEARY STREET, APT 3B',
  '   SAN FRANCISCO, CA 94109',
  '',
  '   Vehicle:',
  '   2019 Honda Civic LX',
  '   VIN: 2HGFC2F59KH******',
  '',
  '   Coverage:',
  '   Bodily Injury:     $100,000 / $300,000',
  '   Property Damage:   $50,000',
  '   Uninsured Motor.:  $100,000 / $300,000',
  '',
  '   Effective Date:    01/01/2026',
  '   Expiration Date:   01/01/2027',
  '',
  '===================================================',
  '   This card must be carried in the insured vehicle.',
  '',
  '   This is a sample document for testing purposes.',
], 'Car Insurance');
fs.writeFileSync(path.join(outputDir, 'car_insurance_carmen_velasquez.pdf'), ins);

// 5. Social Security Card
const ssn = makePdf([
  'SOCIAL SECURITY',
  'UNITED STATES OF AMERICA',
  '',
  '===================================================',
  '',
  '',
  '',
  '            XXX-XX-4829',
  '',
  '',
  '      CARMEN MARIA VELASQUEZ',
  '',
  '',
  '',
  '===================================================',
  '',
  '   THIS NUMBER HAS BEEN ESTABLISHED FOR',
  '   CARMEN MARIA VELASQUEZ',
  '',
  '   Signature: [signed]',
  '',
  '',
  '   This is a sample document for testing purposes.',
  '   NOT A VALID GOVERNMENT DOCUMENT.',
], 'Social Security Card');
fs.writeFileSync(path.join(outputDir, 'social_security_carmen_velasquez.pdf'), ssn);

console.log('Generated 5 test PDF documents:');
const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.pdf'));
files.forEach(f => {
  const stats = fs.statSync(path.join(outputDir, f));
  console.log(`  ${f} (${(stats.size / 1024).toFixed(1)} KB)`);
});
