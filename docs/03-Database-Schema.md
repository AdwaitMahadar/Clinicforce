# Database Schema - Clinicforce

This document defines the PostgreSQL schema used by Clinicforce. We use **Drizzle ORM** for schema definition and migrations.

### Enum source of truth

`pgEnum` value lists for **appointments** (`appointment_status`, `appointment_category`, `appointment_visit_type`) and **patients** (`gender`) are built from the same `as const` arrays in `lib/constants/` that power Zod `z.enum()` and TypeScript types. When adding or renaming an enum value, update the constant module first, then run migrations.

`pgEnum` values for **activity_log** (`activity_entity_type`, `activity_action`) are defined directly in `lib/db/schema/activity-log.ts` since they have no external constant counterpart.

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

### Performance Indexes
- `idx_patient_name`: B-Tree on `(clinic_id, last_name, first_name)`
- `idx_appointment_scheduled_at`: B-Tree on `(clinic_id, scheduled_at)`
- `idx_document_assignment`: B-Tree on `(assigned_to_id, assigned_to_type)`
- `idx_appointment_status`: B-Tree on `(clinic_id, status)`
- `idx_activity_log_subscribers`: GIN on `subscribers` — enables jsonb containment (`@>`) queries for cross-entity fan-out
- `idx_activity_log_clinic_time`: B-Tree on `(clinic_id, created_at)` — home dashboard feed
- `idx_activity_log_entity`: B-Tree on `(clinic_id, entity_type, entity_id)` — detail page queries

---

## 6. Zod validation integration
Create/update and API boundaries are validated with **Zod** schemas in **`lib/validators/`**, aligned with **`lib/constants/`** for enums shared with Drizzle `pgEnum`. The repo includes **`drizzle-zod`** for optional generated helpers, but **most validation is hand-written** next to server actions — do not assume every table has an auto-generated Zod schema; follow existing entity files as the pattern.
