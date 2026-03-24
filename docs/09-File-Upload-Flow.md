# 09 — File Upload Flow

This document covers the document upload flow, presigned URL strategy, metadata persistence, and how documents are displayed on the patient and appointment detail pages.

---

## 1. Strategy Overview

- **Method:** Presigned URL — the file travels directly from the browser to Minio/S3, never through the Next.js server
- **Local storage:** Minio via Docker Compose
- **Production storage:** S3-compatible (drop-in replacement, no code changes)
- **SDK:** AWS SDK v3 (`@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`)
- **Metadata:** Stored in the `documents` table after a successful upload
- **Tenant slug on keys:** `session.user.clinicSubdomain` — loaded in `getSession()`; see `docs/05-Authentication.md` §4 for middleware vs session.

---

## 2. Upload Flow (Step by Step)

```
Browser                        Next.js Server                    Minio/S3
  |                                  |                               |
  |  1. Request presigned URL        |                               |
  |  (filename, mimetype, size)      |                               |
  | -------------------------------->|                               |
  |                                  |  2. Generate presigned PUT    |
  |                                  |     URL via AWS SDK v3        |
  |                                  | ----------------------------->|
  |                                  |  3. Returns presigned URL     |
  |                                  |<------------------------------|
  |  4. Returns { uploadUrl, fileKey}|                               |
  |<---------------------------------|                               |
  |                                  |                               |
  |  5. PUT file directly to Minio   |                               |
  | ------------------------------------------------->              |
  |  6. Minio returns 200 OK         |                               |
  |<-------------------------------------------------              |
  |                                  |                               |
  |  7. Save metadata to DB          |                               |
  |  (fileKey, title, type, etc.)    |                               |
  | -------------------------------->|                               |
  |                                  |  8. INSERT into documents     |
  |                                  |     table                     |
  |  9. Returns saved document       |                               |
  |<---------------------------------|                               |
```

---

## 3. Server Actions / API Routes

Two server-side operations are required:

### `getUploadPresignedUrl` (Server Action; same role as “generate upload URL” below)
- **Input:** `fileName`, `mimeType`, `fileSize`, `assignedToType`, `assignedToId`, optional `appointmentId`
- **What it does:**
  - Calls `getSession()` — auth + clinic context; includes `clinicSubdomain` for keys
  - Generates a unique `fileKey`: `{clinicSubdomain}/{assignedToType}/{assignedToId}/{uuid}-{sanitised-filename}` (see §7)
  - Uses AWS SDK v3 `PutObjectCommand` + `getSignedUrl` to generate a presigned PUT URL (expiry: 15 minutes)
  - Returns `{ uploadUrl, fileKey }`
- **Never** saves anything to the DB at this step

### `confirmDocumentUpload` (Server Action; same role as “save metadata” below)
- **Input:** `fileKey`, `fileName`, `fileSize`, `mimeType`, `title`, `description`, `type` (document type enum), `assignedToId` (patient row UUID in this flow; Zod: `z.string().min(1)` — not `.uuid()` — for consistency with polymorphic / Better-Auth id shapes), `appointmentId` (optional)
- **What it does:**
  - Calls `getSession()` — auth + clinicId check
  - Enforces RBAC — staff, doctor, and admin can all upload
  - Inserts into `documents` table with `assignedToType: 'patient'` always
  - Sets `appointmentId` only if provided (i.e. uploaded from appointment page)
  - Sets `uploadedBy` from `session.user.id`
  - Sets `clinicId` from `session.user.clinicId`

---

## 4. Upload Dialog

A single reusable `<UploadDocumentDialog />` component used in both contexts.

**Fields:**
- **File** — file picker, required. Accepted types: PDF, JPG, PNG, JPEG, WEBP. Max size: 10MB.
- **Document Type** — select from the `document_type` enum (`prescription`, `lab-report`, `x-ray`, `scan`, `identification`, `insurance`, `consent-form`, `other`). Required.
- **Title** — text input, optional. If left blank, defaults to the original filename.
- **Description** — textarea, optional.

**Props the dialog receives (injected by the parent, not selected by the user):**
- `patientId` — always required
- `appointmentId` — optional, only passed when opened from an appointment page

**Upload sequence inside the dialog:**
1. User fills the form and clicks Upload
2. Client calls `getUploadPresignedUrl` with file metadata
3. Client does a `fetch` PUT directly to the returned `uploadUrl` with the file as the body
4. On success, client calls `confirmDocumentUpload` with all fields + `fileKey`
5. Dialog closes, parent refreshes the document list

**Error handling:**
- If presigned URL generation fails — show a Sonner toast error, do not proceed
- If Minio PUT fails — show a Sonner toast error, do not call `saveDocumentMetadata`
- If metadata save fails — show a Sonner toast error, note that the file is in storage but untracked (acceptable for MVP)
- Show upload progress if possible (track via `XMLHttpRequest` or fetch with `ReadableStream`)

---

## 5. Document Display

### Document Card
Each document renders as a card showing:
- File type icon (PDF icon for `.pdf`, image icon for image types, generic file icon otherwise)
- Title (or filename if no title)
- File size (human-readable, e.g. `2.4 MB`)
- Relative upload date (e.g. `Today`, `Yesterday`, `3 days ago`)

Clicking a card opens a **presigned GET URL** in a new browser tab. The browser handles rendering (PDF viewer, image display) and the user can download from there.

### Generating the view URL
- On card click, call server action `getViewPresignedUrl(documentId)`
- Server action calls `getSession()`, verifies the document belongs to the clinic, generates a short-lived presigned GET URL (expiry: 5 minutes) via `GetObjectCommand` + `getSignedUrl`
- Returns the URL, client does `window.open(url, '_blank')`
- Never store or expose presigned GET URLs — always generate on demand

---

## 6. Context-Specific Behaviour

### From the Patient Detail Page
- "+" button opens `<UploadDocumentDialog />` with `patientId` set, `appointmentId` undefined
- Document list fetches all documents where `assigned_to_id = patientId`
- Shows all documents regardless of whether they have an `appointment_id`

### From the Appointment Detail Page
- "Upload" button opens `<UploadDocumentDialog />` with both `patientId` (from `appointment.patientId`) and `appointmentId` set
- Document list fetches only documents where `appointment_id = appointmentId`

---

## 7. File Key Convention

```
{clinicSubdomain}/{assignedToType}/{assignedToId}/{uuid}-{sanitised-filename}
```

- **`clinicSubdomain`** — from `session.user.clinicSubdomain` (`clinics.subdomain`), loaded in `getSession()` with the user row (not `clinicId` UUIDs in the path)
- **`assignedToType`** / **`assignedToId`** — match the `documents` table polymorphic assignment: `patient` + patient row UUID, or `user` + Better-Auth user id (text, not necessarily UUID). The presign request sends both so the key matches the eventual DB row.
- UUID prefix ensures no collisions even if the same filename is uploaded twice
- Sanitise the filename before use (strip special characters, replace spaces with hyphens); subdomain is normalised for safe path segments

---

## 8. Minio Local Configuration

Minio runs via Docker Compose. The following environment variables are required:

```env
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET_NAME=clinicforce
```

The S3 client should be initialised in `lib/storage/s3-client.ts` and reused across server actions. The bucket must exist in Minio before uploads work — create it via the Minio console at `http://localhost:9001` or via the AWS SDK on app startup.

---

## 9. Zod Validators

Implemented in `lib/validators/document.ts`:
- `getUploadPresignedUrlSchema` — presigned PUT step (includes `assignedToType` + `assignedToId` for the object key). `assignedToId` is `z.string().min(1)` (not `.uuid()`) because it may be a patient UUID or a Better-Auth user id.
- `confirmDocumentUploadSchema` — metadata insert (server always sets `assignedToType: 'patient'` for this flow). `assignedToId` uses the same non-empty string rule for consistency.
- `uploadDocumentDialogSchema` — React Hook Form + file refinements for `<UploadDocumentDialog />`

Document type enum values live in `lib/constants/` aligned with the `documents` table `pgEnum`.