# Clinicforce Product Requirements Document (PRD)

## 1. Executive Summary
**Clinicforce** is a streamlined Clinic Management System (CMS) designed for small healthcare practices. It serves as a digital transition from paper-based systems, centralizing patient records, appointment tracking, and document management within a professional web application.

---

## 2. Project Scope & Product Stage
The **baseline product** is shipped: core clinic workflows (patients, appointments, documents, medicines library, staff auth, multi-tenant hosting) are in production use for small practices. Ongoing work is **feature growth, polish, and maintenance**, not greenfield MVP build.

The following **scope constraints** still apply (until explicitly changed):

*   **Internal access only**: The application is for clinic staff (Admin, Doctors, Staff). There is no patient-facing portal or self-service scheduling.
*   **Document management**: The system does **not** generate **PDFs** or printable reports server-side. It provides a centralized repository for **uploading and viewing** externally generated digital files. **Structured prescriptions** (medicine lines per visit, draft → publish) are recorded **in-app** and are separate from uploaded “prescription” **document** files.
*   **Manual scheduling**: Appointments are managed manually by staff; there is no automated booking logic or patient notifications yet.
*   **Medicine library**: Reference directory used by the structured prescription picker; `lastPrescribedDate` is updated when a prescription is **published** (and may still be edited manually in the catalog). See `docs/08-Business-Rules.md` §6–7.

---

## 3. Core Concepts & Business Logic

### 3.1 Identification System (ChartId)
**Staff users** and **patients** are assigned a numeric **ChartId** (see `docs/08-Business-Rules.md` for ranges and uniqueness rules): short, human-friendly IDs shown in the UI (e.g. `#STF-472`, `#PT-38291`).
*   ChartIds are **unique per clinic** for that entity type (not globally).
*   **Medicines** do not have a `chart_id` column; list and detail UIs use name/category and URLs use the row UUID like other entities without a display chart id.
*   Internal UUIDs remain the primary keys for relations; staff normally see chart ids, not raw UUIDs, for patients and colleagues.

### 3.2 Document Attachment
Documents (Prescriptions, Lab Reports, X-Rays, etc.) are highly flexible:
*   They can be attached directly to a **Patient** or a **User**.
*   They can optionally be linked to a specific **Appointment**.
*   Documents are stored via Secure Presigned URLs.

### 3.3 Appointment Lifecycle
Appointments track the complete lifecycle of a patient visit, including scheduled time versus actual check-in/out times for operational auditing.

---

## 4. User Roles & Permissions

RBAC is enforced in **server actions** (`requireRole` in `lib/auth/rbac.ts`) and reflected in the UI via **`lib/permissions.ts`** (`PERMISSIONS`, `hasPermission`, `usePermission`, `<RoleGate>`). The table below matches the **implemented** permission map.

| Capability | Staff | Doctor | Admin |
| :--- | :---: | :---: | :---: |
| **Manage users** (create/update/deactivate clinic users) | — | — | Yes |
| **Appointments** — view / create / edit | Yes | Yes | Yes |
| **Appointments** — delete (soft cancel) | Yes | Yes | Yes |
| **Patients** — view / create / edit | Yes | Yes | Yes |
| **Patients** — deactivate (“delete”) / reactivate | Yes | Yes | Yes |
| **Appointment clinical notes** (`appointments.notes`) and **patient past history** (`patients.past_history_notes`) | — | Yes | Yes |
| **Appointment title** (optional label on create/edit form; DB `appointments.title`) | — | Yes | Yes |
| **Detail right column + main-column Documents/Appointments tabs** (activity log / patient summary; Documents & Appointments in main column — `viewDetailSidebar`) | — | Yes | Yes |
| **Documents** — view / upload | — | Yes | Yes |
| **Documents** — edit metadata / delete | — | Yes | Yes |
| **Prescriptions** (structured Rx) — view / create-edit | — | Yes | Yes |
| **Medicines** — any access | — | Yes | Yes |

*Staff (receptionist) has **no** Medicines top-nav or routes: `viewMedicines` and related permissions are **admin + doctor** only. Staff also has **no** document view or upload: `viewDocuments` / `uploadDocument` and presigned document server actions are **admin + doctor** only. Staff has **no** structured prescriptions: `viewPrescriptions` / `createPrescription` and prescription server actions are **admin + doctor** only.*

---

## 5. Main Entities

### 5.1 Users
Authorized personnel who access the system.
*   **Core Fields**: Name, Email, Phone, Address, ChartId.
*   **Type**: Admin, Doctor, Staff.
*   **Metadata**: `isActive`, `createdAt`, `updatedAt`, `createdBy`.

### 5.2 Patients
Individual medical records for clinic clients.
*   **Medical Profile**: DOB, Gender, Blood Group, Allergies, Emergency Contact Info.
*   **Patient's Past History** (`past_history_notes`): General background or medical history narrative (admin/doctor only).
*   **Metadata**: `chartId`, `isActive`, `createdAt`, `updatedAt`, `createdBy`.

### 5.3 Appointments
Records of clinical consultations or procedures.
*   **Status**: Scheduled, Completed, Cancelled, No-show (see DB enum / `docs/08-Business-Rules.md`).
*   **Types**: General, Follow-up, Emergency.
*   **Tracking**: Doctor/Patient links, Date/Time, Duration, Actual Check-in/out times.
*   **Notes**: Post-appointment summary or clinical notes.

### 5.4 Documents
Digital file repository associated with clinical activities.
*   **Classifications**: Prescription, Lab-report, X-ray, Scan (CT/MRI), Identification, Insurance, Consent-form, Other.
*   **Relational Data**: Linked to a User/Patient (`AssignedToId`) and optionally an `AppointmentId`.
*   **Storage**: Metadata stored in `docObj` (filename, size, mimetype) with a secure `PresignedUrl`.

### 5.5 Medicines
A reference directory for pharmacological data.
*   **Details**: Name, Description, Brand, Form.
*   **Usage Tracking**: `lastPrescribedDate` — updated when a structured prescription is **published** (per medicine on that Rx); catalog rows may still be adjusted manually.
*   **Purpose**: Drives the structured prescription picker; **PDF/print output** from structured data remains roadmap (see **Future Roadmap**).

### 5.6 Structured prescriptions (in-app)
*   **Tied to** a single **appointment** (at most one prescription row per visit; lazy-created when the first line is added).
*   **Roles**: Admin and Doctor only (`viewPrescriptions` / `createPrescription`) — same access pattern as clinical documents.
*   **UI**: Appointment detail **Prescriptions** tab (draft/edit/publish); patient detail **Prescriptions** tab (published history only). Full rules: `docs/08-Business-Rules.md` §6.

---

## 6. Future Roadmap
*   **Prescription PDF / share**: Export structured prescription data to a printable or shareable document (the Medicine library and publish flow are designed to support this later).
*   **Patient Portal**: Limited access for patients to view their own uploaded records.
*   **Automated Notifications**: SMS/Email reminders for upcoming appointments.
*   **Advanced Analytics**: Clinic performance reports and patient demographic trends.
