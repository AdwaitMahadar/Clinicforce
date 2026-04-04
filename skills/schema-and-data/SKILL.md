---
name: schema-and-data
description: Context-routing skill for the database layer. You MUST use this skill whenever working on anything related to database queries, Drizzle ORM models, server actions that filter by clinicId, schema migrations, writing backend validation, or any code that touches the DB layer. This skill provides the layout of the database schema, multi-tenancy isolation rules, and critical data layer constraints.
---

# Schema and Data Skill

This skill provides critical context for interacting with the database layer in Clinicforce. Clinicforce is a multi-tenant SaaS application, which means that ensuring data isolation between tenants (clinics) is the absolute highest priority when writing database queries.

## 🚨 Multi-Tenancy Rules

Clinicforce uses a **Column-based isolation** strategy. Almost every table includes a `clinic_id` column to ensure data remains isolated between different clinics.

When writing database queries, Drizzle models, or server actions, you MUST follow these rules to prevent cross-tenant data leaks:

1. **Always filter by `clinic_id`**: Every single query (SELECT, UPDATE, DELETE) against a tenant-specific table MUST include a `where` clause filtering by `clinic_id`.
   *Why?* Failing to do this means a user at Clinic A could see or modify data belonging to Clinic B, which is a catastrophic security breach.
2. **Resolve `clinic_id` server-side**: The `clinic_id` must ALWAYS be resolved on the server (e.g., from the authenticated session). 
   *Why?* Clients cannot be trusted. If the client passes the `clinic_id`, a malicious user could simply change the `clinic_id` in the API payload to access another clinic's data.
3. **Never expose `clinic_id` to the client**: Do not pass the `clinic_id` in API responses unless absolutely necessary, and NEVER include it in URLs or client state.
4. **Use `chart_id` instead of UUIDs in URLs and UI**: Never show raw UUIDs (like `patient.id`) to users. Use the user-friendly `chart_id`. Note that `chart_id` is only unique *per clinic*, not globally. In the UI, **display** integers with `#PT-` (patients) / `#STF-` (staff) via `lib/utils/chart-id.ts` — the DB column stays a plain integer.

## Schema Summary

This is a distilled summary of the Drizzle ORM PostgreSQL schema. For full details, always refer to `docs/03-Database-Schema.md`.

### Shared / System Tables
- **`clinics`**: The tenant record. Provides the boundary.
  - Key fields: `id` (uuid), `subdomain` (unique), `name`
  - Local/staging provisioning: `scripts/seed.ts` (`pnpm db:seed` / `pnpm tsx scripts/seed.ts` — see `docs/10-Environments-and-Dev-Workflow.md`)

### Better-Auth Auth Tables
*(Extended with `clinic_id`)*
- **`users`**: RBAC accounts. Types: `'admin'`, `'doctor'`, `'staff'`.
  - Keys: `id` (text), `clinic_id`
  - Unique index: `(clinic_id, email)`, `(clinic_id, chart_id)`
- **`sessions`**, **`accounts`**, **`verifications`**: Standard Better-auth tables.

### Business Tables 
*(Every business table has `id` (uuid) and `clinic_id` (uuid))*

- **`patients`**:
  - Key fields: `first_name`, `last_name`, `chart_id` (integer)
  - Relationships: Foreign key to `users` (`created_by`)
  - Unique index: `(clinic_id, chart_id)`
  - Performance index: B-Tree on `(clinic_id, last_name, first_name)`
- **`appointments`**:
  - Key fields: `patient_id`, `doctor_id` (refs users), `title`, `status` (enum), `scheduled_at` (scheduled start — one timestamp), `duration`, optional `actual_check_in`
  - Status enum: `'scheduled'`, `'completed'`, `'cancelled'`, `'no-show'`
  - Performance index: B-Tree on `(clinic_id, scheduled_at)`, `(clinic_id, status)`
- **`documents`**:
  - Key fields: `type` (enum), `assigned_to_id`, `assigned_to_type` ('patient' or 'user'), `appointment_id` (optional), `file_key` (Minio/S3)
  - Performance index: B-Tree on `(assigned_to_id, assigned_to_type)`
- **`medicines`**:
  - Key fields: `name`, `category`, `brand`, `form`
  - Notes: Reference library only.

## Shared enums (`lib/constants/`)

PostgreSQL `pgEnum` definitions in `lib/db/schema/` pull value arrays from `lib/constants/` (same lists as Zod `z.enum()`). **Do not** redefine the same enum literals in schema, validators, and `types/` separately.

## DB Query Return Types

Types exported from `lib/db/queries/` that represent raw DB row shapes are prefixed with **`Db`** to avoid collision with the UI view-model types in `types/`:

- `DbPatientRow` (`lib/db/queries/patients.ts`) — chartId is `number`, dates are `Date | null`. Distinct from `PatientRow` in `types/patient.ts` (chartId formatted string, display strings).
- `DbMedicineRow` (`lib/db/queries/medicines.ts`) — lastPrescribedDate is `Date | null`, isActive is `boolean`. Distinct from `MedicineRow` in `types/medicine.ts` (lastUsed string, status string).
- Never import DB query types (`Db*`) in client components or UI code — they are server-only.

## Zod Validation

Create/Update server actions validate payloads with Zod schemas in `lib/validators/` (see `skills/api-and-validation/SKILL.md`). Enum fields use `z.enum()` with imports from `lib/constants/`. Do not define validation schemas inline in components or actions.

## ❌ DO NOT

- **Do not** query the database without filtering by `clinic_id`.
- **Do not** trust the client to provide the `clinic_id`. Always get it from the session server-side.
- **Do not** expose raw table UUIDs (like patient/appointment ID) in the UI or URLs; show `chart_id` only.
- **Do not** define Zod schemas inline in components or actions. Use the shared schemas in `lib/validators/`.
- **Do not** implement data filtering, sorting, or pagination on the client. It must always be done server-side using URL search params (via `nuqs`).

## References
When you need full details about specific columns, enums, database architecture, or related rules, check these files:
- `docs/03-Database-Schema.md` - Complete table definitions, indexes, and constraints.
- `docs/08-Business-Rules.md` - Deeper validation rules.
- `CLAUDE.md` - Complete project context and constraints.
