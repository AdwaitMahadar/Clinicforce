# Clinicforce — AI Agent Guide

## What This Project Is
A multi-tenant Clinic Management System (CMS) for small healthcare practices. Staff-only — no patient portal. Built as a SaaS with column-based multi-tenancy via `clinic_id`.

## Docs Reference
All decisions are documented in `/docs`. Read the relevant doc before starting any task.

| Doc | Read when working on... |
|---|---|
| `01-PRD.md` | Understanding scope, roles, or business logic |
| `02-Tech-Stack.md` | Any library or tooling decision |
| `03-Database-Schema.md` | Anything touching the database |
| `04-API-Specification.md` | Server actions or API routes |
| `05-Authentication.md` | Auth, sessions, or RBAC |
| `06-UI-Design-System.md` | Any UI component or styling work |
| `07-Page-Specifications.md` | Building or modifying a page |
| `08-Business-Rules.md` | Validation, constraints, or edge cases |
| `09-File-Upload-Flow.md` | Document uploads or S3/Minio |
| `10-Development-Phases.md` | What to build next |

## Tech Stack (Quick Reference)
- **Framework:** Next.js 15 App Router, TypeScript strict mode
- **Database:** PostgreSQL + Drizzle ORM
- **Auth:** Better-Auth with Drizzle adapter
- **Validation:** Zod — schemas live in `lib/validators/`, shared between forms and server actions
- **UI:** Shadcn/UI + Tailwind CSS + Lucide icons
- **Tables:** TanStack Table v8 (server-side pagination/filtering always)
- **Calendar:** Shadcn Calendar for date pickers, FullCalendar for time-grid views
- **Forms:** React Hook Form + Zod
- **Toasts:** Sonner
- **URL state:** nuqs
- **File storage:** S3-compatible via AWS SDK v3 (local: Minio)
- **Package manager:** pnpm

## Project Structure
```
app/(app)/          ← Authenticated app (AppShell layout)
app/(auth)/         ← Login/auth pages
components/ui/      ← Shadcn base (do not modify)
components/layout/  ← TopNav, SideNav, AppShell, PageHeader
components/clinic/  ← Domain components (Badge, DataTable, PatientAvatar, etc.)
components/calendar/← Calendar components
lib/db/             ← Drizzle schema + queries
lib/validators/     ← Zod schemas
lib/auth/           ← Better-Auth config
```

## Navigation Model
Two-axis matrix: **top navbar** (entity) × **left sidebar** (view).

- **Top:** Home | Appointments | Patients | Medicines
- **Side:** Dashboard | Reports
- Routes: `/{entity}/{view}` e.g. `/patients/dashboard`, `/appointments/reports`
- Detail views open as **intercepting route modals** (`@modal` parallel routes). Every entity also has a full-page fallback for direct URL access.

## Non-Negotiable Rules

**Database**
- Every query must filter by `clinicId` — no exceptions
- Never expose internal UUIDs in the UI; show `chartId` only
- `clinicId` is resolved server-side from the session, never passed from the client

**UI**
- Use `<Badge />` in `components/clinic/` for all status, type, and ID indicators
- Use `<PageHeader />` at the top of every page
- Use `<DataTable />` for all list views — always server-side mode
- Colours via CSS variables only — no hardcoded hex values in components
- DM Serif Display for page `<h1>` titles only; DM Sans for everything else

**Forms & Validation**
- Zod schemas defined once in `lib/validators/`, used for both form and server-side validation
- Never duplicate validation logic between client and server

**RBAC**
- UI hiding is for UX only — all server actions must enforce role checks independently
- Roles: `admin` | `doctor` | `staff`

**Do not**
- Install UI libraries not listed in this file without checking `02-Tech-Stack.md`
- Modify files in `components/ui/`
- Use client-side filtering or pagination on any list view
- Hardcode `clinicId` or expose UUIDs in URLs