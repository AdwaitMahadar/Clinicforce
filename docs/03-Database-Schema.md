# Database Schema - Clinicforce

This document defines the PostgreSQL schema used by Clinicforce. We use **Drizzle ORM** for schema definition and migrations.

### Enum source of truth

`pgEnum` value lists for **appointments** (`appointment_status`, `appointment_type`) and **patients** (`gender`) are built from the same `as const` arrays in `lib/constants/` that power Zod `z.enum()` and TypeScript types. When adding or renaming an enum value, update the constant module first, then run migrations.

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
- `notes`: `text`
- `is_active`: `boolean` (Default: `true`)
- `created_by`: `text` (References `users.id`)
- `created_at`: `timestamp`
- `updated_at`: `timestamp`

### `appointments`
- `id`: `uuid` (Primary Key)
- `clinic_id`: `uuid` (References `clinics.id`)
- `patient_id`: `uuid` **notNull** (References `patients.id`)
- `doctor_id`: `text` **notNull** (References `users.id`)
- `title`: `varchar(255)` **notNull**
- `description`: `text`
- `status`: `enum` ('scheduled', 'completed', 'cancelled', 'no-show') (Default: 'scheduled')
- `type`: `enum` ('general', 'follow-up', 'emergency') (Default: 'general')
- `date`: `timestamp` **notNull** (Scheduled start)
- `duration`: `integer` **notNull** (In minutes, Default: 30)
- `notes`: `text` (Clinical notes)
- `scheduled_start_time`: `timestamp`
- `scheduled_end_time`: `timestamp`
- `actual_check_in`: `timestamp`
- `actual_check_out`: `timestamp`
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

---

## 5. Indexes & Constraints

### Unique Constraints
- `users`: `(clinic_id, email)` - Emails must be unique within a clinic.
- `users`: `(clinic_id, chart_id)` - Chart IDs are unique per clinic.
- `patients`: `(clinic_id, chart_id)` - Chart IDs are unique per clinic.
- `clinics`: `(subdomain)` - Subdomains must be unique globally.

### Performance Indexes
- `idx_patient_name`: B-Tree on `(clinic_id, last_name, first_name)`
- `idx_appointment_date`: B-Tree on `(clinic_id, date)`
- `idx_document_assignment`: B-Tree on `(assigned_to_id, assigned_to_type)`
- `idx_appointment_status`: B-Tree on `(clinic_id, status)`

---

## 6. Zod Validation Integration
Every table above will have a corresponding Zod schema generated using `drizzle-zod`. 
*   **Insert Schemas**: Used for validation during Create/Update operations.
*   **Select Schemas**: Used for typing responses from the database.
