# Database Schema - Clinicforce

This document defines the PostgreSQL schema used by Clinicforce. We use **Drizzle ORM** for schema definition and migrations.

### Enum source of truth

`pgEnum` value lists for **appointments** (`appointment_status`, `appointment_category`, `appointment_visit_type`) and **patients** (`gender`) are built from the same `as const` arrays in `lib/constants/` that power Zod `z.enum()` and TypeScript types. When adding or renaming an enum value, update the constant module first, then run migrations.

`pgEnum` values for **activity_log** (`activity_entity_type`, `activity_action`) are defined directly in `lib/db/schema/activity-log.ts` since they have no external constant counterpart.

`pgEnum` **`meal_timing`** (`before_food`, `after_food`) is built from **`MEAL_TIMINGS`** in `lib/constants/prescription.ts` (same list as Zod `z.enum()`), declared in `lib/db/schema/prescriptions.ts` for prescription line-item dosage timing columns (shared with **`prescription_items`**).

## 1. SaaS & Multi-tenancy
We use a **Column-based isolation** strategy. Almost every table includes a `clinic_id` to ensure data remains isolated between different clinics in a SaaS environment.

---

## 2. Shared / System Tables

### `clinics`
The "Tenant" table representing a physical clinic.
- `id`: `uuid` (Primary Key)
- `name`: `varchar(255)`
- `subdomain`: `varchar(100)` (Unique - for SaaS routing)
- `license_number`: `varchar(100)`
- `address`: `text`
- `phone`: `varchar(20)`
- `email`: `varchar(255)`
- `is_active`: `boolean` (Default: `true`)
- `created_at`: `timestamp`
- `updated_at`: `timestamp`

---

## 3. Better-Auth Tables
These tables are managed by Better-Auth but extended to include `clinic_id` for SaaS isolation.

### `users`
- `id`: `text` (Primary Key)
- `clinic_id`: `uuid` (References `clinics.id`)
- `name`: `text` **notNull** (Better-Auth composite display name)
- `first_name`: `text`
- `last_name`: `text`
- `email`: `text` (Unique) **notNull**
- `email_verified`: `boolean` (Default: `false`)
- `image`: `text` (Nullable)
- `phone`: `text`
- `address`: `text`
- `chart_id`: `integer` (User-friendly ID, e.g., 101)
- `type`: `enum` ('admin', 'doctor', 'staff') (Default: 'staff')
- `is_active`: `boolean` (Default: `true`)
- `created_at`: `timestamp`
- `updated_at`: `timestamp`

### `sessions`
- `id`: `text` (Primary Key)
- `user_id`: `text` **notNull** (References `users.id`, cascade delete)
- `token`: `text` **notNull, Unique**
- `expires_at`: `timestamp` **notNull**
- `ip_address`: `text`
- `user_agent`: `text`
- `created_at`: `timestamp`
- `updated_at`: `timestamp`

### `accounts`
Better-Auth OAuth/credential accounts.
- `id`: `text` (Primary Key)
- `user_id`: `text` **notNull** (References `users.id`, cascade delete)
- `account_id`: `text` **notNull**
- `provider_id`: `text` **notNull**
- `access_token`: `text`
- `refresh_token`: `text`
- `access_token_expires_at`: `timestamp`
- `refresh_token_expires_at`: `timestamp`
- `scope`: `text`
- `id_token`: `text`
- `password`: `text`
- `created_at`: `timestamp`
- `updated_at`: `timestamp`

### `verifications`
Better-Auth email/token verification records.
- `id`: `text` (Primary Key)
- `identifier`: `text` **notNull**
- `value`: `text` **notNull**
- `expires_at`: `timestamp` **notNull**
- `created_at`: `timestamp`
- `updated_at`: `timestamp`

---

## 4. Business Tables

### `patients`
- `id`: `uuid` (Primary Key)
- `clinic_id`: `uuid` (References `clinics.id`)
- `first_name`: `varchar(100)`
- `last_name`: `varchar(100)`
- `email`: `varchar(255)`
- `phone`: `varchar(20)`
- `address`: `text`
- `chart_id`: `integer` (User-friendly ID, e.g., 5001)
- `date_of_birth`: `date`
- `gender`: `enum` ('male', 'female', 'other')
- `blood_group`: `varchar(10)`
- `emergency_contact_name`: `varchar(255)`
- `emergency_contact_phone`: `varchar(20)`
- `allergies`: `text`
- `past_history_notes`: `text` (patient past history; admin/doctor only in UI; staff payloads redacted)
- `is_active`: `boolean` (Default: `true`)
- `created_by`: `text` (References `users.id`)
- `created_at`: `timestamp`
- `updated_at`: `timestamp`

### `appointments`
- `id`: `uuid` (Primary Key)
- `clinic_id`: `uuid` (References `clinics.id`)
- `patient_id`: `uuid` **notNull** (References `patients.id`)
- `doctor_id`: `text` **notNull** (References `users.id`)
- `title`: `varchar(255)` (nullable — optional user label)
- `description`: `text`
- `status`: `enum` ('scheduled', 'completed', 'cancelled', 'no-show') (Default: 'scheduled')
- `category`: `enum` ('general', 'orthopedic', 'physiotherapy') **notNull** (no column default — required on insert)
- `visit_type`: `enum` ('general', 'first-visit', 'follow-up-visit') **notNull** (no column default — required on insert)
- `scheduled_at`: `timestamp` **notNull** (Scheduled start — date and time combined)
- `duration`: `integer` **notNull** (In minutes, Default: 15)
- `fee`: `numeric(10, 2)` (nullable — optional visit fee; UI treats values as INR with a display-only ₹ prefix)
- `notes`: `text` (Clinical notes)
- `actual_check_in`: `timestamp` (Optional; time-of-day from UI is stored with the server calendar day at save time)
- `is_active`: `boolean` (Default: `true`)
- `created_by`: `text` (References `users.id`)
- `created_at`: `timestamp`
- `updated_at`: `timestamp`

### `documents`
- `id`: `uuid` (Primary Key)
- `clinic_id`: `uuid` (References `clinics.id`)
- `title`: `varchar(255)`
- `description`: `text`
- `type`: `enum` ('prescription', 'lab-report', 'x-ray', 'scan', 'identification', 'insurance', 'consent-form', 'other')
- `assigned_to_id`: `text` (Can be Patient ID or User ID)
- `assigned_to_type`: `enum` ('patient', 'user')
- `appointment_id`: `uuid` (Optional, References `appointments.id`)
- `file_key`: `text` (Key for S3/Minio storage)
- `file_name`: `text`
- `file_size`: `integer`
- `mime_type`: `text`
- `uploaded_by`: `text` (References `users.id`)
- `created_at`: `timestamp`
- `updated_at`: `timestamp`

### `medicines`
- `id`: `uuid` (Primary Key)
- `clinic_id`: `uuid` (References `clinics.id`)
- `name`: `varchar(255)` **notNull**
- `description`: `text`
- `category`: `varchar(100)` (Antibiotics, Painkillers, etc.)
- `brand`: `varchar(255)`
- `form`: `varchar(100)` (Tablet, Syrup, etc.)
- `last_prescribed_date`: `timestamp` (Manually updated)
- `is_active`: `boolean` (Default: `true`)
- `created_by`: `text` (References `users.id`)
- `created_at`: `timestamp`
- `updated_at`: `timestamp`

### `prescriptions`
Structured prescription header: **at most one row per appointment** (lazy-created when the first line item is added). Tied to the appointment’s patient and prescribing doctor; **`chart_id`** is the clinic-scoped human-readable Rx number (e.g. 1042, displayed in UI as `#RX-…`). **`published_at`** is the draft vs published indicator: **`null`** means draft; a non-null timestamp means published. It has **no default** and is set **only** by the dedicated publish action (not on insert or ordinary edits). Behavioural rules (RBAC, soft-delete, **`deleteAppointment`** cascade): `docs/08-Business-Rules.md` §6.

- `id`: `uuid` (Primary Key)
- `clinic_id`: `uuid` **notNull** (References `clinics.id`)
- `appointment_id`: `uuid` **notNull** (References `appointments.id`, **cascade** on appointment delete)
- `patient_id`: `uuid` **notNull** (References `patients.id`)
- `doctor_id`: `text` **notNull** (References `users.id`)
- `chart_id`: `integer` **notNull** — unique per clinic (same uniqueness pattern as patient chart IDs)
- `notes`: `text` (nullable — overall prescription remarks)
- `published_at`: `timestamp` (nullable — no default; draft when null, published when set by publish action only)
- `is_active`: `boolean` (Default: `true`)
- `created_by`: `text` **notNull** (References `users.id`)
- `created_at`: `timestamp` **notNull**
- `updated_at`: `timestamp` **notNull**

### `prescription_items`
Line items for a prescription. **No `clinic_id`** — tenant scope is always via the parent **`prescriptions`** row. **`medicine_name`** is **nullable**: **`null`** while the parent prescription is still a **draft** (`prescriptions.published_at` is null); at **publish** time it is populated by denormalizing from **`medicines.name`** so historical labels stay stable if the medicine row is later renamed.

- `id`: `uuid` (Primary Key)
- `prescription_id`: `uuid` **notNull** (References `prescriptions.id`, **cascade** on prescription delete)
- `medicine_id`: `uuid` **notNull** (References `medicines.id`)
- `medicine_name`: `varchar(255)` (nullable — null in draft; set at publish from `medicines`)
- `morning_enabled`: `boolean` (Default: `false`)
- `morning_quantity`: `integer` (Default: `1`)
- `morning_timing`: `enum` (`before_food`, `after_food`) (Default: `before_food`)
- `afternoon_enabled`: `boolean` (Default: `false`)
- `afternoon_quantity`: `integer` (Default: `1`)
- `afternoon_timing`: `enum` (`before_food`, `after_food`) (Default: `before_food`)
- `night_enabled`: `boolean` (Default: `false`)
- `night_quantity`: `integer` (Default: `1`)
- `night_timing`: `enum` (`before_food`, `after_food`) (Default: `before_food`)
- `duration`: `varchar(255)` (nullable)
- `remarks`: `text` (nullable)
- `is_active`: `boolean` (Default: `true`) **notNull**
- `sort_order`: `integer` (Default: `0`)
- `created_at`: `timestamp` **notNull**
- `updated_at`: `timestamp` **notNull**

### `activity_log`
Immutable audit trail of all meaningful state changes (create, update, deactivate, reactivate, delete) across all main entities.

- `id`: `uuid` (Primary Key)
- `clinic_id`: `uuid` **notNull** (References `clinics.id`)
- `entity_type`: `enum` ('patient', 'appointment', 'medicine', 'document', 'user') **notNull**
- `entity_id`: `text` **notNull** — uuid or better-auth id of the primary affected record
- `action`: `enum` ('created', 'updated', 'deactivated', 'reactivated', 'deleted') **notNull**
- `actor_id`: `text` **notNull** (References `users.id`)
- `actor_name`: `text` **notNull** — denormalized display name captured at time of action
- `actor_role`: `text` **notNull** — denormalized role at time of action ('admin' | 'doctor' | 'staff')
- `metadata`: `jsonb` (nullable) — `{ entityDescriptor: string, changedFields?: Array<{ field, label, oldValue, newValue }> }`. `changedFields` only present on 'updated'/'reactivated'. Raw values always stored; sensitivity stripped at server read layer.
- `subscribers`: `jsonb` (nullable) — `Array<{ entityType: string, entityId: string }>`. Secondary entity references for cross-entity fan-out (e.g. a patient linked to a new appointment).
- `created_at`: `timestamp` **notNull** — no `updated_at`; rows are immutable.

---

## 5. Indexes & Constraints

### Unique Constraints
- `users`: `(clinic_id, email)` - Emails must be unique within a clinic.
- `users`: `(clinic_id, chart_id)` - Chart IDs are unique per clinic.
- `patients`: `(clinic_id, chart_id)` - Chart IDs are unique per clinic.
- `clinics`: `(subdomain)` - Subdomains must be unique globally.
- `prescriptions`: `(appointment_id)` — one prescription per appointment.
- `prescriptions`: `(clinic_id, chart_id)` — Rx numbers unique per clinic.
- `prescription_items`: `(prescription_id, medicine_id)` — a medicine cannot appear twice on the same prescription.

### Performance Indexes
- `idx_patient_name`: B-Tree on `(clinic_id, last_name, first_name)`
- `idx_appointment_scheduled_at`: B-Tree on `(clinic_id, scheduled_at)`
- `idx_document_assignment`: B-Tree on `(assigned_to_id, assigned_to_type)`
- `idx_appointment_status`: B-Tree on `(clinic_id, status)`
- `idx_prescription_clinic_patient`: B-Tree on `(clinic_id, patient_id)` — list prescriptions by patient within a clinic
- `idx_prescription_items_sort`: B-Tree on `(prescription_id, sort_order)` — ordered line items
- `idx_activity_log_subscribers`: GIN on `subscribers` — enables jsonb containment (`@>`) queries for cross-entity fan-out
- `idx_activity_log_clinic_time`: B-Tree on `(clinic_id, created_at)` — home dashboard feed
- `idx_activity_log_entity`: B-Tree on `(clinic_id, entity_type, entity_id)` — detail page queries

---

## 6. Zod validation integration
Create/update and API boundaries are validated with **Zod** schemas in **`lib/validators/`**, aligned with **`lib/constants/`** for enums shared with Drizzle `pgEnum`. The repo includes **`drizzle-zod`** for optional generated helpers, but **most validation is hand-written** next to server actions — do not assume every table has an auto-generated Zod schema; follow existing entity files as the pattern.
