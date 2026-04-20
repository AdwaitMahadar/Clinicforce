# 08 — Business Rules

This document defines the logic, constraints, and behavioural rules that govern how Clinicforce operates. These rules apply at the server layer and must be enforced in server actions regardless of what the UI does.

---

## 1. ChartId Generation

ChartIds are the human-facing identifiers shown in the UI. They are never sequential — randomness is intentional to prevent staff or patients from inferring clinic size or record count.

### Ranges
| Entity | Range | Digits | Display Format |
|---|---|---|---|
| Users (staff) | 100 – 999 | 3 | `#STF-` prefix e.g. `#STF-472` |
| Patients | 10000 – 99999 | 5 | `#PT-` prefix e.g. `#PT-38291` |
| Prescriptions (Rx #) | 10000 – 99999 | 5 | `#RX-` prefix e.g. `#RX-1042` — same random-generation pattern as patients; unique per clinic |

### Generation Algorithm
1. Generate a random integer within the entity's range.
2. Check if that number is already assigned to another record with the same `clinicId`.
3. If taken, generate a new random number and repeat.
4. If 10 consecutive attempts all collide (extremely unlikely), throw a server error and log it.
5. Assign the number on record creation only — ChartIds are immutable after assignment.

### Rules
- ChartIds are **unique per clinic**, not globally. Two different clinics can have a patient with `#PT-38291`.
- ChartIds are **never reused**. If a patient is deactivated or deleted, their ChartId is permanently retired for that clinic.
- ChartIds are **immutable** — they cannot be changed after creation under any circumstance.
- The internal UUID remains the true primary key for all database relations. ChartId is display-only.

---

## 2. User Rules

### Creation
- A user can only be created by an **Admin**.
- Email must be unique within a clinic. The same email can exist across different clinics.
- A user must be assigned one of three roles: `admin`, `doctor`, or `staff`. There is no default role — it must be explicitly set on creation.
- A ChartId in the `100–999` range is assigned on creation using the algorithm above.

### Deactivation
- Users are never hard-deleted. Set `isActive = false`.
- A deactivated user cannot log in.
- A deactivated user's historical records (appointments they created, documents they uploaded) remain intact and visible.
- A deactivated user cannot be assigned as the doctor on new appointments.
- Only an Admin can deactivate a user. An Admin cannot deactivate themselves.

### Role Changes
- Only an Admin can change a user's role.
- An Admin cannot change their own role.

---

## 3. Patient Rules

### Creation
- Any role (Admin, Doctor, Staff) can create a patient.
- A patient must have a non-empty `phone`. `email` is optional.
- On create and edit, the patient must have **either** a `date_of_birth` **or** an age entered in the UI; if only age is provided, the server stores `date_of_birth` as **January 1** of `(current calendar year − age)`. Only `date_of_birth` is persisted (no `age` column).
- A ChartId in the `10000–99999` range is assigned on creation using the algorithm above.
- `createdBy` is set to the authenticated user's ID at creation and is immutable.

### Deactivation
- Patients are never hard-deleted. Set `isActive = false`.
- Any role (Admin, Doctor, Staff) can deactivate a patient (`deactivatePatient`) and reactivate via **`updatePatient`** with **`isActive: true`** (confirmed in UI when saving an inactive record).
- A deactivated patient **cannot** have new appointments scheduled for them. Any attempt to create an appointment for an inactive patient must be rejected at the server layer.
- A deactivated patient's existing records (past appointments, documents) remain fully visible to roles with access; **staff** cannot view or upload documents regardless of patient status (see Document Rules).
- A deactivated patient can be reactivated by any role that can edit patients.

### Editing
- All roles can edit patient fields.

### Patients directory (“Last visit” column)
- The patients list **`lastVisit`** value is the latest `scheduled_at` among **active** appointments for that patient where **`status` is `completed`** and **`scheduled_at` is strictly before** the database’s current timestamp (`now()`). Future-dated completed rows, scheduled/cancelled/no-show rows, and inactive appointment rows are excluded. **`assignedDoctor`**, **`lastVisitCategory`** (`appointment_category` on that row), and **`lastVisitDoctorId`** (`doctor_id` on that row) on the same list payload come from that qualifying appointment (null when there is none).

---

## 4. Appointment Rules

### Creation
- Any role can create an appointment.
- An appointment requires: `patientId`, `doctorId`, `category`, `visitType`, scheduled date + time (combined into `scheduled_at` on the server), and `duration`. `title` is optional in the data model; only **admin** and **doctor** see the Title field on the create/edit form and may set or change it. **Staff** never get `title` applied on create (stored as null) and cannot mutate `title` on update (server strips the field). For **staff**, read APIs that return appointment data (`getAppointmentDetail`, `getAppointments`, nested appointments on `getPatientDetail`, `searchGlobal`, `getRecentAppointments`) respond with **`title: null`** while leaving the stored value unchanged.
- Optional **`fee`**: `numeric(10, 2)` nullable on `appointments`. **Admin and doctor** may set or clear it in the UI in all create/edit cases. **Staff** UI: no fee field on **create**; on **edit**, the fee field (and header fee line) appear only when **`status === 'completed'`**, and the field is non-editable via **`readOnly`** in **`DetailForm`** (normal styling, not disabled/muted — display-only constraint; server still accepts fee updates from admin/doctor). Empty input stores `null`. Validated server-side as a non-negative number (max aligns with precision). Display uses a **UI-only** ₹ (INR) prefix — the column is not a native Postgres currency type.
- The `doctorId` must reference an active user with the role `doctor`. You cannot assign an inactive doctor or a non-doctor user to an appointment.
- You cannot create an appointment for an inactive patient.
- Duration must be between **15 and 480 minutes** (8 hours maximum).
- Default status on creation is `scheduled`.
- `createdBy` is set to the authenticated user's ID at creation and is immutable.

### Follow-up window (shared constant)
- **`FOLLOW_UP_WINDOW_DAYS`** is **`60`**, exported from **`lib/constants/appointment.ts`**. It defines the calendar-day window used for **follow-up-oriented** appointment create behaviour (e.g. form prefill from a recent completed visit). Implementations must import the constant rather than hard-code the value.

### Status Transitions
Currently, all appointment status transitions are permitted freely. Any status can be changed to any other status without restriction.

Valid statuses: `scheduled` | `completed` | `cancelled` | `no-show` (see `lib/constants/appointment.ts` — single source with DB + Zod)

Future versions may enforce transition logic (e.g. preventing a `completed` appointment from returning to `scheduled`).

### Editing
- All roles can edit appointments.
- The `patientId` field is immutable after creation — the patient cannot be reassigned. The appointment detail form disables the patient control in edit mode; `updateAppointment` rejects any payload that attempts to change `patientId`.
- The `createdBy` field and `clinicId` field are immutable after creation.

### Deletion (Soft)
- Appointments are never hard-deleted. Set `isActive = false`.
- All roles can deactivate an appointment.
- Inactive appointments are hidden from all default views and calendar displays.
- **`deleteAppointment`** runs in one transaction: deactivating the appointment **also** deactivates the linked **`prescriptions`** row (if any) and **all** of its **`prescription_items`** (`is_active = false`). There is no hard-delete path for appointments in app code.
- Documents linked to an inactive appointment via `appointmentId` remain accessible through the patient's document list.

### Actual time
- `actual_check_in` is an optional timestamp for when the patient was seen. The UI collects **time only**; server actions combine it with the **server’s current calendar day** (`new Date()` — no per-clinic timezone handling yet).
- No validation is enforced between scheduled time and actual time beyond business rules above.

---

## 5. Document Rules

### Creation
- Only **Admin** and **Doctor** can upload (create) or view documents via server actions (`getUploadPresignedUrl`, `confirmDocumentUpload`, `getViewPresignedUrl`). **Staff** receive empty `documents` / `patientDocuments` on patient and appointment detail reads and no document hits from global search; they cannot open or upload files through the API. Only Admin and Doctor can delete documents.
- Every document must have an `assignedToId` and `assignedToType` (`patient` or `user`). A document must always belong to someone.
- **Clinic-boundary enforcement:** `confirmDocumentUpload` verifies that `assignedToId` belongs to the session's `clinicId` before inserting the DB record. For `assignedToType: "patient"` this queries the `patients` table; for `"user"` it queries the `users` table. A mismatch returns an error and prevents cross-clinic attachment.
- `appointmentId` is optional. It links an upload to a specific visit in metadata; the appointment detail UI still lists every document assigned to that patient (`assigned_to_type = 'patient'`). There is no behavioural restriction based on `appointmentId` beyond audit/context.
- `uploadedBy` is set to the authenticated user's ID at creation and is immutable.

### File Rules
- Accepted mime types: `application/pdf`, `image/jpeg`, `image/png`, `image/webp`.
- Maximum file size: **10MB** per file.
- Files are stored in S3/Minio. The database stores only the `fileKey`, `fileName`, `fileSize`, and `mimeType` — never the raw file or a permanent URL.
- Presigned URLs are generated on demand (when a user requests to view a document) and are valid for **60 minutes**. They are never stored in the database.

### Deletion
- Documents are hard-deleted — both the database record and the S3 object must be removed together.
- If the S3 deletion fails, the database record must not be deleted either. Treat as a transaction: both succeed or neither does.
- Only Admin and Doctor can delete documents.

---

## 6. Prescription Rules (structured in-app Rx)

Structured prescriptions are **not** uploaded files — they are rows in **`prescriptions`** and **`prescription_items`**, edited on the appointment detail **Prescriptions** tab and listed (published only) on the patient detail **Prescriptions** tab. **PDF or printable output is out of scope** (future); publish persists data only.

### Access
- Only **Admin** and **Doctor** may read or mutate prescriptions (`requireRole(session, ["admin", "doctor"])` in `lib/actions/prescriptions.ts`). **Staff** receive no prescription data on reads that would otherwise include it (`getPatientDetail.prescriptions: []`) and have no UI entry points (`viewPrescriptions` / `createPrescription`).

### Scope and creation
- **At most one prescription per appointment** (`prescriptions.appointment_id` unique). The row is **lazy-created** when the first line item is added — there are no empty prescription rows in the database.
- Line items reference **`medicines`** only — no free-text medicine names. The picker searches the clinic’s active medicine catalog (`searchMedicinesForPicker`).
- **`doctor_id`** and **`patient_id`** on the prescription come from the appointment at creation time — not from unvalidated client overrides.

### Draft vs published
- **`published_at`** on **`prescriptions`**: **`null`** = draft (line items, notes, reorder, and medicine changes allowed); **non-null** = published — **all mutating actions reject** (publish is one-way; there is no unpublish).
- **`medicine_name`** on **`prescription_items`** is **`null`** while draft; **`publishPrescription`** copies the current catalog name into **`medicine_name`** for every active line so labels stay stable if the medicine is renamed later.
- **`medicines.last_prescribed_date`** is updated **only** when a prescription is **published** (per distinct `medicine_id` on that publish), not when items are added in draft.

### Soft deletes (no hard delete)
- Removing a line or clearing all medicines sets **`prescription_items.is_active = false`** — the UI behaves like delete; inactive lines are never returned to the client.
- A **prescription header row is never hard-deleted** by users; it remains for the lifetime of the appointment (or is deactivated with the appointment — see Appointment **Deletion (Soft)**).
- Server reads that power the UI filter **`is_active = true`** for prescriptions and items unless documented otherwise.

### Patient history list
- **`getPrescriptionsByPatient`** returns **published** prescriptions only (`published_at IS NOT NULL`, active prescription row). **Drafts** exist only on the appointment until published — they do **not** appear on the patient list.

---

## 7. Medicine Rules

### Access
- **Admin** and **Doctor** can list, create, edit, and deactivate medicines (`requireRole(session, ["admin", "doctor"])` in `lib/actions/medicines.ts`; UI: `viewMedicines` et al. in `lib/permissions.ts`).
- **Staff** has **no** medicines module access (top nav hidden, routes redirect, actions return forbidden).

### Creation
- Medicine names are **not required to be unique** — the same drug can exist multiple times with different details (e.g. different brand, different form).
- The medicine's `id` (UUID) is unique within the clinic. The `name` field has no uniqueness constraint.

### `lastPrescribedDate`
- **Publish path:** When a structured prescription is **published**, `publishPrescription` sets **`last_prescribed_date`** to the current time for each **distinct** `medicine_id` on that prescription’s active lines (see **Prescription Rules**).
- **Catalog edits:** **Admin** and **doctor** may still adjust this field manually when maintaining the medicine row.
- Nullable — a medicine with no date has not been published against (and may never have been manually set).

### Deactivation
- Medicines are soft-deleted via `isActive = false`.
- Inactive medicines are hidden from the default medicine list and from any medicine pickers in forms.
- **Admin** and **Doctor** can deactivate a medicine.

---

## 8. Multi-Tenancy Rules

These rules apply to every single database operation in the system without exception.

- Every query that reads, creates, updates, or deletes data must filter by `clinicId`.
- The `clinicId` is always sourced from the authenticated session — it is never accepted as input from the client.
- Cross-clinic data access is impossible by design. If a query ever returns data without a `clinicId` filter, it is a critical bug.
- New records always inherit the `clinicId` from the session, never from the request body.

---

## 9. RBAC Enforcement Rules

The following matrix defines what each role can do at the server layer. UI hiding mirrors this but is not a substitute for it.

| Action | Staff | Doctor | Admin |
|---|---|---|---|
| Create user | ✗ | ✗ | ✓ |
| Edit user | ✗ | ✗ | ✓ |
| Deactivate user | ✗ | ✗ | ✓ |
| View patients | ✓ | ✓ | ✓ |
| Create patient | ✓ | ✓ | ✓ |
| Edit patient | ✓ | ✓ | ✓ |
| Deactivate patient | ✗ | ✓ | ✓ |
| Create appointment | ✓ | ✓ | ✓ |
| Edit appointment | ✓ | ✓ | ✓ |
| Deactivate appointment | ✓ | ✓ | ✓ |
| View documents | ✗ | ✓ | ✓ |
| Upload document | ✗ | ✓ | ✓ |
| Delete document | ✗ | ✓ | ✓ |
| View / create structured prescriptions | ✗ | ✓ | ✓ |
| View medicines | ✗ | ✓ | ✓ |
| Add medicine | ✗ | ✓ | ✓ |
| Edit medicine | ✗ | ✓ | ✓ |
| Deactivate medicine | ✗ | ✓ | ✓ |

**Enforcement rule:** Every server action must call a role-check helper (`requireRole` in `lib/auth/rbac.ts`) at the top of the function before any database operation. On failure, actions return a forbidden result or throw per the action’s contract — never proceed without a check. Canonical named capabilities: `lib/permissions.ts`.

---

## 10. General Data Rules

- **No hard deletes** for Users, Patients, Appointments, and Medicines. Always use `isActive = false`.
- **Documents are the exception** — they are hard-deleted (both DB record and S3 object).
- **`createdBy` is always immutable** — it is set on creation from the session and can never be changed.
- **Timestamps** — `createdAt` is set once on creation. `updatedAt` is updated on every mutation. Both are set server-side, never trusted from the client.
- **Empty strings** — treat empty strings as `null` in all nullable fields. Never store an empty string where `null` is the correct value.
