# 07 — Page Specifications

This document defines the backend contract for every page in the authenticated app shell.
For each page it specifies: the URL, which server actions to write, what data goes in and out,
filtering/sorting/pagination requirements, and which RBAC rules apply.

Use `docs/03-Database-Schema.md` for field definitions, `docs/08-Business-Rules.md` for
validation rules, and `docs/04-API-Specification.md` (when written) for the action signatures.

---

## Navigation Matrix

```
Top nav (entity) × Side nav (view)  →  /{entity}/{view}

                 /dashboard       /reports
/home            Home Dashboard   Home Reports
/appointments    Appt Dashboard   Appt Reports
/patients        Patient List     Patient Reports
/medicines       Medicine List    Medicine Reports
```

Detail modals open at `/{entity}/view/{id}` (intercepting route) or fall back to full page.
New-record modals open at `/{entity}/new` (intercepting route) or fall back to full page.

**Loading UI:** Each route segment may define `loading.tsx` next to `page.tsx`, using Shadcn `Skeleton` and shared layouts in `components/common/skeletons/` so the fallback matches the page shell (not a generic full-page spinner).

**`DataTable` list views** (e.g. `/patients/dashboard`, `/medicines/dashboard`): Cell/header padding, first/last column edge insets (`first:pl-8` / `last:pr-8`), and “sort only on label + icon” behavior are implemented in `components/common/DataTable.tsx` (not `components/ui/table.tsx`). See `docs/06-UI-Design-System.md` — `<DataTable />`.

**Main content width:** Full-page routes under `app/(app)/` use an inner **`max-w-[1700px] mx-auto w-full`** wrapper (see `docs/06-UI-Design-System.md` §2.2). Intercepting modals (`@modal`) use **`ModalShell`** only (shadcn **`Dialog`** / Radix — see `<ModalShell />` in `docs/06-UI-Design-System.md`) and do not duplicate this pattern. **Create** intercepting modals (**`/new`**) use **`ModalShell size="lg"`** (server **`page.tsx`** + client panel); **edit/view** modals use **`size="xl"`** with inner **`<Suspense>`** and **`ModalDetailPanelBodySkeleton`** while detail data loads — no colocated **`loading.tsx`** on those `@modal` segments (see `docs/06-UI-Design-System.md` §2.1).

**Side nav width:** Collapse/expand is persisted with the `sidebar-collapsed` cookie and server-read `initialCollapsed` in `(app)/layout` so all matrix pages paint with the correct sidebar width (see `docs/06-UI-Design-System.md`, Navigation).

---

## 1. Home Dashboard — `/home/dashboard`

> **Status:** Not yet built.

### Purpose
High-level clinic overview — metrics, recent activity, quick-action shortcuts.

### Server Actions Needed

#### `getHomeStats()`
- **Input:** `clinicId` from session
- **Output:**
  ```ts
  {
    totalPatients:          number;   // COUNT patients WHERE is_active = true
    appointmentsToday:      number;   // COUNT appointments WHERE scheduled_at::date = today AND is_active = true
    appointmentsScheduled:  number;   // COUNT appointments WHERE status = 'scheduled' AND is_active = true
    appointmentsCompleted:  number;   // COUNT appointments WHERE status = 'completed' last 30 days
    newPatientsThisMonth:   number;   // COUNT patients created in current calendar month
  }
  ```
- **RBAC:** All roles.

#### `getRecentAppointments()`
- **Input:** `clinicId`, `limit = 5`
- **Output:** Array of `{ id, title, patientName, doctorName, date, status, type }`
  - `patientName` = JOIN patients on `patient_id`
  - `doctorName`  = JOIN users on `doctor_id`
- **Sort:** `date DESC`
- **RBAC:** All roles.

#### `getRecentPatients()`
- **Input:** `clinicId`, `limit = 5`
- **Output:** Array of `{ id, chartId, firstName, lastName, status, createdAt }`
- **Sort:** `created_at DESC`
- **RBAC:** All roles.

---

## 2. Home Reports — `/home/reports`

> **Status:** UI built (placeholder). Contains a placeholder view for Phase 3.

---

## 3. Appointments Dashboard — `/appointments/dashboard`

> **Status:** UI built (calendar Month/Week/Day views). Server actions pending.

### Views
The dashboard has three calendar sub-views controlled by a view-switcher pill:

| View | Component | Layout |
|---|---|---|
| Month | `MonthView` | Custom 2-panel grid (left: day tiles, right: event list for selected day) |
| Week | `TimeGridView` + FullCalendar | `timeGridWeek` with custom event cards |
| Day | `TimeGridView` + FullCalendar | `timeGridDay` with custom event cards |

### Server Actions Needed

#### `getAppointments({ view, rangeStart, rangeEnd })`
- **Input:**
  ```ts
  {
    clinicId:   string;   // from session — never from client
    rangeStart: Date;     // start of the visible window (month: startOfMonth; week: startOfWeek; day: startOfDay)
    rangeEnd:   Date;     // end of the visible window (month: endOfMonth; week: endOfWeek; day: endOfDay)
    view:       "month" | "week" | "day";
  }
  ```
- **Output:** DB rows as `AppointmentCalendarRow` (joined names, `scheduled_at`, duration). The dashboard page maps them to `AppointmentEvent` for the calendar client:
  ```ts
  // AppointmentCalendarRow (query layer) — includes:
  {
    id: string;
    title: string;
    patientName: string;       // patients.first_name + last_name
    patientFirstName: string;  // patients.first_name (for month-view chips)
    doctorName: string;
    scheduledAt: Date;
    duration: number;
    status: string;
    type: string;
    notes: string | null;
  }
  // AppointmentEvent (UI) — see `types/appointment.ts`
  ```
- **Filter:** `clinic_id = session.clinicId`, `is_active = true`, `date BETWEEN rangeStart AND rangeEnd`
- **Sort:** `date ASC`
- **RBAC:** All roles.

#### Notes
- The dashboard server `getRange` uses `date-fns` `startOfDay` / `endOfDay` for **day** view so `getAppointments` receives a full calendar day (inclusive); a single instant for both bounds would return no rows.
- **Month view** (`<MonthView />`): group keys and chip times use `date-fns` `parseISO` + `format` on `AppointmentEvent.start` so the browser’s local calendar date and clock time match the grid (events are stored/transmitted as UTC ISO strings). URL state tracks `date` (ISO string, defaults to today) and `view` (defaults to `"month"`).
- Always batch `view` and `date` state updates simultaneously using `nuqs` `useQueryStates` to prevent UI flicker.
- Day and Week views pass the event array directly to FullCalendar, which uses `scrollTime` with a `-2` hour offset (`Math.max(0, currentHour - 2):00:00`) to place current time in view.
- Clicking any event pushes `router.push('/appointments/view/${id}')` → intercepting modal.
- "New Appointment" button pushes `router.push('/appointments/new')` → intercepting modal.

---

## 4. Appointment Detail Modal / Page — `/appointments/view/[id]`

> **Status:** UI built (modal + full-page fallback). Server actions pending.

### Layout
`AppointmentDetailPanel` uses **`DetailPanel`** + **`DetailForm`** (single scrollable form column):
- **Form column:** All fields in one grid — patient, doctor, title, type, status, scheduled date + scheduled time, duration, description, actual check-in time (time-only), clinical notes (custom control). The patient select is **disabled in edit mode**; `patientId` is not sent on update. The client sends separate date/time strings; **`createAppointment` / `updateAppointment`** merge them into `scheduled_at`. Schemas: `createAppointmentSchema` / `updateAppointmentSchema`.
- **Sidebar (edit only):** **Documents** tab + activity log in the sidebar bottom zone (`events`). Create mode (`isCreate`) hides the sidebar.
- **Footer:** Save, Cancel, **Cancel Appointment** (delete) via `DetailPanel`; submit through `formRef`.

### Server Actions Needed

#### `getAppointmentDetail(id)`
- **Input:** `id` (UUID), `clinicId` from session
- **Output:**
  ```ts
  {
    id:                 string;
    title:              string;
    patientId:          string;
    patientName:        string;   // JOIN patients (first_name + last_name)
    patientChartId:     string;
    doctorId:           string;
    doctorName:         string;   // JOIN users (first_name + last_name)
    type:               string;
    status:             string;
    scheduledAt:        string;   // ISO timestamp (`scheduled_at`)
    duration:           number;
    actualCheckIn:      string | null; // ISO timestamp when set
    notes:              string | null;
    documents:          DocumentSummary[];
    activityLog:        LogEvent[];
    createdAt:          string;
    createdBy:          string;   // display name resolved from users
  }
  ```
- **Security:** Verify `clinic_id = session.clinicId` — throw 404 if not found or wrong clinic.
- **RBAC:** All roles.

#### `updateAppointment(id, data)`
- **Input:** `id`, `UpdateAppointmentInput` (from `lib/validators/appointment.ts`), `clinicId` from session
- **Validates:** Zod schema in `lib/validators/appointment.ts`
- **Enforces:**
  - `doctorId` must be an active user with role `doctor`
  - `patientId` cannot be changed after creation (payload mismatch → error; column is never updated)
  - Duration between 15–480 minutes
- **Returns:** Updated appointment or validation error
- **RBAC:** All roles can edit. `clinicId` and `createdBy` are immutable.

#### `deleteAppointment(id)` *(soft delete)*
- **Input:** `id`, `clinicId` from session
- **Action:** `SET is_active = false`
- **RBAC:** Doctor and Admin only.

---

## 5. New Appointment Modal / Page — `/appointments/new`

> **Status:** UI built (modal + full-page fallback). Server actions wired. Patient and doctor pickers populated via `getActivePatients` and `getActiveDoctors`.

### Server Actions

#### `createAppointment(data)`
- **Input:** `CreateAppointmentInput` (from `lib/validators/appointment.ts`), `clinicId` from session
- **Validates:** Zod schema in `lib/validators/appointment.ts`
- **Enforces:**
  - `doctorId` → active user with role `doctor`
  - `patientId` → active patient
  - Duration 15–480 minutes
  - Default `status = 'scheduled'`
  - `createdBy` = `session.userId` (immutable after creation)
  - `clinicId` = `session.clinicId` (immutable after creation)
- **Returns:** Created appointment `{ id }` (client then navigates to detail view)
- **RBAC:** All roles.

#### Supporting Selects (for form dropdowns)
Both needed to populate the patient and doctor pickers in the form:

`getActivePatients()` — `{ id, firstName, lastName, chartId }[]` where `is_active = true`
`getActiveDoctors()` — `{ id, firstName, lastName, chartId }[]` where `is_active = true AND type = 'doctor'`

---

## 6. Appointments Reports — `/appointments/reports`

> **Status:** UI built (placeholder). Contains a placeholder view for Phase 3.

---

## 7. Patients Dashboard — `/patients/dashboard`

> **Status:** UI built (DataTable with search + filter). Server actions pending.

### Table Columns
| Column | DB Field | Sortable? | Filterable? |
|---|---|---|---|
| Patient (name + email) | `first_name`, `last_name`, `email` | ✓ by last_name | Search only |
| Chart ID | `chart_id` | — | Search only |
| Last Visit | Derived from most recent appointment `scheduled_at` | ✓ | — |
| Last Consulted Dr. | JOIN appointments → users | — | ✓ (select) |
| Status | `is_active` boolean → mapped to `active` / `inactive` display | — | ✓ (select) |

> **Note on "Last Visit":** Derived field — a subquery or join to appointments to get `MAX(scheduled_at)` for that patient. Not stored on the patient record directly.

> **Note on "Status":** Two states only — `active` and `inactive`, mapped from `patients.is_active boolean`. The UI previously had a "Critical" state; this has been removed from both the UI and data model.

### Interaction
- **Row click:** Navigates to `/patients/view/[id]` using `<DataTable onRowClick />` (client `router.push`). Soft navigation from the dashboard opens the intercepting modal; a direct URL or hard refresh uses the full-page detail route.

### Server Actions Needed

#### `getPatients({ search, filters, page, pageSize, sort })`
- **Input:**
  ```ts
  {
    clinicId:    string;   // from session
    search?:     string;   // matches first_name, last_name, chart_id, phone
    status?:     "active" | "inactive";
    doctorId?:   string;   // filter by last consulted doctor
    page:        number;   // 1-indexed
    pageSize:    number;   // default 10
    sortBy?:     "lastName" | "lastVisit";
    sortDir?:    "asc" | "desc";
  }
  ```
- **Output:**
  ```ts
  {
    rows: PatientRow[];
    total: number;          // for pagination
  }
  ```
  where `PatientRow`:
  ```ts
  {
    id:             string;
    chartId:        string;
    firstName:      string;
    lastName:       string;
    email:          string;
    phone:          string;
    lastVisit:      string | null;   // MAX(appointments.scheduled_at) for this patient
    assignedDoctor: string | null;   // doctor name from that last appointment
    status:         "active" | "inactive";
  }
  ```
- **Wire note:** `lib/db/queries/patients.ts` maps `patients.is_active` → `status` on each list row and does **not** expose `isActive` on that shape. The dashboard (and any consumer) must use `row.status`; deriving from `row.isActive` is always wrong for this action.
- **Filter:** Always `clinic_id = session.clinicId`
- **RBAC:** All roles.

---

## 8. Patient Detail Modal / Page — `/patients/view/[id]`

> **Status:** UI built (`DetailPanel` + `DetailForm` + RHF/Zod; modal + full-page fallback). Server actions pending.

### Layout
`PatientDetailPanel` uses `<DetailPanel />`:
- **Header:** Initials badge, name, chart ID pill, status badge, close
- **Form column:** `<DetailForm />` with all patient fields (including clinical notes textarea at the bottom). Create mode uses `createPatientSchema`; view/edit uses `updatePatientSchema`
- **Sidebar:** `DetailSidebar` tabbed — Documents | Appointments (same list/upload behaviour as before). In **create** mode (`isCreate`), the sidebar column is hidden
- **Activity log:** `events` prop on `DetailPanel` (always-visible bottom zone in the sidebar)

### Server Actions Needed

#### `getPatientDetail(id)`
- **Input:** `id` (UUID), `clinicId` from session
- **Output:**
  ```ts
  {
    id:                    string;
    chartId:               string;
    firstName:             string;
    lastName:              string;
    email:                 string;
    phone:                 string;
    dateOfBirth:           string;   // ISO date
    gender:                string;
    address:               string;
    bloodGroup:            string | null;
    allergies:             string | null;
    emergencyContactName:  string | null;
    emergencyContactPhone: string | null;
    notes:                 string | null;   // clinical notes
    isActive:              boolean;
    createdAt:             string;
    createdBy:             string;   // display name
    appointments:          PatientAppointmentSummary[];
    documents:             DocumentSummary[];
    activityLog:           LogEvent[];
  }
  ```
  where `PatientAppointmentSummary` (query layer; UI maps `scheduledAt` to display date + time strings):
  ```ts
  {
    id:           string;
    title:        string;
    doctor:       string;   // doctor display name
    scheduledAt:  Date;
    status:       string;
  }
  ```
  and `DocumentSummary`:
  ```ts
  {
    id:           string;
    name:         string;   // file_name from DB
    type:         string;   // mime-type or document classification
    size:         string;   // human-readable e.g. "2.4 MB"
    uploadedAt:   string;   // formatted date
  }
  ```
- **Security:** Verify `clinic_id = session.clinicId`.
- **RBAC:** All roles.

#### `updatePatient(id, data)`
- **Input:** `id`, patient form fields, `clinicId` from session
- **Validates:** Zod schema (to be created at `lib/validators/patient.ts`)
- **Enforces:**
  - At least one of `email` or `phone` must be non-empty
  - `clinicId` and `createdBy` are immutable
- **RBAC:** Doctor and Admin only (Staff cannot edit).

#### `getNoteForPatient(id)` / `saveNoteForPatient(id, note)`
The clinical notes field in the right column is a freeform textarea backed by `patients.notes`.
- Update happens on save / blur (debounced or explicit save button — TBD in Phase 3).
- **RBAC:** Doctor and Admin only.

#### `getPresignedUrl(documentId)`
- Called when a user clicks a document row to view it.
- **Input:** `documentId`, `clinicId` from session
- **Output:** `{ url: string }` — valid for 60 minutes
- **RBAC:** All roles.

---

## 9. New Patient Modal / Page — `/patients/new`

> **Status:** UI built (form modal + full-page fallback). Server actions pending.

### Form Fields
| Field | Required | DB Column | Validation |
|---|---|---|---|
| First Name | ✓ | `first_name` | min 1, max 100 |
| Last Name | ✓ | `last_name` | min 1, max 100 |
| Email | ✓ or phone | `email` | valid email format |
| Phone | ✓ or email | `phone` | non-empty string |
| Address | — | `address` | text |
| Date of Birth | ✓ | `date_of_birth` | valid date, not in future |
| Gender | ✓ | `gender` | `male / female / other` |
| Blood Group | — | `blood_group` | `A+ A- B+ B- AB+ AB- O+ O-` or null |
| Allergies | — | `allergies` | text or null |
| Emergency Contact Name | — | `emergency_contact_name` | text |
| Emergency Contact Phone | — | `emergency_contact_phone` | text |
| Initial Clinical Notes | — | `notes` | text |

### Implementation notes
- **Form:** Submit and cancel controls must live inside the same `<form>` as the fields so **Save** triggers `onSubmit` (native submit buttons outside a form do not submit it).
- **Gender:** The select is populated from `PATIENT_GENDERS` in `lib/validators/patient.ts` (`male` | `female` | `other`).
- **After create:** On success, `createPatient` calls `revalidatePath("/patients/dashboard")` after insert. The client then **closes the modal** (`router.back()` via `onClose`) when opened from the dashboard, or **`router.push('/patients/dashboard')`** from the full-page route, and **`router.refresh()`** so the table shows the new row without losing dashboard URL state (search/filters/pagination) in the modal case.

### Server Actions Needed

#### `createPatient(data)`
- **Input:** Patient form values, `clinicId` from session
- **Validates:** Zod schema (`lib/validators/patient.ts` — to be created)
- **Enforces:**
  - At least one of `email` or `phone` must be non-empty
  - Generates `chartId` using the 10000–99999 range algorithm (see `docs/08-Business-Rules.md §3`)
  - Sets `createdBy = session.userId` (immutable)
  - Sets `clinicId = session.clinicId` (immutable)
  - Sets `is_active = true`
- **Returns:** `{ id }` — after success, modal context uses `router.back()` + `router.refresh()`; full-page `/patients/new` uses `router.push('/patients/dashboard')` + `router.refresh()`. `revalidatePath` runs in the action.
- **RBAC:** All roles.

---

## 10. Patients Reports — `/patients/reports`

> **Status:** UI built (placeholder). Contains a placeholder view for Phase 3.

---

## 11. Medicines Dashboard — `/medicines/dashboard`

> **Status:** UI built (DataTable with search + filter). Server actions pending.

### Table Columns
| Column | DB Field | Sortable? | Filterable? |
|---|---|---|---|
| Medicine | `name` (+ `brand` subline); **leading icon** from `category` (Lucide mapping in `MedicinesTable`, same flex layout pattern as `InitialsBadge` on patients) | ✓ by name | Search |
| Category | `category` | — | ✓ (select) |
| Last Prescribed | `last_prescribed_date` | ✓ | — |
| Status | `is_active` | — | ✓ (select: Active / Inactive) |

**Filters not shown as columns:** `form` is available in `TableFilterBar` only (not a table column). **Brand** appears under the medicine name, not as its own column.

> **SKU removed.** The `sku` field was present in early mock data but is not part of the DB schema and has been fully removed from the UI, types, and mock data.

### Interaction
- **Row click:** Navigates to `/medicines/view/[id]` using `<DataTable onRowClick />` (client `router.push`). Soft navigation from the dashboard opens the intercepting modal; a direct URL or hard refresh uses the full-page detail route.

### Server Actions Needed

#### `getMedicines({ search, filters, page, pageSize, sort })`
- **Input:**
  ```ts
  {
    clinicId:    string;   // from session
    search?:     string;   // matches name, brand, category
    category?:   string;
    form?:       string;
    isActive?:   boolean;  // default: true only
    page:        number;
    pageSize:    number;   // default 10
    sortBy?:     "name" | "lastPrescribedDate";
    sortDir?:    "asc" | "desc";
  }
  ```
- **Output:**
  ```ts
  {
    rows:  MedicineRow[];
    total: number;
  }
  ```
  where each row matches `lib/db/queries/medicines.ts` `MedicineRow` (`lastPrescribedDate` as `Date | null` from the DB). The dashboard page maps rows to UI `MedicineRow` in `types/medicine.ts` (formatted `lastUsed`, `status` badge, category label for the list icon — **no** separate `icon` field on the row type).
  ```ts
  {
    id:                 string;
    name:               string;
    category:           string | null;
    form:               string | null;
    brand:              string | null;
    lastPrescribedDate: Date | null;
    isActive:           boolean;
  }
  ```
- **RBAC:** All roles.

---

## 12. Medicine Detail Modal / Page — `/medicines/view/[id]`

> **Status:** UI built (modal + full-page fallback). Server actions pending.

### Layout
`MedicineDetailPanel` uses **`DetailPanel`** + **`DetailForm`**:
- **Form column:** Single scrollable grid of medicine fields (name, identifiers, category, form, dates, description, active, etc.).
- **Sidebar (edit only):** Activity log via `events`. Create mode hides the sidebar (`isCreate`).

### Server Actions Needed

#### `getMedicineDetail(id)`
- **Input:** `id` (UUID), `clinicId` from session
- **Output:**
  ```ts
  {
    id:                 string;
    name:               string;
    sku:                string;
    category:           string;
    brand:              string;
    form:               string;
    description:        string | null;
    lastPrescribedDate: string | null;
    isActive:           boolean;
    createdAt:          string;
    createdBy:          string;
    activityLog:        LogEvent[];
  }
  ```
- **Security:** Verify `clinic_id = session.clinicId`.
- **RBAC:** All roles.

#### `updateMedicine(id, data)`
- **Input:** `id`, `MedicineFormValues` (from `lib/validators/medicine.ts`), `clinicId` from session
- **Validates:** `{ name, category, brand, form, lastPrescribedDate?, description? }`
- **Enforces:** `clinicId` and `createdBy` are immutable
- **RBAC:** Doctor and Admin only (Staff cannot edit).

#### `deactivateMedicine(id)` *(soft delete)*
- **Input:** `id`, `clinicId` from session
- **Action:** `SET is_active = false`
- **RBAC:** Doctor and Admin only.

---

## 13. New Medicine Modal / Page — `/medicines/new`

> **Status:** UI built (form modal + full-page fallback). Server actions pending.

### Form Fields
| Field | Required | DB Column | Validation |
|---|---|---|---|
| Name | ✓ | `name` | min 2, max 255 |
| Category | ✓ | `category` | enum (see `lib/validators/medicine.ts`) |
| Brand | ✓ | `brand` | min 1, max 255 |
| Form | ✓ | `form` | enum (Tablet, Syrup, Capsule, etc.) |
| Last Prescribed Date | — | `last_prescribed_date` | ISO date or null |
| Description | — | `description` | text |

### Server Actions Needed

#### `createMedicine(data)`
- **Input:** `MedicineFormValues`, `clinicId` from session
- **Validates:** Zod schema in `lib/validators/medicine.ts`
- **Enforces:**
  - Sets `createdBy = session.userId`
  - Sets `clinicId = session.clinicId`
  - Sets `is_active = true`
- **Returns:** `{ id }` — client navigates to `/medicines/view/${id}`
- **RBAC:** All roles (Staff can add, but cannot edit or delete).

---

## 14. Medicines Reports — `/medicines/reports`

> **Status:** UI built (placeholder). Contains a placeholder view for Phase 3.

---

## 15. Cross-Cutting: Document Upload Flow

Patient and appointment detail panels include a documents column with upload (`UploadDocumentDialog`) and list (`DocumentCard`).
This flow spans multiple pages and is described here once.

### Steps

1. Client requests a presigned **upload URL** from the server.
2. Server generates a presigned PUT URL from S3/Minio (valid 15 minutes).
3. Client uploads the file directly to S3 using the presigned URL (no server transit).
4. On upload success, client calls `confirmDocumentUpload()` to persist the metadata to the DB.

### Server Actions Needed

#### `getUploadPresignedUrl({ fileName, mimeType, fileSize, assignedToType, assignedToId, appointmentId? })`
- **Validates:** mime type in allowed set, file size ≤ 10MB
- **Input:** `fileName`, `mimeType`, `fileSize`, `assignedToType` (`patient` | `user`), `assignedToId`, optional `appointmentId`
- **Key:** uses `session.user.clinicSubdomain` + `assignedToType` + `assignedToId` (see `docs/09-File-Upload-Flow.md` §7)
- **Output:** `{ uploadUrl: string, fileKey: string }` — the `fileKey` is the S3 object key to be confirmed after upload
- **RBAC:** All roles.

#### `confirmDocumentUpload({ fileKey, fileName, fileSize, mimeType, title?, type, assignedToId, assignedToType, appointmentId? })`
- Creates the `documents` record in DB after the S3 upload confirms success
- **Clinic-boundary check:** verifies `assignedToId` belongs to the session `clinicId` before inserting (`patients` table for `"patient"`, `users` table for `"user"`)
- Sets `assignedToType` from the validated input; sets `uploadedBy = session.userId`, `clinicId = session.clinicId`; revalidates patient/appointment detail paths
- **RBAC:** All roles.

#### `getViewPresignedUrl(documentId)`
- Returns a presigned GET URL valid for 60 minutes
- Verifies `clinic_id = session.clinicId` before generating
- **RBAC:** All roles.

#### `deleteDocument(documentId)`
- Deletes S3 object AND the DB record atomically
- If S3 delete fails → abort DB delete
- **RBAC:** Doctor and Admin only.

---

## 16. Cross-Cutting: Activity Log

The activity log appears in: Appointment Detail, Patient Detail, Medicine Detail.

In Phase 3 this will be a real `audit_log` table. For now it is mock data.

### Planned Schema (`audit_log`)
```
id:           uuid  (PK)
clinic_id:    uuid
entity_type:  enum ('appointment', 'patient', 'medicine', 'document', 'user')
entity_id:    uuid
action:       varchar(100)   e.g. "Status changed", "File uploaded"
detail:       text
performed_by: text           (references users.id)
created_at:   timestamp
```

### Server Action Needed

#### `getActivityLog(entityType, entityId)`
- **Input:** `entityType`, `entityId`, `clinicId` from session
- **Output:** `LogEvent[]` sorted by `created_at DESC`
- **RBAC:** All roles.

#### `appendActivityLog(entityType, entityId, action, detail)` *(internal only)*
- Called inside other server actions (e.g. after `updateAppointment`) — never directly from the client
- Captures `performedBy = session.userId`, `createdAt = now()`

---

## 17. Schema Gaps — Decision Log

All gaps have been reviewed and resolved as follows:

| Gap | Decision | Status |
|---|---|---|
| `patients.status` — UI had `active/inactive/critical` | **Keep as `is_active boolean`.** UI now maps it to only `active` / `inactive`. "Critical" is fully removed. | ✅ Resolved |
| `medicines.category` — used in UI, missing from DB | **Add `category varchar(100)` to the `medicines` table.** Required before seeding. | ✅ Confirmed — add to schema |
| `medicines.sku` — present in UI, not in DB | **Remove from UI.** SKU is not part of the product. Fully removed from types, mock data, and all components. | ✅ Resolved — removed |
| `audit_log` table — activity log is mock data | **Keep as mock data for now.** Real `audit_log` table implementation deferred until end-to-end flow is running. | ✅ Deferred — no action needed yet |
| Doctor/patient pickers for appointment form | **Implement `getActivePatients()` and `getActiveDoctors()`.** Approved — required for appointment create/edit. | ✅ Confirmed — add these actions |

---

---

## 18. Shared Components & Intercepting Modals

The application provides intercepting routes to display forms seamlessly over the dashboard, backed by shared detail components:

- **`appointments/_components/`, `patients/_components/`, `medicines/_components/`**:
  > **Status:** UI built.
  Contain `AppointmentDetailPanel`, `PatientDetailPanel`, and `MedicineDetailPanel`. Each composes **`DetailPanel`** + **`DetailForm`** (React Hook Form + Zod from `lib/validators/`) and is shared by both the full-page routes and modal intercepts.

- **`@modal/(.)patients/view/[id]/`, `@modal/(.)patients/new/`**:
  > **Status:** UI built.
  Intercepting routes that utilize `ModalShell` to render the view and creation flows for patients over the current dashboard. **View** modal: server `page.tsx` wraps async data in **`<Suspense>`** with **`ModalDetailPanelBodySkeleton`** (see `docs/06-UI-Design-System.md` §2.1). **New** modal: server `page.tsx` + client inner — no segment `loading.tsx`.

- **`@modal/(.)appointments/view/[id]/`, `@modal/(.)medicines/view/[id]/`**:
  > **Status:** UI built.
  Intercepting routes rendering the edit flows for appointments and medicines within a `ModalShell`, using the same **`ModalShell` + inner `Suspense`** pattern as patient view.

---

## 19. URL Reference Summary

| Route | Page | Component | Action(s) |
|---|---|---|---|
| `/home/dashboard` | Home overview | — | `getHomeStats`, `getRecentAppointments`, `getRecentPatients` |
| `/home/reports` | Home Reports | Placeholder | `—` |
| `/appointments/dashboard` | Calendar view | `MonthView`, `TimeGridView` | `getAppointments` |
| `/appointments/new` | New appt form | `AppointmentDetailPanel mode="create"` | `createAppointment`, `getActivePatients`, `getActiveDoctors` |
| `/appointments/reports` | Appt Reports | Placeholder | `—` |
| `/appointments/view/[id]` | Appt detail | `AppointmentDetailPanel mode="edit"` | `getAppointmentDetail`, `getActivePatients`, `getActiveDoctors` (parallel with detail), `updateAppointment`, `deleteAppointment` |
| `/patients/dashboard` | Patient list | `DataTable` | `getPatients` |
| `/patients/new` | New patient form | `PatientDetailPanel mode="create"` | `createPatient` |
| `/patients/reports` | Patient Reports | Placeholder | `—` |
| `/patients/view/[id]` | Patient detail | `PatientDetailPanel mode="view"` | `getPatientDetail`, `updatePatient`, `getViewPresignedUrl` |
| `/medicines/dashboard` | Medicine list | `DataTable` | `getMedicines` |
| `/medicines/new` | New medicine form | `MedicineDetailPanel mode="create"` | `createMedicine` |
| `/medicines/reports` | Medicine Reports | Placeholder | `—` |
| `/medicines/view/[id]` | Medicine detail | `MedicineDetailPanel mode="edit"` | `getMedicineDetail`, `updateMedicine`, `deactivateMedicine` |
| `/@modal/(.)*` | Intercepting Modals | `ModalShell` + Detail Panels | All edit / new actions |

---

## 20. Pre-Backend Checklist

Before writing your first server action, complete the following in order.
Every item here is a hard prerequisite — skipping any will cause type errors or migrations later.


### Step 1 — Zod Validators
Create or complete validators in `lib/validators/`. These are the single source of truth used by both the client (React Hook Form) and the server (server actions).

- [ ] `lib/validators/patient.ts` — does not yet exist, create it:
  ```ts
  // Required fields: firstName, lastName, (email OR phone), dateOfBirth, gender
  // Optional: address, bloodGroup, allergies, emergencyContactName, emergencyContactPhone, notes
  // Enforce: at least one of email / phone must be non-empty (use .refine())
  ```
- [ ] `lib/validators/appointment.ts` — exists ✓. Review against DB schema to confirm field names match column names.
- [ ] `lib/validators/medicine.ts` — exists ✓. Already includes `category` and `form`.

### Step 2 — Auth / Session Helper
- [x] `lib/auth/session.ts` exports a real `getSession()` backed by Better-Auth — returns `{ id, clinicId, clinicSubdomain, clinicName, type, firstName, lastName, email }`. Throws `UNAUTHORIZED` if no session, `CLINIC_MISMATCH` if subdomain and user clinic differ.
- [x] Subdomain middleware (`middleware.ts`) resolves `clinicId` via `lib/clinic/resolve-by-subdomain.ts` (same query as `GET /api/clinic`) and forwards `x-clinic-id` / `x-subdomain`.

### Step 3 — RBAC Helper
- [x] `lib/auth/rbac.ts` — `ForbiddenError` class + `requireRole(session, allowed[])`. Throws `ForbiddenError` if `session.user.type` is not in `allowed`. All server actions call this before any DB work.

### Step 4 — Shared Supporting Actions (no UI dependency)
- [x] `getActivePatients()` — patients action file
- [x] `getActiveDoctors()` — appointments action file
- [ ] `appendActivityLog()` — pending (audit_log table not yet built)

### Step 5 — Page Actions (build in this order)

1. **Medicines**
   - [x] `getMedicines`
   - [x] `getMedicineDetail`
   - [x] `createMedicine`
   - [x] `updateMedicine` — roles: `["admin", "doctor"]`
   - [x] `deactivateMedicine` — roles: `["admin", "doctor"]`

2. **Patients**
   - [x] `getPatients`
   - [x] `getPatientDetail`
   - [x] `createPatient`
   - [x] `updatePatient` — roles: `["admin", "doctor", "staff"]`

3. **Appointments**
   - [x] `getAppointments`
   - [x] `getAppointmentDetail`
   - [x] `createAppointment`
   - [x] `updateAppointment`
   - [x] `deleteAppointment` (soft) — roles: `["admin", "doctor", "staff"]`

4. **Documents**
   - [x] `getUploadPresignedUrl`
   - [x] `confirmDocumentUpload`
   - [x] `getViewPresignedUrl`
   - [x] `deleteDocument` — roles: `["admin", "doctor"]`

5. **Home Dashboard**
   - [x] `getHomeStats`
   - [x] `getRecentAppointments`
   - [x] `getRecentPatients`

### Step 6 — Wire UI to Actions
Server actions return data shaped for `@/types/*` view models (or query-layer types in `lib/db/queries/` mapped in the action). Pages should call actions and map to the types expected by panels and tables.

**Note:** Appointment create/edit UI is fully wired. `AppointmentDetailPanel` uses `createAppointmentSchema` / `updateAppointmentSchema` with patient and doctor pickers. Picker options are fetched on the **server** in each route (`Promise.all` with `getActivePatients` / `getActiveDoctors` where applicable) and passed as props so selects are populated on first paint.
