# PRD: Polaris Home Care -- Caregiver Compliance & Onboarding Portal

**Customer**: Greg Kemper, Polaris Home Care
**Date**: 2026-03-31
**Sagan Scoper**: Jon Matzner
**Credit Allocation**: 1 credit (10 dev hours)

---

## 1. One-Line Summary

A compliance document collection, validation, and lookup portal that lets Polaris Home Care onboard new caregivers digitally, store mandatory documents in a structured database, and surface compliance status on demand for state audits.

---

## 2. Build Spec

- **Digital onboarding form** replacing pen-and-paper hiring paperwork, with e-signature capability, that creates a new caregiver record in a structured database.
- **Document upload portal** where new hires submit required compliance documents (driver's license, TB test, background check registration, car insurance, Social Security card) with manual date entry fields for expiration/completion dates.
- **AI-assisted document scanning** using a low-cost model to extract and validate dates from uploaded document images (driver's license expiration, TB test read date, insurance expiration) -- applied where cost-effective given ~15-30 uploads/month volume.
- **Structured compliance database** with per-caregiver records showing document status (complete/incomplete, valid/expired) with the ability to filter and sort by compliance state.
- **Admin lookup and upload interface** allowing privileged staff to search any caregiver's file, view compliance status at a glance, and manually upload documents on their behalf.

---

## 3. Company Context

**Polaris Home Care** is a licensed, bonded, and insured in-home care agency serving the Greater San Francisco Bay Area and Sacramento regions across 40+ cities in Northern California. Founded ~10 years ago by Greg Kemper (bootstrapped from age 22-23), the company provides personal care, companionship, care management, household tasks, transportation, memory care, and transitional care for seniors aging in place. All caregivers are W-2 employees with a minimum of one year of prior experience.

The company does approximately $3M in annual revenue and has plateaued around $2.5M for the past 3-4 years. Roughly 25% of business comes from lead aggregators, with an outside salesperson calling on hospitals and nursing facilities for the remainder. Polaris currently manages ~150 active employees and processes ~200 applicants/month, hiring approximately 15/month with 25-30 interviews/month. They use Viventium as their payroll provider and currently store all compliance documents in Google Drive folders organized by employee.

As a California-based home care agency, Polaris is subject to state inspections that check for caregiver registration (background checks), TB test compliance, and training logs. Non-compliance carries significant financial risk (fines) and operational risk (license jeopardy). The current paper-based, Google-Drive-scattered compliance tracking system is manual, error-prone, and difficult to query during an audit.

---

## 4. Developer Brief

### 4.1 Digital Onboarding Form (E-Sign Hiring Paperwork)

Greg confirmed that new hires currently complete state-mandated hiring paperwork with pen and paper, which staff then scan. The build replaces this with a digital form that the caregiver fills out on a device (in-office or via a shared link). On submission, the form creates a new record in the compliance database, serving as the trigger for the rest of the onboarding flow. Greg mentioned they have some of this on Dropbox Sign already, but wants it unified into this system. The form should capture: full legal name, contact info, and all fields required by their current paper packet (Greg will supply a copy of the form as a deliverable). Upon submission, a unique caregiver ID is generated (4-digit number scheme, consistent with their Viventium payroll IDs so it can be reused later).

### 4.2 Document Upload Portal

After the onboarding form is submitted, the caregiver is walked through uploading each required document. The portal collects:

| Document | Upload Type | Structured Data Extracted | Expiration Tracked |
|---|---|---|---|
| Driver's License | Image (scan/photo) | Expiration date | Yes |
| Tuberculosis Test (skin test or chest X-ray) | Image (scan/photo) | Negative read date | Yes (renewal cycle) |
| Background Check Registration | Standardized state document | Registration date | Yes |
| Car Insurance | Image (scan/photo) | Expiration date | Yes |
| Social Security Card | Image (scan/photo) | None (identity verification only) | No |

For the TB test field: a single upload field accepting either a skin test result or a chest X-ray, since 5-10% of applicants have prior TB exposure and require the X-ray variant. No branching logic needed -- the caregiver uploads whichever applies.

Each upload stores: (a) the original image/PDF file, and (b) a manually entered date field (expiration or completion date). AI-assisted extraction is a stretch goal where cost allows (see 4.3).

### 4.3 AI Document Scanning (Cost-Optimized)

Given the volume (~15-30 new hires/month), Jon confirmed the build should explore using a low-cost AI model to extract dates from uploaded document images. The primary approach agreed upon is **manual date entry by the caregiver with staff verification** -- the caregiver inputs the date, staff can pull up the original image to verify. If a sufficiently cheap model is available (e.g., Gemini Flash), we layer in optional AI extraction as a verification assist or auto-fill. The system should always store the original document image so staff can manually verify any entry.

### 4.4 Structured Compliance Database

Replace the Google Drive folder structure with a relational database where each caregiver is a record with:
- Personal info (from onboarding form)
- Caregiver ID (auto-generated 4-digit number)
- Status: applicant vs. active employee
- Per-document fields: file attachment, date value, compliance status (valid/expired/missing)
- Overall compliance status: complete (all documents present and valid) vs. incomplete

The database must support:
- Filtering by compliance status (show all out-of-compliance caregivers)
- Searching by caregiver name or ID
- Sorting by expiration date (to see who is expiring soonest)

### 4.5 Admin Lookup & Upload Interface

A web-based admin dashboard for Polaris staff (Greg, office managers) to:
- Look up any caregiver by name or ID
- View their full compliance profile at a glance (document status with green/red indicators)
- View/download original uploaded documents
- Manually upload documents on behalf of a caregiver (e.g., when Polaris receives the background check directly)
- Filter the full roster to see all caregivers with incomplete or expired documents

---

## 5. Stack Suggestions

| Layer | Tool | Rationale |
|---|---|---|
| Hosting / Runtime | Railway | Sagan default. Handles web app + background jobs. Simple deploy. |
| Automation / Orchestration | n8n (self-hosted on Railway) | Webhook-driven flows for form submission, file processing, notification triggers. |
| AI Model (document scanning) | Gemini Flash 3 | Lowest-cost vision model for date extraction from document images. Fallback: manual entry. |
| AI Model (fallback/complex) | Claude Opus 4.6 | Only if Gemini Flash cannot handle edge-case document formats. |
| Database | PostgreSQL (Railway) | Relational structure for caregiver records, document metadata, compliance status. Native to Railway. |
| File Storage | Railway Volume or S3-compatible (Cloudflare R2) | Store original document images/PDFs. R2 preferred for cost if volume grows. |
| Frontend | n8n Form nodes + lightweight custom UI (HTML/JS) | Caregiver-facing upload forms via n8n; admin dashboard as a simple web app or n8n-powered interface. |
| SMS (future phase) | Twilio | For push notifications / compliance reminders. Deferred to phase 2. |

**Environment Variables Required**:
- `DATABASE_URL` -- PostgreSQL connection string
- `GEMINI_API_KEY` -- Google AI API key for document scanning
- `ANTHROPIC_API_KEY` -- Claude API key (fallback)
- `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET` -- File storage credentials
- `N8N_WEBHOOK_URL` -- Base URL for n8n webhook triggers
- `APP_SECRET` -- Session/auth secret for admin interface

---

## 6. Screen Share Timestamps

No screen share, screenshots, or video were captured for this project. All requirements were derived from the audio transcript of the scoping call dated March 12.

---

## 7. Key Definitions

| Term | Definition |
|---|---|
| **Caregiver** | A W-2 employee or applicant of Polaris Home Care who provides in-home care services. |
| **Compliance documents** | State-mandated documents a caregiver must have on file: driver's license, TB test, background check registration, car insurance, Social Security card. |
| **Registration document** | Greg's term for the standardized state-issued background check result document. |
| **TB test** | Tuberculosis screening -- either a skin test (PPD) with a negative read, or a chest X-ray for those with prior TB exposure (~5-10% of applicants). |
| **Viventium** | Polaris's payroll provider, which generates employee IDs (4-digit numbers) used as the canonical identifier. |
| **Compliance status** | Per-document: valid (present + not expired), expired (present + past expiration), missing (not uploaded). Per-caregiver: complete (all documents valid) vs. incomplete. |
| **PII** | Personally Identifiable Information -- Social Security cards, medical records (TB tests), and other sensitive caregiver data requiring secure handling. |
| **Onboarding form** | The state-mandated hiring paperwork currently done on pen-and-paper that will be digitized as the entry point to the system. |

---

## 8. Engineering Stories

### Story 1: Digital Onboarding Form & Record Creation

**User Story**: As a new caregiver hire, I can fill out my hiring paperwork digitally on a device so that my information is captured in a structured database without paper scanning.

**Engineering Sub-Stories**:

1.1 **Build the onboarding form schema**
- Replicate the fields from Polaris's current paper hiring packet (Greg to supply copy) as a digital form.
- Include e-signature capture field.
- *AC*: Form contains all fields present in the paper packet. Form renders on mobile and desktop browsers. E-signature field captures and stores a signature image.

1.2 **Auto-generate caregiver ID on submission**
- On form submission, generate a unique 4-digit caregiver ID.
- Create a new record in the PostgreSQL database with status "applicant."
- *AC*: Each submission creates a unique caregiver record. No duplicate IDs are generated. Record status defaults to "applicant."

1.3 **Post-submission redirect to document upload portal**
- After form submission, redirect the caregiver to the document upload flow (Story 2) pre-linked to their new record.
- *AC*: Caregiver lands on the upload portal with their record already associated. No manual ID entry required.

---

### Story 2: Document Upload Portal

**User Story**: As a new caregiver, I can upload my compliance documents (driver's license, TB test, background check, car insurance, Social Security card) and enter relevant dates so that Polaris has my compliance file without me mailing or bringing in paper copies.

**Engineering Sub-Stories**:

2.1 **Build the multi-step upload form**
- One section per document type (driver's license, TB test, background check registration, car insurance, Social Security card).
- Each section: file upload field (accepts JPEG, PNG, PDF) + manual date entry field (expiration or completion date). Social Security card has upload only, no date field.
- TB test section accepts either skin test result or chest X-ray with a single upload field.
- *AC*: All five document types have upload fields. Date fields accept and validate date format. Accepted file types: JPEG, PNG, PDF. Files up to 10MB accepted.

2.2 **Store uploaded files securely**
- Save files to S3-compatible storage (R2) with encryption at rest.
- Store file reference (URL/key) in the caregiver's database record.
- *AC*: Files are stored in encrypted object storage. Database record links to the stored file. Files are not publicly accessible (require authenticated access).

2.3 **Compute per-document compliance status**
- On date entry: compare entered date against current date to determine valid/expired.
- If no upload and no date: status = "missing."
- If upload present + date valid: status = "valid" (green).
- If upload present + date expired: status = "expired" (red).
- *AC*: Each document displays correct status. Expiration logic correctly handles future vs. past dates. Social Security card is valid/missing only (no expiration).

2.4 **Compute overall caregiver compliance status**
- Roll up per-document statuses into an overall status: "complete" (all valid) vs. "incomplete" (any missing or expired).
- *AC*: Caregiver record shows aggregate compliance status. Status updates whenever a document is added or a date changes.

---

### Story 3: AI-Assisted Date Extraction (Cost-Optimized)

**User Story**: As Polaris staff, I want the system to attempt to auto-extract dates from uploaded document images so that I can verify caregiver-entered dates more efficiently.

**Engineering Sub-Stories**:

3.1 **Implement vision-based date extraction**
- On document upload, pass the image to Gemini Flash 3 with a structured prompt to extract the relevant date (expiration date for driver's license/insurance, read date for TB test).
- Return extracted date as a suggested value alongside the caregiver's manual entry.
- *AC*: API call fires on upload. Extracted date is stored as a separate "AI-suggested" field. If extraction fails or returns low confidence, the field is left blank (graceful degradation). Cost per call is logged.

3.2 **Staff verification flag**
- If AI-extracted date differs from caregiver-entered date, flag the record for staff review.
- *AC*: Mismatch triggers a visual indicator on the admin dashboard. Staff can resolve by accepting either value.

---

### Story 4: Admin Lookup & Dashboard

**User Story**: As Polaris office staff, I can search for any caregiver, view their compliance status at a glance, and upload documents on their behalf so that I can manage compliance during audits and day-to-day operations.

**Engineering Sub-Stories**:

4.1 **Build the admin dashboard**
- Web-based interface with authentication (username/password for Polaris staff).
- Landing view: table of all caregivers with columns for name, ID, status (applicant/employee), and overall compliance status (green/red).
- Filter controls: filter by compliance status (complete/incomplete), by document status (missing/expired), by caregiver status (applicant/employee).
- Sort controls: sort by name, ID, nearest expiration date.
- *AC*: Dashboard loads all caregivers. Filters and sorts function correctly. Page loads in under 3 seconds for 150 records.

4.2 **Caregiver detail view**
- Click a caregiver row to see their full profile: personal info, all documents with status (green/red/missing), uploaded file previews, entered dates, AI-suggested dates (if any).
- Download button for each uploaded document.
- *AC*: Detail view shows all five document types with status. Files can be previewed (images) or downloaded (PDFs). Dates are displayed clearly.

4.3 **Admin document upload**
- From the caregiver detail view, staff can upload a document and enter a date on behalf of the caregiver (e.g., when Polaris receives a background check directly from the state).
- *AC*: Admin-uploaded documents behave identically to caregiver-uploaded ones. Compliance status recalculates on upload.

4.4 **Manual status override (applicant to employee)**
- Admin can change a caregiver's status from "applicant" to "active employee" and optionally enter their Viventium payroll ID.
- *AC*: Status change persists. Viventium ID field is optional and stored. Filtering by status reflects the change.

---

### Story 5: Database Schema & Infrastructure

**User Story**: As the development team, I need the database schema, hosting, and file storage provisioned so that all other stories have a foundation to build on.

**Engineering Sub-Stories**:

5.1 **Provision Railway environment**
- Set up Railway project with PostgreSQL, n8n instance, and web app service.
- Configure environment variables.
- *AC*: All services are running on Railway. Database is accessible. n8n is reachable at its configured URL.

5.2 **Design and migrate database schema**
- Tables: `caregivers` (id, name, contact info, status, viventium_id, created_at), `documents` (id, caregiver_id, document_type, file_url, entered_date, ai_extracted_date, compliance_status, uploaded_by, created_at).
- *AC*: Schema supports all document types. Foreign key relationships are enforced. Indexes on caregiver name, ID, compliance status for query performance.

5.3 **Configure secure file storage**
- Set up R2 bucket (or Railway Volume) with private access.
- Implement signed URL generation for file access from the admin dashboard.
- *AC*: Files are not publicly accessible. Signed URLs expire after a configurable period (e.g., 15 minutes). Upload and retrieval work end-to-end.

5.4 **PII security baseline**
- Ensure HTTPS on all endpoints. Database credentials are environment variables only. No PII in application logs. File storage encrypted at rest.
- *AC*: No PII is exposed in logs or error messages. All traffic is HTTPS. Credentials are not hardcoded.

---

## 9. Data Sources

| Source | Direction | Description |
|---|---|---|
| Caregiver (via upload portal) | **Inbound** | Document images (JPEG/PNG/PDF) and manually entered dates submitted through the onboarding form and upload flow. |
| Polaris staff (via admin dashboard) | **Inbound** | Documents uploaded on behalf of caregivers; status changes; date corrections. |
| Gemini Flash 3 API | **Outbound/Inbound** | Document images sent for date extraction; extracted dates returned. |
| PostgreSQL (Railway) | **Internal** | Caregiver records, document metadata, compliance status. |
| Cloudflare R2 / Railway Volume | **Internal** | Original document file storage. |
| Google Drive (existing) | **Manual migration** | Existing employee compliance files (~150 folders) to be manually re-uploaded into the new system by Polaris staff. Not automated. |
| Viventium (payroll) | **Reference only** | Employee IDs referenced for cross-system consistency. No API integration. |

---

## 10. Discussed But Not Confirmed

| Feature | Transcript Context | Why Not Confirmed |
|---|---|---|
| **Automated Google Drive ingestion** | Jon mentioned the possibility of plugging an agent into Google Drive to ingest existing 150 employee folders. | Jon explicitly said "don't hold me to that" and suggested manual migration might be simpler for 150 records. Not committed. |
| **Training log tracking** | Greg mentioned training logs as a state-inspected compliance item. | Jon explicitly set it aside: "I might put that to the side for now" since training logs are not part of the onboarding process. |
| **Unique per-caregiver upload links** | Greg mentioned wanting a unique link per caregiver so documents route to the right folder. | The onboarding form flow implicitly handles this (form submission creates the record, upload is linked). Whether standalone re-upload links are generated for returning caregivers was not confirmed. |
| **AI extraction vs. manual entry balance** | Discussion went back and forth on whether AI scanning is worth the cost. | Jon said he'd "check and see if there's an inexpensive, very low cost" option. The fallback (manual entry + staff verification) was confirmed; AI extraction is a best-effort stretch goal. |

---

## 11. Out of Scope (Future Phases)

| Feature | Phase | Transcript Reference |
|---|---|---|
| **Proactive compliance notifications (SMS/email)** | Phase 2 | Jon explicitly deferred: "We're not going to do the push notification stuff. We'll do that as kind of like a next thing." Described as a ~5-hour follow-on build. |
| **Automated outreach for expiring documents** | Phase 2 | Greg described wanting proactive outreach for expiration dates. Jon said this is "obviously where we're going" but deferred it. |
| **Compliance director email reports** | Phase 2 | Jon mentioned sending compliance reports to a compliance director as a phase 2 option. |
| **Lead enrichment / cold outreach tooling** | Future | Greg raised this as an interest. Jon said "it's a big motion, so I probably wouldn't want to start with that one." |
| **Scheduling SaaS product** | Separate project | Greg mentioned having a developer building a scheduling SaaS as a side project. Explicitly not part of this engagement. |
| **Applicant screening / texting automation** | Future | Greg mentioned he already has something partly working for texting the ~300 monthly applicants. Not in scope for this build. |
| **LinkedIn content generation** | Future | Jon mentioned as a possible future build. |
| **Training log management** | Future | State-mandated but not part of onboarding. May become a follow-on module. |

---

## 12. Confidence Score

| Dimension | Score | Rationale |
|---|---|---|
| **Scope Definition** | 4/5 | The core flow is well-defined: onboarding form, five document types with known fields, admin dashboard with lookup/filter. Minor ambiguity remains around exact onboarding form fields (waiting on Greg's paper packet), AI extraction cost/feasibility, and the precise boundary between "this phase" and "next phase" for some features. |
| **Technical Feasibility** | 4/5 | Standard CRUD web app with file uploads and a simple AI vision call. No exotic integrations. PII handling requires care but is well-understood. The only technical risk is document image quality variability for AI extraction, mitigated by the manual-entry fallback. 10-hour budget is tight but achievable if scope stays disciplined. |
| **Customer Impact** | 5/5 | Direct compliance risk mitigation for a California-regulated business. Replaces a scattered Google Drive + paper system with structured, queryable data. Greg can respond to state audits in minutes instead of digging through folders. Clear, immediate ROI. |
| **Overall** | **4/5** | Lowest dimension score. |

---

## 13. Audit Notes

- **Deliverable from Greg (before build starts)**: Copy of the current paper hiring packet / onboarding form so fields can be replicated digitally.
- **Deliverable from Greg**: Example documents for each of the five compliance document types (driver's license, TB test, background check registration, car insurance, Social Security card) to inform AI extraction prompt engineering and test cases.
- **PII sensitivity**: This system stores Social Security cards, medical records (TB tests), and driver's licenses. Security review of storage, access controls, and logging should be part of the build. Consider whether Polaris has any HIPAA or state-level data protection obligations that affect architecture.
- **Volume assumptions**: ~15-30 new hires/month for upload portal; ~150 existing employees for admin dashboard queries. These are low volumes -- performance is not a concern, but cost-per-API-call matters for model selection.
- **Google Drive migration**: Not automated. Polaris staff will manually re-upload ~150 existing employee files into the new system using the admin upload interface. Jon estimated this is a manageable manual effort ("drink two Red Bulls and you can be done on a weekend").
- **10-hour budget risk**: Stories 1-2 and 4-5 are the core. Story 3 (AI extraction) is the most likely to be trimmed if hours run tight. The manual-entry-with-verification approach is the confirmed baseline; AI extraction is additive.
- **No Twilio/SMS in this phase**: Jon explicitly deferred push notifications. No Twilio credentials needed for phase 1.
- **Caregiver ID scheme**: Greg confirmed 4-digit numeric IDs are fine and can be mapped to Viventium payroll IDs once the caregiver is hired. Auto-generation at form submission is the plan.
