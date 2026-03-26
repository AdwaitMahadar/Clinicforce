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
- A patient must have at least one of: `email` or `phone`. Both being empty is not allowed.
- A ChartId in the `10000–99999` range is assigned on creation using the algorithm above.
- `createdBy` is set to the authenticated user's ID at creation and is immutable.

### Deactivation
- Patients are never hard-deleted. Set `isActive = false`.
- Only Admin and Doctor roles can deactivate a patient.
- A deactivated patient **cannot** have new appointments scheduled for them. Any attempt to create an appointment for an inactive patient must be rejected at the server layer.
- A deactivated patient's existing records (past appointments, documents) remain fully visible.
- A deactivated patient can be reactivated by an Admin or Doctor at any time.

### Editing
- All roles can edit patient fields.

---

## 4. Appointment Rules

### Creation
- Any role can create an appointment.
- An appointment requires: `patientId`, `doctorId`, scheduled date + time (combined into `scheduled_at` on the server), `type`, and `duration`.
- The `doctorId` must reference an active user with the role `doctor`. You cannot assign an inactive doctor or a non-doctor user to an appointment.
- You cannot create an appointment for an inactive patient.
- Duration must be between **15 and 480 minutes** (8 hours maximum).
- Default status on creation is `scheduled`.
- `createdBy` is set to the authenticated user's ID at creation and is immutable.

### Status Transitions
In the MVP, all status transitions are permitted freely. Any status can be changed to any other status without restriction.

Valid statuses: `scheduled` | `completed` | `cancelled` | `no-show` (see `lib/constants/appointment.ts` — single source with DB + Zod)

Future versions may enforce transition logic (e.g. preventing a `completed` appointment from returning to `scheduled`), but this is explicitly out of scope for MVP.

### Editing
- All roles can edit appointments.
- The `patientId` field is immutable after creation — the patient cannot be reassigned. The appointment detail form disables the patient control in edit mode; `updateAppointment` rejects any payload that attempts to change `patientId`.
- The `createdBy` field and `clinicId` field are immutable after creation.

### Deletion (Soft)
- Appointments are never hard-deleted. Set `isActive = false`.
- All roles can deactivate an appointment.
- Inactive appointments are hidden from all default views and calendar displays.
- Documents linked to an inactive appointment via `appointmentId` remain accessible through the patient's document list.

### Actual time
- `actual_check_in` is an optional timestamp for when the patient was seen. The UI collects **time only**; server actions combine it with the **server’s current calendar day** (`new Date()` — no clinic timezone handling in MVP).
- No validation is enforced between scheduled time and actual time in MVP.

---

## 5. Document Rules

### Creation
- All roles can upload (create) and view documents. Only Admin and Doctor can delete documents.
- Every document must have an `assignedToId` and `assignedToType` (`patient` or `user`). A document must always belong to someone.
- **Clinic-boundary enforcement:** `confirmDocumentUpload` verifies that `assignedToId` belongs to the session's `clinicId` before inserting the DB record. For `assignedToType: "patient"` this queries the `patients` table; for `"user"` it queries the `users` table. A mismatch returns an error and prevents cross-clinic attachment.
- `appointmentId` is optional. It is used to surface relevant documents when viewing an appointment's detail — there is no behavioural restriction based on it.
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

## 6. Medicine Rules

### Creation
- All roles can create, edit, and deactivate medicines.
- Medicine names are **not required to be unique** — the same drug can exist multiple times with different details (e.g. different brand, different form).
- The medicine's `id` (UUID) is unique within the clinic. The `name` field has no uniqueness constraint.

### `lastPrescribedDate`
- This field is **manually updated** in MVP — there is no automatic trigger.
- It can be updated by any role when recording that a medicine was prescribed.
- It is nullable — a medicine with no `lastPrescribedDate` has simply never been recorded as prescribed.

### Deactivation
- Medicines are soft-deleted via `isActive = false`.
- Inactive medicines are hidden from the default medicine list and from any medicine pickers in forms.
- All roles can deactivate a medicine.

---

## 7. Multi-Tenancy Rules

These rules apply to every single database operation in the system without exception.

- Every query that reads, creates, updates, or deletes data must filter by `clinicId`.
- The `clinicId` is always sourced from the authenticated session — it is never accepted as input from the client.
- Cross-clinic data access is impossible by design. If a query ever returns data without a `clinicId` filter, it is a critical bug.
- New records always inherit the `clinicId` from the session, never from the request body.

---

## 8. RBAC Enforcement Rules

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
| View documents | ✓ | ✓ | ✓ |
| Upload document | ✓ | ✓ | ✓ |
| Delete document | ✗ | ✓ | ✓ |
| View medicines | ✓ | ✓ | ✓ |
| Add medicine | ✓ | ✓ | ✓ |
| Edit medicine | ✓ | ✓ | ✓ |
| Deactivate medicine | ✓ | ✓ | ✓ |

**Enforcement rule:** Every server action must call a role-check helper at the top of the function before any database operation. If the role check fails, throw an `Unauthorized` error immediately.

---

## 9. General Data Rules

- **No hard deletes** for Users, Patients, Appointments, and Medicines. Always use `isActive = false`.
- **Documents are the exception** — they are hard-deleted (both DB record and S3 object).
- **`createdBy` is always immutable** — it is set on creation from the session and can never be changed.
- **Timestamps** — `createdAt` is set once on creation. `updatedAt` is updated on every mutation. Both are set server-side, never trusted from the client.
- **Empty strings** — treat empty strings as `null` in all nullable fields. Never store an empty string where `null` is the correct value.
