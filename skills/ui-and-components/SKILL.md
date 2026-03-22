---
name: ui-and-components
description: Context-routing skill for frontend development. You MUST use this skill whenever building pages, modifying components, implementing navigation, styling UI elements, or wiring up forms. It provides the design tokens, component inventory, routing patterns, and UI constraints essential for Clinicforce frontend work.
---

# UI and Components Skill

This skill provides critical frontend rules, design tokens, and routing patterns for the Clinicforce application. Follow these instructions closely to maintain consistency.

## 🎨 Design Tokens & UI Rules

**Never hardcode hex values.** Always use the following CSS variables defined in our design system (`globals.css`):

*   **Backgrounds**: `--bg` (App background), `--surface` (Cards/Nav), `--surface-alt` (Hover states, inputs)
*   **Borders**: `--border`
*   **Text**: `--text-primary` (Headings/Body), `--text-secondary` (Labels), `--text-muted` (Placeholders)
*   **Accents**: `--green`, `--amber`, `--red`, `--blue`, `--purple` (Each has a matching `--[color]-bg` variant)

**Typography Rules:**
*   **DM Serif Display**: Use ONLY for `<h1>` page titles and the brand name.
*   **DM Sans**: Use for EVERYTHING else (body, labels, buttons, tables).
*   **Monospace**: Use for Chart IDs (e.g., `#PT-8821`).

**Forms & State:**
*   Always use **React Hook Form + Zod**. Schemas must be imported from `lib/validators/`.
*   Use **nuqs** for managing URL state (pagination, search, filters) instead of `URLSearchParams`.
*   Use **Sonner** for toasts (never Shadcn's default toast).

## 🧩 Component Inventory

**Route loading:** Colocate `loading.tsx` with `page.tsx` under `app/(app)/`; use Shadcn `Skeleton` and `components/common/skeletons/*` so fallbacks match each page layout (tables, home stats, calendar, detail/modal).

Reuse existing components instead of building ad-hoc solutions. 

**Domain Components (`components/common/` & `components/clinic/`)**
*   `<DataTable />` - Universal table (always server-side pagination, pass `isLoading` for skeletons).
*   `<SearchFilterBar />` / `<TableFilterBar />` - Notion-style search and filter row.
*   `<TablePagination />` - Reusable pagination footer.
*   `<Badge />` / `<StatusBadge />` - Unified badge for statuses, types, and chart IDs. Appointment statuses: `scheduled` | `completed` | `cancelled` | `no-show` (see `components/common/StatusBadge.tsx`).
*   `<PatientAvatar />` / `<InitialsBadge />` - Deterministic initials avatar.
*   `<PageHeader />` - Title block for *every* page.
*   `<EventLog />` - Activity log list.
*   `<DocumentMimeTypeIcon />` - MIME-based file icon (PDF / image / generic); used in `<DocumentCard />` and `<UniversalSearch />`.
*   `<DocumentCard />` / `<UploadDocumentDialog />` - Patient/appointment document list + presigned upload (see `skills/file-upload/SKILL.md`).
*   `<UniversalSearch />` - TopNav command palette (`Dialog` + cmdk `Command`); `searchGlobal` + document `getViewPresignedUrl`; ⌘/Ctrl+K.
*   `<DetailForm />` - Generic field-driven form panel supporting flat and sectioned modes.
*   `<ModalShell />` - Universal modal envelope used for intercepting route modals.
*   **Calendar**: `<MonthView />`, `<TimeGridView />`, `<AppointmentEventCard />` — appointment type colours/labels: `lib/appointment-calendar-styles.ts` (not the DB enum; display superset in `@/types/appointment`).

**Layouts (`components/layout/`)**
*   `<AppShell />`, `<TopNav />`, `<SideNav />`, `<NavItem />`. `SideNav` gets `userDisplayName` / `userTypeLabel` from `(app)/layout` (`getSession()` + `USER_TYPE_LABELS` in `lib/constants/user.ts`); account menu uses Better Auth `signOut` → `/login`.

## 🧭 Navigation & Routing Rules

**The Matrix Model:** Top Nav (Entity) × Side Nav (View). Routes use static segments: `/{entity}/{view}` (e.g., `/patients/dashboard`).
*   **Active State**: Driven strictly by `usePathname()`. Never manage manually.

**🚨 CRITICAL: The `/view/[id]` Pattern 🚨**
Detail records MUST use `/view/[id]` (e.g., `/appointments/view/123`), NEVER a bare `/[id]` (e.g., `/appointments/123`). 
*Why?* The App Router intercepting route `(.)[id]` matches any string, including static segments like `dashboard` or `new`. This will intercept standard navbar clicks, freezing the app. The `/view/` subpath prevents namespace collisions.

## 📄 Per-Page Requirements (Summary)

*   **Login (`/login`):**
    *   Split 50/50 layout — left brand panel (hidden mobile), right form panel.
    *   Client component. React Hook Form + Zod. Sonner toasts on error.
    *   `signIn.email()` from `lib/auth/client.ts`. Redirects to `?returnUrl` or `/home/dashboard` on success.
    *   No OAuth buttons. No "Request access" link. `rememberMe` checkbox wired to form.
*   **Home**: 
    *   `/dashboard`: High-level stats, recent appointments, recent patients.
    *   `/reports`: Placeholder view.
*   **Appointments**: 
    *   `/dashboard`: Calendar views (Month/Week/Day).
    *   `/new` & `/view/[id]`: 3-column detail layout (Primary Form | Notes & Docs | Activity Log).
    *   `/reports`: Placeholder view.
*   **Patients**: 
    *   `/dashboard`: DataTable (Search by name/chart_id, filter by Last Dr. / Status); row click → `/patients/view/[id]` (intercepting modal).
    *   `/new` & `/view/[id]`: 3-column detail layout (Personal Info | Tabbed Docs/Appts | Notes & Log). After successful `createPatient`, modal closes via `back` + `refresh`; full-page new route pushes to `dashboard`. New-patient form submit controls stay inside `<form>`.
    *   `/reports`: Placeholder view.
*   **Medicines**: 
    *   `/dashboard`: DataTable (Search by name, filter by category/form); row click → `/medicines/view/[id]` (intercepting modal).
    *   `/new` & `/view/[id]`: 2-column detail layout (Form | Activity Log).
    *   `/reports`: Placeholder view.

Forms and detail views (`/new`, `/view/[id]`) render as **Intercepting Modals** (`@modal/(.)[entity]/...` parallel routes) inside a `<ModalShell />` with a full-page fallback for direct URL access, sharing logic via entity-specific `_components/` directories.

## ❌ DO NOT

*   **Do not hardcode colors.** Always use the CSS variables.
*   **Do not use bare `/[id]` for detail routes.** Always use `/view/[id]`.
*   **Do not build custom list tables.** Always use `<DataTable />`.
*   **Do not make one-off page headers.** Always use `<PageHeader />`.
*   **Do not define Zod schemas inline.** Import them from `lib/validators/`.
*   **Do not modify Shadcn UI components directly** in `components/ui/`.
*   **Do not implement client-side data tables.** The client never holds the full dataset. Pagination and filtering must be handled via URL state + Server Actions.
*   **Do not use Shadcn's default toast.** Use Sonner.

## 📚 References
For deeper implementation details, consult the canonical documentation:
- `docs/06-UI-Design-System.md` - Complete design tokens, components, and matrix routing logic.
- `docs/07-Page-Specifications.md` - Full URL schemas, exact layout column sizings, and action requirements.
- `CLAUDE.md` - Project architecture and high-level rules.
