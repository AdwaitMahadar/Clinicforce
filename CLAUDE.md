# Clinicforce — AI Agent Guide

> **This file is the single entry point for any AI agent working on this project.**
> Read this first, then follow the doc pointers for deeper detail on any area.

---

## What This Project Is

**Clinicforce** is a multi-tenant SaaS **Clinic Management System (CMS)** for small healthcare practices. It is **staff-only** — no patient portal. The app centralizes patient records, appointment scheduling, and document management, replacing paper-based workflows.

**Scope constraints (MVP):**
- No patient self-service or external-facing portal
- No automated booking or patient notifications
- No prescription/report generation (documents are uploaded, not generated)
- Medicines module is a reference library only (future automation hook)

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
| `docs/10-Development-Phases.md` | Build order and current progress |

---

## Tech Stack

| Area | Choice |
|---|---|
| Framework | Next.js 15 App Router, TypeScript strict mode |
| Database | PostgreSQL + Drizzle ORM |
| Auth | Better-Auth (Drizzle adapter, database sessions) |
| Validation | Zod — schemas in `lib/validators/`, shared client ↔ server |
| UI Base | Shadcn/UI (Radix) + Tailwind CSS + Lucide icons |
| Tables | TanStack Table v8 — always server-side mode |
| Calendar | Shadcn `<Calendar />` for date pickers; FullCalendar for time-grid views |
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
    appointments/dashboard/ ← Appointments calendar (Month/Week/Day views)
    patients/dashboard/     ← Patient records table
    medicines/dashboard/    ← Medicine library table
    [entity]/[id]/          ← Full-page entity detail (direct URL fallback)
    @modal/                 ← Intercepting route modals (parallel route)
  (auth)/
    login/page.tsx

components/
  ui/                       ← Shadcn base components — DO NOT MODIFY
  layout/                   ← AppShell.tsx, TopNav.tsx, SideNav.tsx, NavItem.tsx, PageHeader.tsx
  common/                   ← Domain components (see below)

lib/
  db/                       ← Drizzle schema + query functions
  validators/               ← Zod schemas (shared between forms and server actions)
  auth/                     ← Better-Auth config

mock/                       ← Mock data for UI development
```

**`components/common/` inventory (what's built):**
- `DataTable.tsx` — TanStack Table v8, server-side mode, with skeleton loading
- `TableFilterBar.tsx` — Notion-style collapsible filter panel with column/value selectors
- `TablePagination.tsx` — Reusable pagination footer
- `StatusBadge.tsx` — Unified badge for appointment status, patient status, types, chart IDs
- `InitialsBadge.tsx` — Deterministic initials avatar (hashed colour from ID)
- `AppointmentEventCard.tsx` — FullCalendar custom event renderer
- `MonthView.tsx` — Custom two-panel month layout for appointments
- `TimeGridView.tsx` — FullCalendar timeGridWeek/timeGridDay wrapper
- `StatCard.tsx` — Metric summary card
- `EventLog.tsx` — Activity/audit log list component

---

## Navigation Model

Two-axis matrix: **top navbar** (entity/domain) × **left sidebar** (view within domain).

- **Top nav:** Home | Appointments | Patients | Medicines
- **Side nav:** Dashboard | Reports
- **Active state:** Driven by `usePathname()` — never managed manually
- **Active item rule:** Only the active top-nav item shows its label; inactive items show icon only

Routes follow `/{entity}/{view}` — all static segments. Root `/` redirects to `/home/dashboard`.

Detail records open as **intercepting route modals** (`@modal` parallel routes). Every entity also has a full-page fallback for direct URL / refresh access.

---

## Core Business Rules & Constraints

### Multi-Tenancy
- Every DB table has a `clinic_id` foreign key — **every query must filter by `clinicId`**
- `clinicId` is resolved server-side from the session — never passed from the client
- `clinicId` is never exposed in URLs or client state

### Identification
- Never show raw UUIDs in the UI — use `chartId` only
- `chartId` is unique per entity per clinic

### RBAC
- Three roles: `admin` | `doctor` | `staff`
- UI hiding is for UX only — all server actions must enforce role checks independently
- See `docs/01-PRD.md` for the full permission matrix

### Appointments
- Status enum: `pending | completed | cancelled | no-show`
- Type enum: `general | follow-up | emergency`
- Tracks both scheduled time and actual check-in/check-out for audit

### Documents
- Can attach to a patient or a user, optionally linked to an appointment
- Stored via S3 presigned URLs — metadata in DB, file in object storage

---

## UI Rules (Non-Negotiable)

- **All colours via CSS variables** — no hardcoded hex values anywhere in components. Variables defined in `app/globals.css`
- **Typography:** DM Serif Display for `<h1>` page titles only; DM Sans for everything else
- **`<PageHeader />`** at the top of every page — no one-off headers
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

## Data Fetching Rules

- All data fetching via **Next.js Server Actions** or Route Handlers — no direct DB calls from client components
- Server-side pagination, filtering, and sorting for every list view — client never holds full datasets
- `page`, `pageSize`, `search`, `sort`, and entity filters go in URL search params (via `nuqs`) — state is shareable and refresh-safe
- Always show `<Skeleton />` rows while loading — never an empty table on initial load

---

## What's Built vs. Planned

**Built:**
- Full app shell (TopNav, SideNav, AppShell, PageHeader) with matrix navigation
- Patients dashboard with DataTable, TableFilterBar (Notion-style), TablePagination
- Appointments dashboard with Month, Week, and Day calendar views
- All shared components in `components/common/`
- Design system: CSS variables, typography, colour tokens fully centralised in `globals.css`

**Not yet built (planned):**
- Home dashboard (metrics/overview)
- Medicines dashboard
- All Reports views
- Intercepting modal routes for detail views
- Server actions and real DB integration (currently using mock data)
- Authentication / Better-Auth integration
- Document upload flow (S3/Minio)

> For build order and phase breakdown → `docs/10-Development-Phases.md`

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