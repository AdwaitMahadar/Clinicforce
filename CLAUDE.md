# Clinicforce — AI Agent Guide

> **This file is the single entry point for any AI agent working on this project.**
> Read this first, then follow the doc pointers for deeper detail on any area.

---

## What This Project Is

**Clinicforce** is a multi-tenant SaaS **Clinic Management System (CMS)** for small healthcare practices. It is **staff-only** — no patient portal. The app centralizes patient records, appointment scheduling, and document management, replacing paper-based workflows.

**Product stage:** Baseline CMS features are **shipped**; the codebase is in **active maintenance and feature expansion** for small clinics (same non-goals until deliberately changed).

**Scope constraints (current):**
- No patient self-service or external-facing portal
- No automated booking or patient notifications
- No prescription/report generation (documents are uploaded, not generated)
- Medicines module remains a reference library (future automation hook)

---

## Documentation Index

Read the relevant doc before working on any area. These are the authoritative sources of truth.

| Doc | Read when working on… |
|---|---|
| `docs/01-PRD.md` | Business logic, user roles, entity definitions, future roadmap |
| `docs/02-Tech-Stack.md` | Library choices, rationale, local dev environment |
| `docs/03-Database-Schema.md` | Schema, table fields, indexes, multi-tenancy isolation pattern |
| `docs/04-API-Specification.md` | Server actions and API route contracts |
| `docs/05-Authentication.md` | Auth flow, sessions, RBAC enforcement |
| `docs/06-UI-Design-System.md` | Navigation model, components, design tokens, routing rules |
| `docs/07-Page-Specifications.md` | Per-page layout and feature requirements |
| `docs/08-Business-Rules.md` | Validation rules, constraints, edge cases |
| `docs/09-File-Upload-Flow.md` | Document upload, S3/Minio presigned URL flow |
| `docs/10-Environments-and-Dev-Workflow.md` | Local/staging/prod, env vars, migrations, seed, hosting |

---

## Tech Stack

| Area | Choice |
|---|---|
| Framework | Next.js 15 App Router, TypeScript strict mode; `pnpm dev` / `pnpm build` use **Turbopack** |
| UI runtime | React 19 |
| Database | PostgreSQL + Drizzle ORM |
| Auth | Better-Auth (Drizzle adapter, database sessions) |
| Validation | Zod 4 — schemas in `lib/validators/`, shared client ↔ server |
| UI Base | Shadcn/UI (Radix) + **Tailwind CSS 4** + Lucide icons |
| Motion / cmdk | Framer Motion (select flows); cmdk (command palette) |
| Tables | TanStack Table v8 — always server-side mode |
| Calendar | Shadcn `<Calendar />` / react-day-picker for date pickers; FullCalendar for time-grid views |
| Forms | React Hook Form + Zod |
| Toasts | Sonner (not Shadcn's built-in toast) |
| URL state | nuqs |
| File storage | S3-compatible via AWS SDK v3 (local dev: Minio via Docker) |
| Package mgr | pnpm |

> See `docs/02-Tech-Stack.md` for rationale and install notes.

---

## Project Structure

```
app/
  (app)/                    ← Authenticated app (AppShell layout)
    layout.tsx              ← AppShell: TopNav + SideNav + main content
    home/dashboard/         ← Clinic overview
    home/reports/           ← Clinic reports
    appointments/dashboard/     ← Appointments calendar (Month/Week/Day views)
    appointments/_components/   ← e.g. AppointmentDetailPanel, AppointmentPatientSummaryCard, AppointmentCalendarClient, combobox
    appointments/_lib/          ← Server helpers (picker options, detail mapper, calendar-range.ts)
    patients/_lib/              ← Server helpers (patient detail mapper)
    medicines/_lib/             ← Server helpers (medicine detail mapper)
    appointments/new/       ← New appointment page
    appointments/reports/   ← Appointments reports
    appointments/view/[id]/ ← Full-page appointment detail (direct URL fallback)
    patients/dashboard/     ← Patient records table
    patients/_components/   ← Patient specific components
    patients/new/           ← New patient page
    patients/reports/       ← Patients reports
    patients/view/[id]/     ← Full-page patient detail
    medicines/dashboard/    ← Medicine library table
    medicines/_components/  ← Medicine specific components
    medicines/new/          ← New medicine page
    medicines/reports/      ← Medicines reports
    medicines/view/[id]/    ← Full-page medicine detail
    @modal/                 ← Intercepting route modals (parallel route)
      (.)appointments/view/[id]/  ← Appointment detail modal
      (.)appointments/new/        ← New appointment modal
      (.)medicines/view/[id]/     ← Medicine detail modal
      (.)medicines/new/           ← New medicine modal
      (.)patients/view/[id]/      ← Patient detail modal
      (.)patients/new/            ← New patient modal
  (auth)/
    login/page.tsx              ← Server Component: host → subdomain → clinic branding props
    login/login-page-client.tsx ← Client: split layout, form, carousel

components/
  ui/                       ← Shadcn base components — DO NOT MODIFY
  layout/                   ← AppShell.tsx, TopNav.tsx, SideNav.tsx, PageHeader.tsx, DetailPageShell.tsx
  common/                   ← Domain components (see below)

lib/
  hooks/                    ← Client hooks shared by feature code (e.g. `use-detail-exit.ts` — post-mutation navigation for entity detail panels)
  constants/                ← Shared `as const` enum lists (no Zod) — wired into Drizzle pgEnum, Zod, and `types/`; includes `sidebar.ts` (`sidebar-collapsed` cookie for `SideNav`), `app.ts` (`DEFAULT_PAGE_SIZE`), and `appointment.ts` (`DEFAULT_APPOINTMENT_DURATION_MINUTES`)
  db/                       ← Drizzle schema + query functions
  validators/               ← Zod schemas (shared between forms and server actions); `common.ts` exports `idSchema` + `n()` helper (reused by all entity action files)
  auth/                     ← Better-Auth config; `session-context.tsx` — `AppSessionProvider` + `useAppSession()` + `usePermission()` client hooks (no extra server calls); `require-permission.ts` — `requirePermission(permission, redirectTo?)` server-side page guard (calls `getSession()` + `hasPermission()`, redirects if unauthorised, returns session)
  permissions.ts            ← `PERMISSIONS` map + `Permission` type + `hasPermission(role, permission)` — single source of truth for all UI role decisions; consumed by `usePermission` and `<RoleGate>`
  utils/                    ← `chart-id.ts` — `formatChartId(value, entityType)` plus `formatPatientChartId` / `formatStaffChartId`; `'medicine'` / `'user'` prefixes exist for `formatChartId` but **medicines have no `chart_id` in DB** — use chart formatting for patients and staff only in practice
  appointment-calendar-styles.ts ← CATEGORY_COLORS / CATEGORY_LABELS for calendar (DB `appointment_category`); `formatAppointmentHeading` in `lib/utils/format-appointment-heading.ts`

types/                      ← UI/view-model TypeScript types (patient, appointment, medicine, home)
```

**`components/common/` inventory (what's built):**
- `DataTable.tsx` — TanStack Table v8, server-side list data; padded headers/cells + `first:pl-8` / `last:pr-8` on edge columns; sort toggle on label/icon only; route `loading.tsx` for skeletons (not an `isLoading` prop on the table)
- `TableFilterBar.tsx` — Notion-style collapsible filter panel with column/value selectors
- `TablePagination.tsx` — Reusable pagination footer
- `StatusBadge.tsx` — Unified badge for appointment status, patient status, types, chart IDs
- `InitialsBadge.tsx` — Deterministic initials avatar (hashed colour from ID)
- `ClinicBrandMark.tsx` — Clinic logo as CSS `background-image` over `InitialsBadge` (sidebar + login)
- `AppointmentEventCard.tsx` — FullCalendar custom event renderer
- `MonthView.tsx` — Custom two-panel month layout for appointments
- `TimeGridView.tsx` — FullCalendar timeGridWeek/timeGridDay wrapper
- `StatCard.tsx` — Metric summary card
- `EventLog.tsx` — Activity/audit log list component
- `DetailForm.tsx` — RHF + Zod field-driven form: required `fields` array (single scrollable 2-column grid); `forwardRef` + `DetailFormHandle` (`submit` / `reset`); optional **`insideForm`** slot (same `<Form>` context — `useFormContext` for cross-field logic); Radix `<Select>` is controlled (`value` + remount `key`); optional **`TextField.prefix`** (e.g. fee `₹`) and **`TextField.readOnly`** (normal appearance, not editable — staff fee). No footer — parent uses `DetailPanel` or composes actions.
- `DetailPanel.tsx` — Shell for detail modals/pages: header; main-column **`DetailPanelTabs`** (Details + optional Documents/Appointments, Framer sliding tab underline; optional **`detailsTabIcon`**); fixed-width right **`DetailSidebar`** (`min(26.25rem, 36vw)` max **390px**, width taken from the `flex-1` main column, not from **`modal-shell-sizes`**); optional **`sidebarTop`** → sidebar **`topSlot`** (appointment **`AppointmentPatientSummaryCard`**); activity log via **`events`** / pagination props; footer (Save / Cancel / optional delete via **`formRef.submit()`**). Entity panels pass **`documentsTab`** / **`appointmentsTab`** node props when applicable. Right column hidden when `isCreate=true` OR when user lacks **`viewDetailSidebar`** — computed internally via **`usePermission`**.
- `DetailPanelTabs.tsx` — Tab strip + active panel body used inside **`DetailPanel`**; hides when a single tab; **`resetKey`** resets to **Details**; Framer **`layoutId`** underline.
- `DetailSidebar.tsx` — Right column: optional **`topSlot`** + activity log; with **`topSlot`**, vertical **40% / 60%** split (`grid` **2fr / 3fr**), top region scrolls on overflow; without **`topSlot`**, log fills height. Same **`getEntityActivity`** pagination pattern as before.
- `ModalShell.tsx` — Intercepting modal wrapper on shadcn `Dialog` / Radix (`modal-shell-sizes.ts` — shared width/height presets with modal skeletons; focus trap + scroll lock via Radix)
- `DocumentMimeTypeIcon.tsx` — PDF / image / generic file icon from MIME (shared with `DocumentCard`, `UniversalSearch`)
- `DocumentCard.tsx` — Document row; opens presigned GET in a new tab; admin/doctor (`uploadDocument`) get top-right inline delete (circle → red pill, `deleteDocument`, Framer Motion + `nav-motion` springs)
- `DocumentsTab.tsx` — Detail panel Documents tab: 2-column `DocumentCard` grid, ink **Upload** + `UploadDocumentDialog` (`patientId`, optional `appointmentId` for upload metadata); used by patient and appointment detail panels
- `AppointmentListTab.tsx` — Detail panel appointments list: `PatientAppointment` cards on `var(--color-surface)`, navigate to `/appointments/view/[id]`; optional `currentAppointmentId` → **Current** badge + blue border (appointment detail only)
- `UniversalSearch.tsx` — Dialog + cmdk command palette; debounced `searchGlobal`, grouped results; Medicines group `usePermission("viewMedicines")`; Documents group + presigned open `usePermission("viewDocuments")`; other entities use `router.push` (wired from `TopNav`, ⌘/Ctrl+K)
- `AsyncSearchCombobox.tsx` — Popover + cmdk `Command` with `shouldFilter={false}`; debounced async `fetchItems(query)`; scroll-capped list; `modal={false}` for nested dialogs; first use: appointment patient field via `AppointmentPatientCombobox` + `searchPatientsForPicker`
- `UploadDocumentDialog.tsx` — Presigned PUT upload + `confirmDocumentUpload` metadata
- `PanelCloseButton.tsx` — Shared X close button for all detail panels (Lucide X, CSS hover); replaces per-panel inline `CloseButton` implementations
- `ModalCloseButton.tsx` — Shared dialog/modal close control where a distinct control from `PanelCloseButton` is needed
- `ReportsComingSoon.tsx` — Placeholder used by all four Reports pages; accepts `title` + `subtitle` props
- `RoleGate.tsx` — Declarative permission gate: `<RoleGate permission="...">` renders children when the current user holds the permission, `fallback` (default `null`) otherwise; uses `usePermission` from `lib/auth/session-context`
- `skeletons/` — Route `loading.tsx` building blocks (`PageHeaderSkeleton`, `TableDashboardSkeleton`, …, `DetailPageSkeleton`); **`ModalDetailPanelBodySkeleton`** for intercept modal inner **`Suspense`** fallbacks (tab-strip + form + right column widths mirror **`DetailPanel`** when **`viewDetailSidebar`**); **`ModalDetailSkeleton`** for rare full-modal + backdrop loading (`size` / `variant`)

---

## Navigation Model

Two-axis matrix: **top navbar** (entity/domain) × **left sidebar** (view within domain).

- **Top nav:** Home | Appointments | Patients | Medicines (**Medicines** hidden for **staff** — `usePermission("viewMedicines")` in `TopNav.tsx`)
- **Side nav:** Dashboard | Reports
- **Active state:** Driven by `usePathname()` — never managed manually
- **Active item rule:** Only the active top-nav item shows its label; inactive items show icon only

Routes follow `/{entity}/{view}` — all static segments. Root `/` redirects to `/home/dashboard`.

Detail records open as **intercepting route modals** (`@modal` parallel routes). Every entity also has a full-page fallback for direct URL / refresh access.

Patient and medicine **dashboard** tables pass **`onRowClick`** to `<DataTable />` so a row navigates to `/patients/view/[id]` or `/medicines/view/[id]` (soft navigation opens the modal). The patients list adds a rightmost **actions** column (view always; new appointment with URL prefill **only for active patients**) and uses **`InitialsBadge`** before the name; **patient** detail supports **deactivate** (`deactivatePatient`) and **reactivate-on-save** (`updatePatient` + `isActive: true`, Radix **AlertDialog** like medicines); the medicines list uses a **category-mapped Lucide icon** in a neutral rounded square (`MedicinesTable`, same flex layout pattern). Entity **detail/create** flows use **`DetailPanel`** + **`DetailForm`**; Save / Cancel sit in the **panel footer** (submit via `formRef`). After successful **save**, **delete/deactivate**, or (medicines) **reactivation confirm**, detail panels call **`useDetailExit`** (`lib/hooks/use-detail-exit.ts`): **intercepting modals** pass **`onClose`** (`router.back()` via `*ViewModalClient` / `New*ModalClient`); **`exitAfterMutation`** wraps **`onClose`** and **`router.refresh()`** in React **`startTransition`** so navigation and refresh coordinate; **full-page** routes use **`router.replace`** to the entity dashboard + immediate **`router.refresh()`**. List mutations use **`revalidatePath`** on the entity dashboard in server actions (patients/medicines/appointments) so RSC cache stays aligned.

**CRITICAL — `/view/[id]` routing pattern:** Detail routes MUST use `/view/[id]` (e.g. `/appointments/view/abc-123`), never a bare `/[id]` (e.g. `/appointments/abc-123`). A bare `[id]` is a dynamic segment that matches ANY string — including `dashboard`, `new`, and `reports` — causing the `@modal` interceptor to match nav-bar clicks and freeze the page. The `/view/` sub-segment creates a separate namespace that can never conflict with static nav segments.

---

## Core Business Rules & Constraints

### Multi-Tenancy
- Every DB table has a `clinic_id` foreign key — **every query must filter by `clinicId`**
- `clinicId` is resolved server-side from the session — never passed from the client
- `clinicId` is never exposed in URLs or client state

### Identification
- In lists and labels, prefer **chart ids** for **patients** and **staff** (`#PT-…`, `#STF-…`); do not surface raw UUIDs as the primary identifier in the UI.
- Numeric `chartId` is unique per **entity type** per clinic for **users** and **patients** (medicines have no chart id column).

### RBAC
- Three roles: `admin` | `doctor` | `staff`
- UI hiding is for UX only — all server actions must enforce role checks independently
- See `docs/01-PRD.md` for the full permission matrix
- **Medicines — staff excluded:** nav tab hidden (`usePermission("viewMedicines")`); all medicines **`page.tsx`** routes use **`requirePermission("viewMedicines")`** (including **reports**); server actions use `requireRole(session, ["admin", "doctor"])`; **`searchGlobal`** skips medicines query for staff (`medicines: []`); **`UniversalSearch`** hides Medicines group via `viewMedicines`
- **Clinical notes / patient past history — staff excluded:** `AppointmentDetailPanel` filters appointment `notes`; `PatientDetailPanel` filters `pastHistoryNotes` when `usePermission("viewClinicalNotes")` is false. Patient/appointment server actions also redact or ignore these fields for staff (see `docs/05-Authentication.md`).
- **Appointment title — staff excluded:** `usePermission("viewAppointmentTitle")` gates the Title field in `AppointmentDetailPanel`. **`createAppointment`** / **`updateAppointment`** ignore `title` for staff; read actions (**`getAppointmentDetail`**, **`getAppointments`**, **`getPatientDetail`** nested appointments, **`searchGlobal`**, **`getRecentAppointments`**) return **`title: null`** for staff without changing the DB (see `docs/05-Authentication.md`).
- **Detail right column + main-column Documents/Appointments tabs — staff excluded:** `DetailPanel` hides the right sidebar and suppresses Documents/Appointments tab props via `usePermission("viewDetailSidebar")` (staff see Details-only, tab bar hidden). View modals use `size="lg"` for staff (narrower, form-only)
- **Documents — staff excluded:** `viewDocuments` / `uploadDocument` are admin/doctor only. **`getUploadPresignedUrl`**, **`confirmDocumentUpload`**, **`getViewPresignedUrl`** use `requireRole(session, ["admin", "doctor"])`. **`getPatientDetail`** / **`getAppointmentDetail`** return empty document lists for staff; **`searchGlobal`** skips the documents query for staff. **`UniversalSearch`** hides the Documents group via `usePermission("viewDocuments")` (see `docs/05-Authentication.md`).

### Appointments
- Status enum: `scheduled | completed | cancelled | no-show`
- Category enum: `general | orthopedic | physiotherapy`; visit type enum: `general | first-visit | follow-up-visit` (DB `visit_type`; form/API key `visitType`)
- Tracks scheduled start as `scheduled_at` (single timestamp), optional actual visit time (`actual_check_in` — UI time-only, server uses server calendar day), `duration` (minutes), and optional nullable **`fee`** (`numeric(10,2)` — UI displays with ₹ via `formatAppointmentFeeInr`). **Staff:** fee hidden on create; on edit, fee field + header fee only when **`status === completed`**, field **`DetailForm` `readOnly`** (not disabled styling). **Edit mode:** entering a positive fee from empty/zero auto-sets status to **completed** + Sonner toast (not on create; staff only see the fee field when already completed, so they do not trigger this path).
- **`AppointmentDetailPanel` (edit):** **Documents** tab lists all patient-assigned documents (`getDocumentsByAssignment`); upload still passes `appointmentId`. **Appointments** tab lists the patient’s active visits (`getPatientAppointmentSummaries`); current row is highlighted; rows navigate to `/appointments/view/[id]`. **Sidebar** shows **`AppointmentPatientSummaryCard`** (patient snapshot from **`getAppointmentDetail`**) above the activity log.

### Documents
- Can attach to a patient or a user, optionally linked to an appointment
- Stored via S3 presigned URLs — metadata in DB, file in object storage
- **Staff** cannot upload, open, or search documents (server + `PERMISSIONS`); Documents/Appointments tabs and the document/activity right column are absent for staff via `viewDetailSidebar`

---

## UI Rules (Non-Negotiable)

- **All colours via CSS variables** — no hardcoded hex values anywhere in components. Variables defined in `app/globals.css`
- **Typography:** DM Serif Display for `<h1>` page titles only; DM Sans for everything else
- **`<PageHeader />`** at the top of every page — no one-off headers
- **Main content width:** Full-page routes under `app/(app)/` wrap primary content in **`max-w-[1700px] mx-auto w-full`** inside the page shell (`p-8` / flex height); height-filling pages add **`flex-1 min-h-0`** on that inner wrapper. See `docs/06-UI-Design-System.md` §2.2. `@modal` routes use `ModalShell` only. Appointments calendar: `p-8` on `appointments/dashboard/page.tsx` only — not on `AppointmentCalendarClient` root.
- **`<DataTable />`** for all list views — always server-side pagination/filtering
- **`<StatusBadge />`** for all status, type, and ID indicators — no inline badge styles
- **Forms** always use React Hook Form + a Zod schema from `lib/validators/`
- **Toasts** via Sonner only
- **URL state** via `nuqs`
- Do not modify anything in `components/ui/`
- Do not install unlisted UI libraries without checking `docs/02-Tech-Stack.md`

### Design Tokens (quick ref)
```
Background:   --bg #F0EEE6  |  Surface: --surface #FAFAF7  |  Border: --border #E2DDD4
Text:         --text-primary #1A1A18  |  --text-secondary #7A7769  |  --text-muted #A8A395
Accent:       --green #2D9B6F  |  --amber #D97706  |  --red #DC2626  |  --blue #2563EB
```
Full token list and component specs → `docs/06-UI-Design-System.md`

---

## Documentation Sync Rule

Whenever you make a code change that affects a schema, component, enum, 
business rule, auth flow, or any other documented pattern — you MUST use 
the `sync-docs-and-skills` skill before closing the task.

This applies to every change, no matter how small. A one-line enum change 
can affect multiple skills simultaneously.

Skill location: `skills/sync-docs-and-skills/SKILL.md`

## Data Fetching Rules

- All data fetching via **Next.js Server Actions** or Route Handlers — no direct DB calls from client components
- Server-side pagination, filtering, and sorting for every list view — client never holds full datasets
- `page`, `pageSize`, `search`, `sort`, and entity filters go in URL search params (via `nuqs`) — state is shareable and refresh-safe
- Always show `<Skeleton />` rows while loading — never an empty table on initial load

---

## What's Built vs. Planned

**Built:**
- Full app shell (TopNav, SideNav, AppShell, PageHeader) with matrix navigation
- Home dashboard (metrics/overview)
- Patients dashboard with DataTable, TableFilterBar (Notion-style), TablePagination
- Appointments dashboard with Month, Week, and Day calendar views
- Medicines dashboard
- All shared components in `components/common/`
- Design system: CSS variables, typography, colour tokens fully centralised in `globals.css`
- Intercepting modal routes for detail views
- Authentication: Better-Auth integration, real `getSession()` (React `cache()` — one resolution per request), subdomain-aware middleware (Node runtime, in-memory subdomain→clinic cache + shared `lib/clinic/resolve-by-subdomain` on miss), `/api/auth/*` route handler, `/api/clinic` subdomain resolver; session `cookieCache` (5 min) reduces auth DB hits
- Login (`app/(auth)/login/page.tsx` + `login-page-client.tsx`) — server-resolved tenant name + logo URL from host subdomain (`extractSubdomainFromHost`, `getActiveClinicBySubdomain`, `buildClinicLogoPublicUrl`); split 50/50 layout, `ClinicBrandMark` on the right when resolved; `public/clinicforce-mark.png` in Clinicforce rows; testimonial carousel (dots + auto-advance); password visibility toggle; dynamic footer year; React Hook Form + Zod in client; Sonner toasts; `returnUrl` redirect; client submit **`await`s `signIn.email`** and handles **`{ data, error }`** (not `fetchOptions.onError` alone) so failed sign-in still surfaces toasts when the API returns 200 without a `user`
- RBAC: `ForbiddenError` + `requireRole()` in `lib/auth/rbac.ts`, enforced in all server actions
- Document upload: presigned URLs (`lib/actions/documents.ts` — admin/doctor only), shared S3 client (`lib/storage/s3-client.ts`), `DocumentCard` + `UploadDocumentDialog` on patient and appointment detail (sidebar; staff use neither)

**Not yet built (planned):**
- All **Reports** views (placeholder UI only; no analytics backend yet)
- **Home** “Recent activity” / global **audit log** (UI shell `EventLog` exists; data is empty until an `audit_log` table and actions exist)

> Environments, migrations, seed, and hosting → `docs/10-Environments-and-Dev-Workflow.md`

---

## Do Not

A final checklist — these are the most common mistakes to avoid:

- **Do not** query the database without filtering by `clinicId`
- **Do not** pass or store `clinicId` on the client — resolve it server-side from the session
- **Do not** expose raw UUIDs in URLs or the UI — show `chartId` only
- **Do not** hardcode hex colour values in any component — use CSS variables from `globals.css`
- **Do not** modify files in `components/ui/` — compose from them, don't edit them
- **Do not** install a UI library not listed in `docs/02-Tech-Stack.md`
- **Do not** build ad-hoc tables — use `<DataTable />` from `components/common/`
- **Do not** create one-off page headers — use `<PageHeader />` from `components/layout/`
- **Do not** define Zod schemas inline in components or actions — they live in `lib/validators/`
- **Do not** implement client-side filtering, sorting, or pagination — always server-side
- **Do not** rely on UI hiding alone for access control — server actions must enforce roles too
- **Do not** create intercepting modal routes at `@modal/(.)entity/[id]` — use `@modal/(.)entity/view/[id]` instead. A bare `[id]` segment matches static nav paths like `dashboard`, causing the interceptor to fire on TopNav clicks and break navigation entirely.