---
name: business-rules
description: Context-routing skill for Clinicforce business rules. You MUST use this skill whenever you are implementing validation logic, Zod schemas, handling edge cases, setting up database field constraints, determining state transitions, or coding any business-specific rules that go beyond basic CRUD operations (e.g., patient deactivation rules, appointment check-ins, ChartId generation, or document attachment behaviors).
---

# Business Rules Skill

This skill provides the core behavioral logic and constraints for Clinicforce. It must be strictly followed when writing server actions, Zod schemas, or any backend data enforcement.

## 🗂️ Core Enums & Statuses

- **Canonical lists:** Appointment status/type and patient gender values are defined once in `lib/constants/` and reused by Zod and Drizzle — do not duplicate literals elsewhere.
- **User Roles:** `admin`, `doctor`, `staff`. (There is no default role; it must be explicitly set on creation).
- **Patient Status:** Evaluated purely by the `is_active` boolean field (maps to active or inactive).
- **Appointment Statuses:** `scheduled`, `completed`, `cancelled`, `no-show`. (Default on creation is `scheduled`. Any transition between statuses is currently permitted.)
- **Appointment category:** `general`, `orthopedic`, `physiotherapy`. **Visit type:** `general`, `first-visit`, `follow-up-visit`. **`title`** optional in DB; only admin/doctor see the form field — staff create stores null, staff update cannot mutate `title`. Heading format: `Category - Visit Type` or `Category - Visit Type (Title)` via `formatAppointmentHeading`.
- **Document Mime Types:** Accepted types are limited to `application/pdf`, `image/jpeg`, `image/png`, `image/webp`.
- **Document clinic-boundary:** `confirmDocumentUpload` must verify `assignedToId` belongs to the session `clinicId` before inserting. Query `patients` for `assignedToType: "patient"`, `users` for `"user"`.

## 📏 Field-Level Constraints

- **Patient contact / DOB:** `phone` is required; `email` optional. Create/update require **date of birth or age** in the UI; only `date_of_birth` is stored (age-only → Jan 1 of computed year). Enforce in `lib/validators/patient.ts` + server `resolveSaveDateOfBirth` in `lib/actions/patients.ts`.
- **Appointment Duration:** Must be between **15 and 480 minutes** (8 hours maximum).
- **Document Size:** Maximum file size is **10MB** per file.
- **Empty Strings:** Treat empty strings as `null` in all nullable database fields. Never store an empty string where `null` is the correct value.
- **Timestamps:** `createdAt` is explicitly set once on creation; `updatedAt` must be updated on every mutation. Both are set explicitly server-side.
- **Immutability:** The `createdBy` and `clinicId` fields are set ONLY at creation (sourced from the session) and can **never** be changed. ChartIds are immutable after initial generation. Appointment **`patientId`** is immutable after creation (`updateAppointment` never writes it; mismatched payload → error).

### ChartId Generation
- **Users (staff)**: Random 3-digit number (100–999). Display prefix: `#STF-`
- **Patients**: Random 5-digit number (10000–99999). Display prefix: `#PT-`
- **Rules**: Must be generated randomly (not sequentially). Must be unique *per clinic*. Are never reused, even if the user/patient is deactivated. Used purely for display—the true primary key for relations is always the UUID.

## ⚠️ Edge Cases & Special Rules (Commonly Overlooked!)

- **Inactive Patients:** You **cannot** schedule new appointments for an inactive patient. Any attempt must be rejected at the server layer.
- **Appointment Doctor Assignment:** The `doctorId` on an appointment MUST reference an *active* user whose role is exactly `'doctor'`. You cannot assign an inactive doctor or a non-doctor user.
- **Soft vs. Hard Deletes:**
  - Users, Patients, Appointments, and Medicines are **never** hard-deleted (`is_active = false`).
  - **Documents** are the exception: They are hard-deleted. If deleting the S3 object fails remotely, the database record must NOT be deleted. (Treat S3 and DB deletion as a unified transaction).
- **Actual time:** UI sends time-only; server stores full `actual_check_in` using the server calendar day (`new Date()` — no per-clinic TZ yet). Optional; end-of-visit implied by `duration` (no check-out column).
- **Uniqueness Limits:** Medicine names are **not uniquely constrained**. The exact same drug can exist multiple times. (This is intentional — clinics may stock multiple brands or formulations of the same drug.)

## ❌ DO NOT

- **Do not** hard-delete users, patients, appointments, or medicines.
- **Do not** allow the creation of an appointment for a deactivated patient.
- **Do not** allow an appointment to be assigned to a deactivated user, or a user who is not specifically a 'doctor'.
- **Do not** assign a default user role out of convenience.
- **Do not** accept `clinicId` via client input to skip checks; it MUST be resolved from the server session.
- **Do not** allow a patient to be created without a **phone** number or without **DOB or age** (see patient validator).
- **Do not** store empty strings in nullable database fields; coerce them to `null` on the server.

## 📚 References
For the full interaction matrices, detailed data generation algorithms, and context for these rules, refer exclusively back to the primary source:
- `docs/08-Business-Rules.md` - Primary source for behavioral rules and RBAC permissions.
- `CLAUDE.md` - Overall system context and rules.
