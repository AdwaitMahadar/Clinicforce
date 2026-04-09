# 04 — API Specification

Server actions and route handlers: session-scoped `clinicId`, RBAC via `requireRole`, Zod validation from `lib/validators/`. Full error-handling pattern: `docs/09` / `skills/api-and-validation/SKILL.md`.

## Auth Validators (`lib/validators/auth.ts`)

`loginSchema` and `LoginFormValues` live in `lib/validators/auth.ts`. The login client module imports from there — it does not define inline schemas.

## Public route handlers (no session)

| Handler | Contract |
|--------|----------|
| `GET /api/clinic?subdomain=` | Query param `subdomain` required. Resolves an **active** clinic row (`getActiveClinicBySubdomain`). **200:** `{ clinicId, name }`. **400** if `subdomain` missing. **404** if unknown or inactive. No auth — for tooling or external clients; the login page resolves branding server-side instead of calling this. |

## React Hook Form + Zod (client)

When using `zodResolver(schema)` with fields that use Zod `.default()` (e.g. `rememberMe: z.boolean().default(false)`):

1. **Do not** set `defaultValues` in `useForm` for those keys — the schema already supplies the default.
2. **Do not** combine `useForm<z.infer<typeof schema>>()` with that pattern unless you also align input vs output types (e.g. `z.input`). Prefer **`useForm({ resolver: zodResolver(schema) })` without an explicit generic** so `react-hook-form` infers from the resolver, and keep a separate `z.infer<typeof schema>` alias for the submit handler (see `app/(auth)/login/login-page-client.tsx`).

Duplicating defaults in `useForm` or forcing `z.infer` as the form generic while the resolver’s input type still treats optional keys can produce a TypeScript mismatch (`boolean | undefined` vs `boolean`).

## String IDs in Zod

- **Postgres UUIDs** (e.g. `patientId`, appointment `id`): validate with `z.string().uuid()` where the value is always a UUID.
- **Better-Auth user ids** (e.g. appointment `doctorId`): validate with `z.string().min(1)` only — Better-Auth `user.id` is not guaranteed to be UUID-shaped.
- **Document `assignedToId`:** validate with `z.string().min(1)` — it is a patient row UUID when `assignedToType` is `patient`, or a Better-Auth user id when `assignedToType` is `user` (see `lib/validators/document.ts`).

## Documents (S3 presigned flow)

| Action | Purpose |
|--------|---------|
| `getUploadPresignedUrl` | Validates file meta; returns `{ uploadUrl, fileKey }` — no DB write. Object key: `{subdomain}/docs/patients|users/{id}/…` from `session.user.clinicSubdomain` and `assignedToType` / `assignedToId` (`lib/storage/document-object-key.ts`). Schema: `getUploadPresignedUrlSchema` in `lib/validators/document.ts`. |
| `confirmDocumentUpload` | After client PUT to storage; validates `assignedToType` (`"patient" \| "user"`) and `assignedToId` from input; verifies `assignedToId` belongs to the session `clinicId` before insert (clinic-boundary check). Inserts `documents` row using the client-supplied `assignedToType`. Calls `revalidatePath` for patient and (if set) appointment detail routes. Schema: `confirmDocumentUploadSchema`. |
| `getViewPresignedUrl` | Returns `{ url }` presigned GET for opening in a new tab. |
| `deleteDocument` | Deletes S3 object then DB row (doctor/admin only). |

See `docs/09-File-Upload-Flow.md` for the browser sequence and Minio env vars.

## Global search

| Action | Purpose |
|--------|---------|
| `searchGlobal` | Accepts a trimmed query string (min 2 characters). Runs four parallel scoped reads (`LIMIT 5` each): patients (name/email/phone/chart id match; each hit includes `phone` for UI), active appointments (title / patient / doctor name; each hit includes `category`, `visitType`, nullable `title` for `formatAppointmentHeading` in UI), active medicines (name / brand match; each hit includes `category` and `brand` for UI), documents (title / file name / description; includes `mimeType` for list icons) with optional patient join for display name. Returns `GroupedSearchResults` (`types/search.ts`). Schema: `searchGlobalQuerySchema` in `lib/validators/search.ts`. Client: `UniversalSearch` in `components/common/UniversalSearch.tsx` (TopNav, ⌘/Ctrl+K). |

## Appointments (`lib/actions/appointments.ts`)

Create/update payloads use **`scheduledDate`** (`YYYY-MM-DD`) and **`scheduledTime`** (`HH:mm`). **Create** requires both; **`updateAppointment`** may send either field to recompute `scheduled_at`. Server actions merge them into **`scheduled_at`** using a full `YYYY-MM-DDTHH:mm:ss` string before `new Date()` — never parse a bare time string alone. Payloads use **`category`** and **`visitType`** (camelCase; DB column `visit_type`) from `lib/constants/appointment.ts`. **`title`** is optional (nullable in DB). **`fee`** is optional (`numeric(10,2)` nullable); omitted or empty on create → `null`; on update, empty string / explicit clear → `null`. **`actualCheckIn`** in the payload is **time-only**; the action combines it with the server’s current calendar day (`new Date()`) when setting `actual_check_in`. Schemas: `createAppointmentSchema` / `updateAppointmentSchema` in `lib/validators/appointment.ts`.

`updateAppointment` does **not** update `patientId`. If the client sends `patientId` and it differs from the stored row, the action returns an error. The UI omits `patientId` on update and keeps the patient select disabled in edit mode.

After a successful **`createAppointment`**, **`updateAppointment`**, or **`deleteAppointment`** (soft cancel), the action calls **`revalidatePath("/appointments/dashboard")`** so the appointments calendar server cache matches the database. Detail/create UIs also call **`router.refresh()`** after mutations (aligned with the patients detail panel) so the calendar updates without a full page reload.

**Picker helpers:** `getActiveDoctors()` — `lib/actions/appointments.ts` (appointment form doctor `<Select />`). **`searchPatientsForPicker({ query })`** — `lib/actions/patients.ts`: returns up to **8** active patients; search matches the same columns as directory `getPatients` (name, email, phone, chart id); empty `query` returns the first 8 active patients by name. Used by the appointment **patient** combobox (`AsyncSearchCombobox` + `AppointmentPatientCombobox`). **`getActivePatients()`** remains in `lib/actions/patients.ts` for other bulk-picker needs but is **not** used to preload the appointment form. RBAC: `requireRole(session, ["admin", "doctor", "staff"])` on these actions.

## Patients (`lib/actions/patients.ts`)

**`getPatients`** (via `lib/db/queries/patients.ts`): each list row includes **`status: "active" | "inactive"`** derived from `patients.is_active`. The list payload does **not** include `isActive`; dashboard and other consumers must map **`row.status`** into UI types (`types/patient.ts` `PatientRow`). **`lastVisit`** / **`assignedDoctor`** are derived only from **completed** appointments with **`scheduled_at < now()`** (DB time) and `is_active` on the appointment row — see `docs/08-Business-Rules.md` (Patient Rules — patients directory “Last visit”). **`getPatientDetail`** / `getPatientById` still expose `isActive` on the full detail aggregate. Full column contract: `docs/07-Page-Specifications.md` (Patients dashboard).

**Sensitive narrative fields (RBAC):** For **staff**, `getPatientDetail` returns `pastHistoryNotes: null`; `getAppointmentDetail` and list **`getAppointments`** return `notes: null`; **`createPatient`** / **`updatePatient`** do not persist `past_history_notes` from staff; **`createAppointment`** / **`updateAppointment`** do not persist `notes` from staff (and updates from staff omit `notes` even if tampered). Admin and doctor receive full values.

**Appointment title (RBAC):** For **staff**, **`createAppointment`** always persists `title` as null (ignores any client-supplied title). **`updateAppointment`** removes `title` from the parsed payload for staff so existing titles are not updated or cleared via the API. **Read redaction (DB unchanged):** for **staff**, `getAppointmentDetail`, **`getAppointments`**, **`getPatientDetail`** (each nested appointment row’s `title`), **`searchGlobal`** (appointment hits), and **`getRecentAppointments`** return `title: null`. Admin and doctor receive stored titles.

**`getAppointmentDetail` aggregate:** In addition to the appointment row, the action returns **`patientDocuments`** (same shape as `getPatientDetail` documents — `getDocumentsByAssignment` for the appointment’s patient) and **`patientAppointments`** (same summary shape as `getPatientDetail` appointments — `getPatientAppointmentSummaries`; nested `title` staff-redacted like `getPatientDetail`). DB query layer: `getAppointmentById` in `lib/db/queries/appointments.ts` composes `getDocumentsByAssignment` + `getPatientAppointmentSummaries` from `lib/db/queries/patients.ts` / `documents.ts`.

**`PatientRow.chartId`** is a **`number`** (raw integer from DB). The table display layer (`PatientsTable`) is responsible for calling `formatPatientChartId` — the dashboard page must not pre-format it to a string before passing to the row shape.
