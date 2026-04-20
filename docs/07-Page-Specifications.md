# 07 — Page Specifications

This document defines the backend contract for every page in the authenticated app shell.
For each page it specifies: the URL, which server actions to write, what data goes in and out,
filtering/sorting/pagination requirements, and which RBAC rules apply.

Use `docs/03-Database-Schema.md` for field definitions, `docs/08-Business-Rules.md` for
validation rules, and `docs/04-API-Specification.md` for server action and handler contracts.

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

> **Status:** **Built** — stats + today's schedule + real recent activity feed. `getRecentActivity()` is called in the `Promise.all` alongside stats and appointments. The "Recent Activity" column renders via `HomeDashboardActivityFeed` with a DataTable-style card and constrained scrollable area.

### Purpose
High-level clinic overview — metric cards, today's appointments strip, link to new appointment, recent activity feed.

### Server actions (`lib/actions/home.ts`)

#### `getHomeStats()`
- **Input:** `clinicId` from session (via `getSession()` inside the action).
- **Output:**
  ```ts
  {
    totalPatients:          number;   // active patients only
    appointmentsToday:      number;   // active appts whose scheduled_at date = CURRENT_DATE (clinic DB)
    appointmentsScheduled:  number;   // status = 'scheduled', active
    appointmentsCompleted:  number;   // status = 'completed', active, scheduled_at >= now - 30 days
    newPatientsThisMonth:   number;   // patients created since start of current calendar month
  }
  ```
- **RBAC:** All roles (`requireRole` admin | doctor | staff).

#### `getRecentAppointments(limit?)`
- **Default `limit`:** 5 (validated 1–50).
- **Output:** `{ id, title, patientName, doctorName, scheduledAt, status, category, visitType }` (patient/doctor names from joins). Home table shows `formatAppointmentHeading({ category, visitType, title })` in the visit column.
- **Sort:** `scheduled_at DESC`.
- **Filter:** `clinic_id`, `is_active = true`.
- **RBAC:** All roles.

#### `getRecentPatients(limit?)`
- **Implemented** for reuse elsewhere; the home page **does not** call it yet. Returns `{ id, chartId, firstName, lastName, status: 'active'|'inactive', createdAt }`, `created_at DESC`.

---

## 2. Home Reports — `/home/reports`

> **Status:** UI built (placeholder only). No reporting backend yet.

---

## 3. Appointments Dashboard — `/appointments/dashboard`

> **Status:** Built — calendar UI + `getAppointments` / mutations in `lib/actions/appointments.ts`.

### Views
The dashboard has three calendar sub-views controlled by a view-switcher pill:

| View | Component | Layout |
|---|---|---|
| Month | `MonthView` | Custom 2-panel grid (left: day tiles, right: event list for selected day) |
| Week | `TimeGridView` + FullCalendar | `timeGridWeek` with custom event cards |
| Day | `TimeGridView` + FullCalendar | `timeGridDay` with custom event cards |

### Server actions (`lib/actions/appointments.ts`)

#### `getAppointments({ rangeStart, rangeEnd })`
- **Input (Zod):** `{ rangeStart: string, rangeEnd: string }` — each a non-empty ISO datetime string; the server parses with `new Date(...)`. The calendar **`view`** is client-only for layout; it is **not** sent to this action.
- **Equivalent conceptual window:**
  ```ts
  {
    clinicId:   string;   // from session inside the action — never from the client
    rangeStart: Date;     // derived from parsed string — start of visible window (month/week/day via `getCalendarRange` on the server page)
    rangeEnd:   Date;     // end of visible window
  }
  ```
- **Output:** DB rows as `AppointmentCalendarRow` (joined names, `scheduled_at`, duration). The dashboard page maps them to `AppointmentEvent` for the calendar client:
  ```ts
  // AppointmentCalendarRow (query layer) — includes:
  {
    id: string;
    title: string | null;
    patientName: string;       // patients.first_name + last_name
    patientFirstName: string;  // patients.first_name (for month-view chips)
    doctorName: string;
    scheduledAt: Date;
    duration: number;
    status: string;
    category: string;
    visitType: string;
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

> **Status:** Built (modal + full-page fallback + `getAppointmentDetail` / create / update / delete actions).

### Layout
`AppointmentDetailPanel` uses **`DetailPanel`** + **`DetailForm`**:
- **Main column (tabs):** **Details** tab — all fields in one grid — **Patient** (create: `<AsyncSearchCombobox />` via `AppointmentPatientCombobox` — debounced **`searchPatientsForPicker`**, cmdk list capped at 8 rows + scroll, unless **`patientId`** is prefilled via **`initialValues`** then **disabled** with **`disabledDisplayLabel`**; edit: same control **disabled** with name + chart id label), doctor, **Title** (admin/doctor only — `usePermission("viewAppointmentTitle")`; immediately after doctor), **category** and **visit type** on one row (`colSpan: 1` each), scheduled date + scheduled time, **duration** + optional **Fee** (number, `DetailForm` **`prefix: "₹"`** input group, `step=0.01` — **admin/doctor:** always shown in create and edit; **staff:** hidden on create, shown in edit only when **`status === 'completed'`**, and non-editable via **`DetailForm` `TextField.readOnly`** (normal input appearance, not disabled/muted styling) when shown), **actual check-in** (time-only, full row), **status**, description, clinical notes (custom control). `patientId` is not sent on update. The **Assigned Doctor** select uses a capped **`SelectContent`** height (~six visible options, then scroll) via `selectContentClassName` on that field only. The client sends separate date/time strings; **`createAppointment` / `updateAppointment`** merge them into `scheduled_at`. Create defaults: today’s date and current local time (`HH:mm`). Schemas: `createAppointmentSchema` / `updateAppointmentSchema`. **Documents** / **Appointments** tabs (admin/doctor only — same `viewDetailSidebar` gate as before): shared **`DocumentsTab`** / **`AppointmentListTab`**; document list is **all** patient-assigned documents (upload still passes `appointmentId` + `patientId` for metadata). **Appointments** tab lists the patient’s active visits with **`currentAppointmentId`** highlighting the open visit. **Prescriptions** tab (edit only, admin/doctor — **`usePermission("viewPrescriptions")`**, not create mode): **`PrescriptionsTab`** after Documents and Appointments; receives **`appointmentId`** + **`initialPrescription`** from **`AppointmentDetail.prescription`** (see **`getAppointmentDetail`**).
- **Header (edit):** primary title uses **`formatAppointmentHeading`** (`lib/utils/format-appointment-heading.ts`): `Category - Visit Type` or `Category - Visit Type (Title)`. Subline under the date/time shows **Duration** (minutes) always; **Fee** via **`formatAppointmentFeeInr`** (`lib/utils/format-appointment-fee.ts`) for admin/doctor always, for **staff** only when **`status === 'completed'`** (same rule as the fee field).
- **Edit mode — fee → status:** When **not** creating, if the user enters a **positive** fee from a previously empty/zero fee and **status** is not already **`completed`**, the client sets **status** to **`completed`** via React Hook Form (`setValue`) and shows a Sonner toast: *“Status set to Completed because a fee was added.”* Implementation: `DetailForm` **`insideForm`** uses **`useWatch({ name: "fee" })`** (not `watch("fee")` alone) so the effect re-renders when the fee field changes. Does not run on create; does not re-fire when changing fee while already completed.
- **Right column (edit only, admin/doctor):** **`AppointmentPatientSummaryCard`** above the activity log (name, age, gender, blood group, allergies, past history — from **`getAppointmentDetail`** / **`buildAppointmentDetail`**; optional fields show **—** when null/empty; past history redacted for staff at the action layer though staff never see this column). **`DetailSidebar`**: **40% / 60%** vertical split between card zone and activity log; card area scrolls on overflow. Activity log via `events`. Create mode (`isCreate`) hides the right column; staff never see it (`viewDetailSidebar`).
- **Footer:** Save, Cancel, **Delete appointment** (`deleteLabel` on `DetailPanel`) — opens a Radix **`AlertDialog`** (not `DetailPanel` itself): title **Delete appointment?**; body explains permanent delete vs marking inactive; **Cancel appointment** calls **`updateAppointment`** with **`{ status: 'cancelled' }`** then **`useDetailExit`**; **Delete** calls **`deleteAppointment`** then **`useDetailExit`** (same success toasts and exit paths as before); dismiss via **X** or **overlay** closes the dialog only. Submit through `formRef` for Save.
- **After successful save, status cancel, or delete:** **`useDetailExit`** with **`listHref`** **`/appointments/dashboard`** — **intercepting modal:** **`AppointmentViewModalClient`** supplies **`onClose`** (`router.back`); **`exitAfterMutation`** runs **`onClose`** + **`router.refresh()`** inside **`startTransition`**; **full-page:** **`router.replace`** to the dashboard + immediate **`router.refresh()`**.

### Server Actions Needed

#### `getAppointmentDetail(id)`
- **Input:** `id` (UUID), `clinicId` from session
- **Output:**
  ```ts
  {
    id:                 string;
    title:              string | null;
    patientId:          string;
    patientName:        string;   // JOIN patients (first_name + last_name)
    patientChartId:     number;   // raw integer; format in UI with `formatPatientChartId`
    doctorId:           string;
    doctorName:         string;   // JOIN users (first_name + last_name)
    category:           string;
    visitType:          string;
    status:             string;
    scheduledAt:        string;   // ISO timestamp (`scheduled_at`)
    duration:           number;
    fee:                number | null; // numeric(10,2)
    actualCheckIn:      string | null; // ISO timestamp when set
    notes:              string | null;
    description:        string | null;
    patientDocuments:   DocumentSummary[];  // `getDocumentsByAssignment(clinicId, patientId, "patient")`
    patientAppointments: PatientAppointmentSummary[]; // active rows for patient, `scheduled_at` DESC; nested `title` redacted for staff like `getPatientDetail`
    // Joined patient row (query layer) for appointment-detail sidebar summary card + mapper `patientSummary`:
    patientDateOfBirth: string | Date | null;
    patientGender: string | null;
    patientBloodGroup: string | null;
    patientAllergies: string | null;
    patientPastHistoryNotes: string | null; // action: null for staff (same rule as `pastHistoryNotes` on `getPatientDetail`)
    activityLog:        ActivityLogEntry[];  // admin/doctor: first 20 real entries; staff: []
    activityLogHasMore: boolean;             // admin/doctor: whether more pages exist; staff: false
    prescription:       PrescriptionForAppointmentTab | null;  // admin/doctor: from `getPrescriptionByAppointment` + `toAppointmentTabPrescription`; staff: null (not fetched)
    createdAt:          string;
    createdBy:          string;   // display name resolved from users
  }
  ```
- **Security:** Verify `clinic_id = session.clinicId` — throw 404 if not found or wrong clinic.
- **RBAC:** All roles for the appointment row; **`prescription`** is populated only when **`hasPermission(..., "viewPrescriptions")`** (admin/doctor).

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
- **RBAC:** All roles (admin, doctor, staff).

---

## 5. New Appointment Modal / Page — `/appointments/new`

> **Status:** UI built (modal + full-page fallback). Server actions wired. **Doctor** options load on the server via `getActiveDoctors` (`lib/actions/appointments.ts`). **Patient** create picker uses debounced **`searchPatientsForPicker`** (`lib/actions/patients.ts`) — no bulk `getActivePatients` preload for appointments.

### Query-string prefill (optional)
- **`@modal/(.)appointments/new/page.tsx`** and **`appointments/new/page.tsx`** read **`searchParams`** and pass **`initialValues`** (`types/appointment.ts` **`AppointmentCreateInitialValues`**) into **`NewAppointmentModalClient`** / **`AppointmentDetailPanel`**.
- Supported keys (validated in **`parseNewAppointmentSearchParams`** — `app/(app)/appointments/_lib/parse-new-appointment-search-params.ts`): **`patientId`** (UUID), **`patientLabel`** (closed combobox text), optional **`doctorId`**, optional **`category`** / **`visitType`** (must match `lib/constants/appointment.ts` enums). Unknown values are dropped.
- **Create mode merge:** `initialValues` override blank **`createDefaults`** for patient, doctor, category, visit type. When **`patientId`** is prefilled, **`AppointmentPatientCombobox`** is **disabled** (same as edit) and shows **`patientDisplayLabel`** from **`patientLabel`**.

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
- **Returns:** Created appointment `{ id }` — client uses **`useDetailExit`** (modal: **`startTransition`** + back + refresh; full-page: **`replace`** `/appointments/dashboard` + immediate refresh); does not auto-open the new detail view.
- **RBAC:** All roles.

#### Supporting data (form pickers)
- **`getActiveDoctors()`** — populates the doctor `<Select />`: `{ id, firstName, lastName, … }[]` where `is_active = true` and `type = 'doctor'`.
- **`searchPatientsForPicker({ query })`** — async patient combobox (create mode): returns up to **8** active patients per request; search predicate matches the patients directory (`getPatients`): first/last name, email, phone, chart id. Empty `query` returns the first 8 active patients ordered by name. Implementation: `searchActivePatientsForPicker` in `lib/db/queries/patients.ts`.

---

## 6. Appointments Reports — `/appointments/reports`

> **Status:** UI built (placeholder only). No reporting backend yet.

---

## 7. Patients Dashboard — `/patients/dashboard`

> **Status:** Built — list + filters + `getPatients` / related actions in `lib/actions/patients.ts`.

### Table Columns
| Column | DB Field | Sortable? | Filterable? |
|---|---|---|---|
| Patient (name + phone subtitle) | `first_name`, `last_name`, `phone` | ✓ by last_name | Search only |
| Chart ID | `chart_id` | — | Search only |
| Last Visit | Derived from most recent **completed** appointment with `scheduled_at` strictly before DB `now()` | ✓ | — |
| Last Consulted Dr. | JOIN appointments → users | — | ✓ (select) |
| Status | `is_active` boolean → mapped to `active` / `inactive` display | — | ✓ (select) |
| Actions | Icon buttons (view patient; new appointment **only when** `status === "active"`) | — | — |

> **Note on "Last Visit":** Derived field — `MAX(appointments.scheduled_at)` per patient over rows where `status = 'completed'`, `is_active = true`, and `scheduled_at < now()` (database clock). Not stored on the patient record directly. The same qualifying appointment row also supplies list-only fields **`lastVisitCategory`** (`appointment_category`) and **`lastVisitDoctorId`** (`doctor_id`). The dashboard maps the raw timestamp to **`lastVisitAt`** (ISO string on `PatientRow`) for client logic (e.g. follow-up window vs first visit when opening **New appointment**).

> **Note on "Status":** Two states only — `active` and `inactive`, mapped from `patients.is_active boolean`. **`StatusBadge`** renders **inactive** with the red token family (`--color-red` / `--color-red-bg` / `--color-red-border`), same semantic weight as a cancelled appointment. The UI previously had a "Critical" state; this has been removed from both the UI and data model.

### Interaction
- **Row click:** Navigates to `/patients/view/[id]` using `<DataTable onRowClick />` (client `router.push`). Soft navigation from the dashboard opens the intercepting modal; a direct URL or hard refresh uses the full-page detail route.
- **Actions column (rightmost):** **Eye** — same navigation as row click (all rows). **Calendar** — shown **only for active rows** (`status !== "inactive"`); `router.push` to `/appointments/new?…` with validated query keys (`patientId`, `patientLabel`, `visitType`, optional `category`, optional `doctorId`) parsed on the server into `AppointmentDetailPanel` **`initialValues`** (intercepting modal or full-page). Visit type uses **`FOLLOW_UP_WINDOW_DAYS`** vs `lastVisitAt` (`follow-up-visit` when the last qualifying visit’s calendar day is within the window ending today, else `first-visit`). Action cells call **`stopPropagation`** so the row click handler does not run.
- **Empty table:** `DataTable` **`emptyState`** shows the no-results copy plus a **New Patient** button matching the page header control (`gap-2 shadow-sm`, ink fill) using **`router.push("/patients/new")`**.

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
    chartId:        number;          // raw integer; format in UI with `formatPatientChartId`
    firstName:      string;
    lastName:       string;
    email:          string;
    phone:          string;
    lastVisit:      string;          // display e.g. "Nov 5, 2024" or "No visits"
    lastVisitAt:    string | null;   // ISO instant for last qualifying visit; null if none
    assignedDoctor: string | null;   // doctor name from that same qualifying appointment
    lastVisitCategory: string | null; // appointment_category from that row; null if no visit
    lastVisitDoctorId: string | null; // doctor_id from that row; null if no visit
    status:         "active" | "inactive";
  }
  ```
- **Wire note:** `lib/db/queries/patients.ts` maps `patients.is_active` → `status` on each list row and does **not** expose `isActive` on that shape. The dashboard (and any consumer) must use `row.status`; deriving from `row.isActive` is always wrong for this action.
- **Filter:** Always `clinic_id = session.clinicId`
- **RBAC:** All roles.

---

## 8. Patient Detail Modal / Page — `/patients/view/[id]`

> **Status:** Built — `getPatientDetail` / create / update + documents in `lib/actions/patients.ts` (and documents actions).

### Layout
`PatientDetailPanel` uses `<DetailPanel />`:
- **Header:** Initials badge, name, chart ID pill, status badge, close
- **Details tab:** `<DetailForm />` with all patient fields, including **Date of Birth** and **Age** (synced; UI-only age), then **Gender** on its own row (`colSpan: 2` + `constrainControlToHalfRow` so the control matches one column width), then **Phone** and **Email** side-by-side, then **Blood Group** and **Allergies**, and, for admin/doctor, a tall **Patient's Past History** (`pastHistoryNotes`) textarea (`rows` + `min-height` via `DetailForm` textarea `className`) at the bottom. Create mode uses `createPatientSchema`; view/edit uses `updatePatientSchema`. `PatientDobAgeSync` keeps DOB and age aligned inside the form (`DetailForm` `insideForm` slot).
- **Documents / Appointments / Prescriptions tabs (admin/doctor):** Shared **`DocumentsTab`** / **`AppointmentListTab`** / **`PatientPrescriptionsTab`** — first two follow `viewDetailSidebar`; **Prescriptions** follows **`viewPrescriptions`** (see **`DetailPanel`**). Tab order: **Details** → **Documents** → **Appointments** → **Prescriptions**. **`PatientPrescriptionsTab`** lists **published** prescriptions only (`getPrescriptionsByPatient` — drafts are excluded); each row navigates to **`/appointments/view/[id]`**. **Appointments** rows navigate to **`/appointments/view/[id]`** (no **Current** badge — omit **`currentAppointmentId`**). In **create** mode (`isCreate`), the right column is hidden and only the Details body is shown (tab bar hidden).
- **Activity log:** `events` prop on `DetailPanel` → right **`DetailSidebar`** (admin/doctor edit only; wider fixed max vs main column, see `docs/06-UI-Design-System.md`)
- **After successful save, deactivate, or reactivation confirm:** **`useDetailExit`** with **`listHref`** **`/patients/dashboard`** — **intercepting modal:** **`PatientViewModalClient`** supplies **`onClose`** (`router.back`); **`exitAfterMutation`** uses **`startTransition`** for **`onClose`** + **`router.refresh()`**; **full-page:** **`router.replace('/patients/dashboard')`** + immediate **`router.refresh()`**. **`updatePatient`** / **`deactivatePatient`** call **`revalidatePath("/patients/dashboard")`** on success (same as **`createPatient`**).
- **Footer:** **`DetailPanel`** **`onDelete`** — label **Deactivate Patient**; shown **only when the patient is active** (`isActive === true`); all roles; **`deactivatePatient`** → toast **"Patient deactivated."** then **`exitAfterMutation`**. Inactive records omit **`onDelete`** (reactivate via save + **`AlertDialog`** only).
- **Inactive record + Save:** Radix **`AlertDialog`** (same structure as medicine reactivation): copy explains save will reactivate; **Confirm** → **`updatePatient`** with **`isActive: true`** plus form payload → toast **"Patient reactivated and updated successfully."** → **`exitAfterMutation`**.

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
    pastHistoryNotes:      string | null;   // patients.past_history_notes (admin/doctor; null for staff)
    isActive:              boolean;
    createdAt:             string;
    createdBy:             string;   // display name
    appointments:          PatientAppointmentSummary[];
    documents:             DocumentSummary[];
    activityLog:           ActivityLogEntry[];   // admin/doctor: first 20 real entries; staff: []
    activityLogHasMore:    boolean;              // admin/doctor: whether more pages exist; staff: false
    prescriptions:         PatientPrescriptionSummaryAction[]; // admin/doctor: from `getPrescriptionsByPatient` (published only); staff: []
  }
  ```
  **`PatientPrescriptionSummaryAction`** matches **`getPrescriptionsByPatient`** / `lib/actions/prescriptions.ts` **`PatientPrescriptionSummary`**: **`id`**, **`chartId`**, **`appointmentId`**, **`scheduledAt`** (Date — linked visit), **`doctorName`**, **`activeItemCount`**, **`publishedAt`**. The patient-detail mapper exposes ISO strings on **`types/patient.ts`** **`PatientPrescriptionSummary`** for **`PatientPrescriptionsTab`**. Draft prescriptions never appear in this array.

  where `PatientAppointmentSummary` (query layer; UI maps `scheduledAt` to display date + time strings and adds `heading` via `formatAppointmentHeading`):
  ```ts
  {
    id:           string;
    title:        string | null;
    category:     string;
    visitType:    string;
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
- **Input:** `id`, patient form fields, optional **`isActive: true`** for reactivation only, `clinicId` from session
- **Validates:** Zod schema at `lib/validators/patient.ts` (`updatePatientSchema`; **`isActive`** is `z.literal(true).optional()`)
- **Enforces:**
  - `phone` must be non-empty; `email` optional
  - `gender` required (`male` | `female` | `other`)
  - Either `dateOfBirth` (after trim) or `age` (UI) must be provided; server normalizes to `date_of_birth` only
  - `clinicId` and `createdBy` are immutable
- **RBAC:** All roles may submit; `pastHistoryNotes` is only applied for admin/doctor (see `docs/05-Authentication.md`).
- **Returns:** On success, calls **`revalidatePath("/patients/dashboard")`** before returning (list cache aligned with **`createPatient`**).

#### `deactivatePatient(id)`
- **Input:** patient UUID; **`clinicId`** from session
- **Effect:** Sets **`patients.is_active = false`** (soft delete)
- **RBAC:** **`requireRole(session, ["admin", "doctor", "staff"])`**
- **Returns:** **`revalidatePath("/patients/dashboard")`** on success (mirrors **`deactivateMedicine`**)

#### Patient past history (`pastHistoryNotes`)
The **Patient's Past History** textarea is backed by `patients.past_history_notes` and is updated with the rest of the form on **Save**.
- **RBAC:** Admin and Doctor only (hidden and redacted for staff — see `docs/05-Authentication.md`).

#### `getPresignedUrl(documentId)`
- Called when a user clicks a document row to view it.
- **Input:** `documentId`, `clinicId` from session
- **Output:** `{ url: string }` — valid for 60 minutes
- **RBAC:** All roles.

---

## 9. New Patient Modal / Page — `/patients/new`

> **Status:** Built — `createPatient` and related validators in `lib/actions/patients.ts`.

### Form Fields
| Field | Required | DB Column | Validation |
|---|---|---|---|
| First Name | ✓ | `first_name` | min 1, max 100 |
| Last Name | ✓ | `last_name` | min 1, max 100 |
| Email | — | `email` | valid email format or empty |
| Phone | ✓ | `phone` | non-empty string |
| Address | — | `address` | text |
| Date of Birth | ✓ or Age | `date_of_birth` | required with Age (see business rules); only this column is stored |
| Age | ✓ or DOB | — | UI-only; syncs with DOB; if alone, server sets DOB to Jan 1 of computed year |
| Gender | ✓ | `gender` | `male / female / other` |
| Blood Group | — | `blood_group` | `A+ A- B+ B- AB+ AB- O+ O-` or null |
| Allergies | — | `allergies` | text or null |
| Emergency Contact Name | — | `emergency_contact_name` | text |
| Emergency Contact Phone | — | `emergency_contact_phone` | text |
| Patient's Past History | — | `past_history_notes` | text; admin/doctor only |

### Implementation notes
- **Form:** Submit and cancel controls must live inside the same `<form>` as the fields so **Save** triggers `onSubmit` (native submit buttons outside a form do not submit it).
- **Gender:** The select is populated from `PATIENT_GENDERS` in `lib/validators/patient.ts` (`male` | `female` | `other`).
- **After create:** On success, `createPatient` calls `revalidatePath("/patients/dashboard")` after insert. The client uses the same **`useDetailExit`** path as edit: **modal** → **`startTransition`** wrapping **`onClose`** + **`refresh`**; **full-page** → **`replace('/patients/dashboard')`** + immediate **`refresh`**.

### Server Actions Needed

#### `createPatient(data)`
- **Input:** Patient form values, `clinicId` from session
- **Validates:** Zod schema (`lib/validators/patient.ts` — to be created)
- **Enforces:**
  - `phone` required; `email` optional
  - Either `dateOfBirth` or `age` (UI); persists `date_of_birth` only (see `docs/08-Business-Rules.md`)
  - `past_history_notes` only when actor is admin/doctor
  - Generates `chartId` using the 10000–99999 range algorithm (see `docs/08-Business-Rules.md §3`)
  - Sets `createdBy = session.userId` (immutable)
  - Sets `clinicId = session.clinicId` (immutable)
  - Sets `is_active = true`
- **Returns:** `{ id }` — after success, client uses **`useDetailExit`** (modal: **`startTransition`** + **`onClose`** + **`refresh`**; full-page: **`replace('/patients/dashboard')`** + immediate **`refresh`**). `revalidatePath` runs in the action.
- **RBAC:** All roles.

---

## 10. Patients Reports — `/patients/reports`

> **Status:** UI built (placeholder only). No reporting backend yet.

---

## 11. Medicines Dashboard — `/medicines/dashboard`

> **Status:** Built — list + filters + `getMedicines` in `lib/actions/medicines.ts` (admin + doctor only).

### Table Columns
| Column | DB Field | Sortable? | Filterable? |
|---|---|---|---|
| Medicine | `name` (+ `brand` subline); **leading icon** from `category` (Lucide mapping in `MedicinesTable`, same flex layout pattern as `InitialsBadge` on patients) | ✓ by name | Search |
| Category | `category` | — | ✓ (select) |
| Last Prescribed | `last_prescribed_date` | ✓ | — |
| Status | `is_active` (`StatusBadge`: Active / Inactive) | — | — |

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
    isActive?:   boolean;  // omit = active + inactive; `true` / `false` = filter to that subset
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
- **RBAC:** Admin and Doctor only (**staff** has no medicines access — routes redirect, actions use `requireRole(session, ["admin", "doctor"])`).

---

## 12. Medicine Detail Modal / Page — `/medicines/view/[id]`

> **Status:** Built — `getMedicineDetail` / CRUD in `lib/actions/medicines.ts` (admin + doctor only; see `lib/permissions.ts`).

### Layout
`MedicineDetailPanel` uses **`DetailPanel`** + **`DetailForm`**:
- **Details tab:** Single scrollable grid of medicine fields (name, identifiers, category, form, dates, description). Tab bar is hidden when this is the only tab.
- **Right column (edit only):** Activity log via `events`. Create mode hides the column (`isCreate`).
- **Footer:** **`DetailPanel`** **`onDelete`** (**Delete Medicine**) is passed **only when the medicine is active**; inactive rows omit it (reactivate via save + **`AlertDialog`** only).
- **Inactive row (`isActive === false`):** Saving opens a Radix **`AlertDialog`** (via `radix-ui`) confirming that the update will **reactivate** the medicine; **Confirm** calls **`updateMedicine`** with **`isActive: true`**, shows the reactivation success toast, then **`exitAfterMutation()`** (same **`useDetailExit`** as other saves — modal dismiss or **`replace('/medicines/dashboard')`**). **Cancel** closes the dialog without saving.
- **After successful save or deactivate:** **`useDetailExit`** (`listHref` **`/medicines/dashboard`**) — **`MedicineViewModalClient`** passes **`onClose`** for the intercepting modal; **`exitAfterMutation`** uses **`startTransition`** for **`onClose`** + **`refresh`**; full-page uses **`replace`** + immediate **`refresh`**. **`createMedicine`**, **`updateMedicine`**, and **`deactivateMedicine`** call **`revalidatePath("/medicines/dashboard")`** on success.

### Server Actions Needed

#### `getMedicineDetail(id)`
- **Input:** `id` (UUID), `clinicId` from session
- **Output:**
  ```ts
  {
    id:                 string;
    name:               string;
    category:           string;
    brand:              string;
    form:               string;
    description:        string | null;
    lastPrescribedDate: string | null;
    isActive:           boolean;
    createdAt:          string;
    createdBy:          string;
    activityLog:        ActivityLogEntry[];  // admin/doctor: first 20 real entries (from getEntityActivity)
    activityLogHasMore: boolean;             // whether more pages exist
  }
  ```
- **Security:** Verify `clinic_id = session.clinicId`.
- **RBAC:** Admin and Doctor only.

#### `updateMedicine(id, data)`
- **Input:** `id`, `UpdateMedicineInput` (from `lib/validators/medicine.ts`), `clinicId` from session
- **Validates:** `{ name, category, brand, form, lastPrescribedDate?, description?, isActive? }` — **`isActive`** may only be the literal **`true`** (reactivation); omit on normal edits
- **Enforces:** `clinicId` and `createdBy` are immutable
- **RBAC:** Admin and Doctor only.

#### `deactivateMedicine(id)` *(soft delete)*
- **Input:** `id`, `clinicId` from session
- **Action:** `SET is_active = false`
- **RBAC:** Admin and Doctor only.

---

## 13. New Medicine Modal / Page — `/medicines/new`

> **Status:** Built — `createMedicine` in `lib/actions/medicines.ts` + `lib/validators/medicine.ts`.

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
- **Input:** `CreateMedicineInput`, `clinicId` from session
- **Validates:** Zod schema in `lib/validators/medicine.ts`
- **Enforces:**
  - Sets `createdBy = session.userId`
  - Sets `clinicId = session.clinicId`
  - Sets `is_active = true`
- **Returns:** `{ id }` — client navigates to `/medicines/view/${id}`
- **RBAC:** Admin and Doctor only.

---

## 14. Medicines Reports — `/medicines/reports`

> **Status:** UI built (placeholder only). No reporting backend yet.

- **RBAC:** `await requirePermission("viewMedicines")` at the top of `page.tsx` (same pattern as other medicines routes).

---

## 15. Cross-Cutting: Document Upload Flow

Patient and appointment detail panels include document upload (`UploadDocumentDialog`) and list (`DocumentCard`). The appointment detail **Documents** tab lists **all** of the patient’s assigned documents (not only rows with `appointment_id` matching the open visit).
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
- **RBAC:** Admin and Doctor only.

#### `confirmDocumentUpload({ fileKey, fileName, fileSize, mimeType, title?, type, assignedToId, assignedToType, appointmentId? })`
- Creates the `documents` record in DB after the S3 upload confirms success
- **Clinic-boundary check:** verifies `assignedToId` belongs to the session `clinicId` before inserting (`patients` table for `"patient"`, `users` table for `"user"`)
- Sets `assignedToType` from the validated input; sets `uploadedBy = session.userId`, `clinicId = session.clinicId`; revalidates patient/appointment detail paths
- **RBAC:** Admin and Doctor only.

#### `getViewPresignedUrl(documentId)`
- Returns a presigned GET URL valid for 60 minutes
- Verifies `clinic_id = session.clinicId` before generating
- **RBAC:** Admin and Doctor only.

#### `deleteDocument(documentId)`
- Deletes S3 object AND the DB record atomically
- If S3 delete fails → abort DB delete
- **RBAC:** Doctor and Admin only.

---

## 16. Cross-Cutting: Activity Log

**Status: Implemented (Phase 1–7 complete).**

The activity log records every meaningful state change (create, update, deactivate, reactivate, delete) across patients, appointments, medicines, and documents. Entries appear in entity detail page sidebars (Phase 6) and the home dashboard (Phase 7).

### Schema (`activity_log` table — `lib/db/schema/activity-log.ts`)

See `docs/03-Database-Schema.md` for full column list and indexes.

### Writer: `appendActivityLog` (`lib/activity-log/`)

Called inside each mutation action **after** the successful DB write, **before** `revalidatePath`. Never throws — errors are caught internally. Import from `@/lib/activity-log` (barrel). See `docs/04-API-Specification.md §Activity Log`.

### Reader: `getEntityActivity` / `getRecentActivity` (`lib/actions/activity-log.ts`)

- `getEntityActivity`: all roles allowed by `requireRole`; gated by **`viewActivityLog`** (`hasPermission`) — admin/doctor only; staff receive `FORBIDDEN`. Returns `ActivityLogEntry[]` + `hasMore` for a specific entity + subscriber fan-out; sensitivity stripping applied server-side.
- `getRecentActivity`: all roles; scoping controlled by **`viewFullActivityLog`** (`hasPermission`) — staff (`!hasPermission`) see only their own actions (`actorId = userId`); admin/doctor see full clinic feed; sensitivity stripping applied.

### Wired into detail actions (Phase 6)

- `getPatientDetail`, `getAppointmentDetail`, `getMedicineDetail`: call `getEntityActivity` after the main entity query; staff path returns `activityLog: []` + `activityLogHasMore: false` and skips the DB read. First page (20 entries) + `hasMore` are included in the SSR response.
- **Detail mappers** (`*-detail-mapper.ts`): pass both `r.activityLog` and `r.activityLogHasMore` through.
- **`DetailSidebar`**: optional `topSlot` (appointment patient summary) + activity log only. Fully wired — `allEntries` state (append-only), `hasMore` state, `pageRef` for stable pagination, `isFetchingRef` guard. `handleLoadMore` (`useCallback([entityType, entityId])`) calls `getEntityActivity({ entityType, entityId, page: pageRef.current + 1 })` and appends. Silent retry on failure.
- **`DetailPanel`**: builds the main-column **`DetailPanelTabs`** (Details + optional Documents / Appointments / Prescriptions); accepts optional **`detailsTabIcon`**, **`documentsTab`**, **`appointmentsTab`**, **`prescriptionsTab`**, `events?`, `hasMoreEvents?`, `entityType?`, `entityId?`, optional **`sidebarTop`** (→ **`DetailSidebar`** **`topSlot`**); forwards log props to **`DetailSidebar`** as **`entries`**, **`initialHasMore`**, **`entityType`**, **`entityId`**. Entity panels supply the entity `.id` + type string + `entity.activityLogHasMore`. **`prescriptionsTab`** is shown only when the node is passed and the user has **`viewPrescriptions`** (appointment panel only in practice).

### Wired into Home Dashboard (Phase 7)

- `app/(app)/home/dashboard/page.tsx`: `getRecentActivity()` added to `Promise.all` alongside `getHomeStats` and `getRecentAppointments`. Returns page-1 entries + `hasMore` from SSR.
- **`HomeDashboardActivityFeed`** (`app/(app)/home/_components/HomeDashboardActivityFeed.tsx`): `"use client"` component; receives `entries` + `initialHasMore` from the server page. Calls `getRecentActivity({ page: n })` client-side for subsequent pages. Same `pageRef` / `isFetchingRef` / `useEffect([entries])` reset pattern as `DetailSidebar`. Staff see only their own actions (enforced server-side in `getRecentActivity`); admin/doctor see full clinic feed.
- **Card + scroll container (in `page.tsx`):** The "Recent Activity" `<section>` (the 1/3-width column in the `lg:grid-cols-3` main grid) wraps `HomeDashboardActivityFeed` in a card div (`background: var(--color-glass-fill-data)`, `border: var(--shadow-card-border)`, `box-shadow: var(--shadow-card)`, `rounded-xl overflow-hidden`) — matching the DataTable card treatment. Inside the card, a `max-height: min(50vh, 480px)` `overflow-y-auto` div constrains the feed height and enables in-card infinite scroll. The scroll container carries the `.scrollbar-hover` class (scrollbar hidden by default, revealed on hover). Padding `p-4` gives entries breathing room from the card edges.

### Sensitive fields (`lib/activity-log/sensitive-fields.ts`)

```ts
{ patient: ["pastHistoryNotes"], appointment: ["notes"] }
```

Sensitivity enforced at read time — raw values are stored in DB, stripped to `{ sensitive: true }` before client receives them.

---

## 17. Schema Gaps — Decision Log

All gaps have been reviewed and resolved as follows:

| Gap | Decision | Status |
|---|---|---|
| `patients.status` — UI had `active/inactive/critical` | **Keep as `is_active boolean`.** UI now maps it to only `active` / `inactive`. "Critical" is fully removed. | ✅ Resolved |
| `medicines.category` — used in UI, missing from DB | **Add `category varchar(100)` to the `medicines` table.** Required before seeding. | ✅ Confirmed — add to schema |
| `medicines.sku` — present in UI, not in DB | **Remove from UI.** SKU is not part of the product. Fully removed from types, mock data, and all components. | ✅ Resolved — removed |
| `audit_log` table — activity log is mock data | **Implemented as `activity_log` table** (`lib/db/schema/activity-log.ts`). Writers in `lib/activity-log/`, readers in `lib/actions/activity-log.ts`. Wired into all mutation actions, detail sidebars (Phase 6), and home dashboard (Phase 7). | ✅ Complete |
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
  Intercepting routes that utilize `ModalShell` to render the view and creation flows for patients over the current dashboard. **View** modal: server `PatientViewModalContent` loads data; client **`PatientViewModalClient`** wraps `PatientDetailPanel` with **`onClose`** (`router.back`) so a successful **Save** dismisses the modal (same pattern as **`NewPatientModalClient`** on create). **`page.tsx`** wraps async content in **`<Suspense>`** with **`ModalDetailPanelBodySkeleton`** (see `docs/06-UI-Design-System.md` §2.1). **New** modal: server `page.tsx` + client inner — no segment `loading.tsx`.

- **`@modal/(.)appointments/view/[id]/`, `@modal/(.)medicines/view/[id]/`**:
  > **Status:** UI built.
  Intercepting routes rendering the edit flows for appointments and medicines within a `ModalShell`, using the same **`ModalShell` + inner `Suspense`** pattern as patient view. Client wrappers **`AppointmentViewModalClient`** and **`MedicineViewModalClient`** pass **`onClose`** (`router.back`) into the detail panel so Save / delete / reactivation-dismiss match patient modal behavior.

---

## 19. URL Reference Summary

| Route | Page | Component | Action(s) |
|---|---|---|---|
| `/home/dashboard` | Home overview | — | `getHomeStats`, `getRecentAppointments`, `getRecentPatients` |
| `/home/reports` | Home Reports | Placeholder | `—` |
| `/appointments/dashboard` | Calendar view | `MonthView`, `TimeGridView` | `getAppointments` |
| `/appointments/new` | New appt form | `AppointmentDetailPanel mode="create"` | `createAppointment`, `searchPatientsForPicker` (client), `getActiveDoctors` |
| `/appointments/reports` | Appt Reports | Placeholder | `—` |
| `/appointments/view/[id]` | Appt detail | `AppointmentDetailPanel mode="edit"` | `getAppointmentDetail`, `getActiveDoctors` (parallel with detail), `updateAppointment`, `deleteAppointment` |
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

- [x] `lib/validators/patient.ts` — exists ✓. Summary for drift checks:
  ```ts
  // Required: firstName, lastName, phone, gender
  // Optional: email, address, bloodGroup, allergies, emergencyContactName, emergencyContactPhone, pastHistoryNotes
  // UI-only on form: age (not persisted). Enforce DOB or age via .refine(hasDobOrAge); server normalizes to date_of_birth.
  ```
- [x] `lib/validators/appointment.ts` — exists ✓. Review against DB schema to confirm field names match column names.
- [x] `lib/validators/medicine.ts` — exists ✓. Already includes `category` and `form`.

### Step 2 — Auth / Session Helper
- [x] `lib/auth/session.ts` exports a real `getSession()` backed by Better-Auth — returns `{ id, clinicId, clinicSubdomain, clinicName, type, firstName, lastName, email }`. Throws `UNAUTHORIZED` if no session, `CLINIC_MISMATCH` if subdomain and user clinic differ.
- [x] Subdomain middleware (`middleware.ts`) resolves `clinicId` via `lib/clinic/resolve-by-subdomain.ts` (`getActiveClinicBySubdomain` / `getClinicIdBySubdomain` — same lookup as `GET /api/clinic`) and forwards `x-clinic-id` / `x-subdomain`. Subdomain parsing is shared with login via `lib/clinic/extract-subdomain-from-host.ts`.

### Step 3 — RBAC Helper
- [x] `lib/auth/rbac.ts` — `ForbiddenError` class + `requireRole(session, allowed[])`. Throws `ForbiddenError` if `session.user.type` is not in `allowed`. All server actions call this before any DB work.

### Step 4 — Shared Supporting Actions (no UI dependency)
- [x] `getActivePatients()` — **`lib/actions/patients.ts`** (bulk list; not used for appointment form preload)
- [x] `searchPatientsForPicker()` — **`lib/actions/patients.ts`** (appointment patient combobox)
- [x] `getActiveDoctors()` — `lib/actions/appointments.ts`
- [x] `appendActivityLog()` — `lib/activity-log/append-activity-log.ts` (fire-and-forget; wired into all mutation actions)

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

**Note:** Appointment create/edit UI is fully wired. `AppointmentDetailPanel` uses `createAppointmentSchema` / `updateAppointmentSchema`. **Doctor** options are fetched on the server per route (`getActiveDoctors` + `loadAppointmentDoctorOptions` / `mapDoctorPickerResults` in `appointments/_lib/appointment-picker-options.ts`). **Patient** (create) uses client-debounced **`searchPatientsForPicker`**; edit mode shows a disabled combobox label from `getAppointmentDetail` (`patientName` + `patientChartId`).
