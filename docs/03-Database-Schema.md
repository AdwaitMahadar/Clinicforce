# Database Schema - Clinicforce

This document defines the PostgreSQL schema used by Clinicforce. We use **Drizzle ORM** for schema definition and migrations.

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
- `first_name`: `text`
- `last_name`: `text`
- `email`: `text` (Unique)
- `email_verified`: `boolean`
- `image`: `text` (Nullable)
- `phone`: `text`
- `address`: `text`
- `chart_id`: `integer` (User-friendly ID, e.g., 101)
- `type`: `enum` ('admin', 'doctor', 'staff')
- `is_active`: `boolean` (Default: `true`)
- `created_at`: `timestamp`
- `updated_at`: `timestamp`

### `sessions`
- `id`: `text` (Primary Key)
- `user_id`: `text` (References `users.id`)
- `expires_at`: `timestamp`
- `ip_address`: `text`
- `user_agent`: `text`

### `accounts` / `verifications`
- (Standard Better-Auth implementation for OAuth/Login providers)

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
- `patient_id`: `uuid` (References `patients.id`)
- `doctor_id`: `text` (References `users.id`)
- `title`: `varchar(255)`
- `description`: `text`
- `status`: `enum` ('pending', 'completed', 'cancelled', 'no-show')
- `type`: `enum` ('general', 'follow-up', 'emergency')
- `date`: `timestamp` (Scheduled start)
- `duration`: `integer` (In minutes)
- `notes`: `text` (Clinical notes)
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
- `name`: `varchar(255)`
- `description`: `text`
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
