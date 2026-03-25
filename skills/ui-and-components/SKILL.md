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
*   **Monospace**: Use for Chart IDs (`#PT-…` patients, `#STF-…` staff/users). Format with `formatPatientChartId` / `formatStaffChartId` from `lib/utils/chart-id.ts` — never hand-roll prefixes in components.

**Forms & State:**
*   Always use **React Hook Form + Zod**. Schemas must be imported from `lib/validators/`.
*   Use **nuqs** for managing URL state (pagination, search, filters) instead of `URLSearchParams`. Always use **`useQueryStates`** to natively batch simultaneous URL parameter updates (like calendar `view` and `date`) to prevent Server Component flicker.
*   Use **Sonner** for toasts (never Shadcn's default toast).

## 🧩 Component Inventory

**Route loading:** Colocate `loading.tsx` with `page.tsx` under `app/(app)/`; use Shadcn `Skeleton` and `components/common/skeletons/*` so fallbacks match each page layout (tables, home stats, calendar, detail/modal). Skeletons that mirror full-page shells use the same **`max-w-[1700px] mx-auto w-full`** inner wrapper as §2.2 in `docs/06-UI-Design-System.md`. Intercepting **create** modals: `ModalDetailSkeleton` with **`size="lg"`** + **`variant="create"`**; **view/edit** modals: default **`ModalDetailSkeleton`** (**`xl`** / **`detail`**).

Reuse existing components instead of building ad-hoc solutions. 

**Domain Components (`components/common/` & `components/clinic/`)**
*   `<DataTable />` — TanStack v8 list table: cell padding `px-4 py-3`, headers `px-4`, outer columns `first:pl-8 last:pr-8` for edge inset; sort handler on inner label+icon span only (not full header cell). Spacing is set in `DataTable` via `className` — do not edit `components/ui/table.tsx`. Initial load: route `loading.tsx` skeletons — no `isLoading` on DataTable.
*   `<SearchFilterBar />` / `<TableFilterBar />` - Notion-style search and filter row.
*   `<TablePagination />` - Reusable pagination footer.
*   `<Badge />` / `<StatusBadge />` - Unified badge for statuses, types, and chart IDs. Appointment statuses: `scheduled` | `completed` | `cancelled` | `no-show` (see `components/common/StatusBadge.tsx`).
*   `<PatientAvatar />` / `<InitialsBadge />` - Deterministic initials avatar.
*   `<PageHeader />` - Title block for *every* page.
*   `<EventLog />` - Activity log list.
*   `<DocumentMimeTypeIcon />` - MIME-based file icon (PDF / image / generic); used in `<DocumentCard />` and `<UniversalSearch />`.
*   `<DocumentCard />` / `<UploadDocumentDialog />` - Patient/appointment document list + presigned upload (see `skills/file-upload/SKILL.md`).
*   `<UniversalSearch />` - TopNav command palette (`Dialog` + cmdk `Command`); `searchGlobal` + document `getViewPresignedUrl`; ⌘/Ctrl+K.
*   `<DetailForm />` - RHF + Zod; required `fields` (single scrollable 2-column grid); `forwardRef` + `submit`/`reset`; footer lives on `<DetailPanel />`.
*   `<DetailPanel />` / `<DetailSidebar />` - Detail shell: header, form column, optional sidebar tabs + activity log, footer (Save / Cancel / optional delete).
*   `<ModalShell />` - Universal modal envelope used for intercepting route modals.
*   **Calendar**: `<MonthView />`, `<TimeGridView />`, `<AppointmentEventCard />` — type colours/labels in `lib/appointment-calendar-styles.ts` (`TYPE_COLORS`: general=blue emphasis tokens, follow-up=amber, emergency=red; not the DB enum alone — display superset in `@/types/appointment`). Month chips: `patientFirstName`; chip time + day bucket = `format(parseISO(start), …)` (local TZ). Week/day: FullCalendar + `patientName` on title. Appointments dashboard day-view fetch: `startOfDay`/`endOfDay` (`docs/07-Page-Specifications.md` §3).

**Layouts (`components/layout/`)**
*   `<AppShell />`, `<TopNav />`, `<SideNav />`, `<NavItem />`. `SideNav` gets `userDisplayName` / `userTypeLabel` / `avatarSeed` (`session.user.id`, DiceBear open-peeps URL with skin/background palettes) from `(app)/layout` (`getSession()` + `USER_TYPE_LABELS` in `lib/constants/user.ts`), plus `clinicName` / `clinicLogoUrl` (from `buildClinicLogoPublicUrl` + `ASSETS_BASE_URL`; clinic mark: `InitialsBadge` until logo `<img>` `onLoad`, image `hidden` until then — no broken-icon flash), plus `initialCollapsed` from the `sidebar-collapsed` cookie (`cookies()` in layout → `AppShell`); toggling updates the cookie via `document.cookie` (1y `Max-Age`). Constants: `lib/constants/sidebar.ts`. Account menu uses Better Auth `signOut` → `/login`. `TopNav` right slot: Clinicforce product mark (`CF` in `--color-ink` square).

**AppShell page content:** Full-page routes in `app/(app)/` wrap primary UI in **`max-w-[1700px] mx-auto w-full`** inside `p-8` (or flex `h-full` shells); use **`flex-1 min-h-0`** on that inner wrapper when the page must fill height (tables, calendar, detail). `@modal` routes omit this — they render `<ModalShell />` only. **`appointments/dashboard`:** `p-8` lives on the page; **`AppointmentCalendarClient`** root must not use `p-8` (avoid double inset inside the max-width column).

## 🧭 Navigation & Routing Rules

**The Matrix Model:** Top Nav (Entity) × Side Nav (View). Routes use static segments: `/{entity}/{view}` (e.g., `/patients/dashboard`).
*   **Active State**: Driven strictly by `usePathname()`. Never manage manually.

**🚨 CRITICAL: The `/view/[id]` Pattern 🚨**
Detail records MUST use `/view/[id]` (e.g., `/appointments/view/123`), NEVER a bare `/[id]` (e.g., `/appointments/123`). 
*Why?* The App Router intercepting route `(.)[id]` matches any string, including static segments like `dashboard` or `new`. This will intercept standard navbar clicks, freezing the app. The `/view/` subpath prevents namespace collisions.

## 📄 Per-Page Requirements (Summary)

*   **Login (`/login`):**
    *   Split 50/50 layout — left brand panel (hidden mobile), right form panel; increased padding/rhythm vs a flat stack; stronger heading weights on hero + “Welcome back”.
    *   Left: **testimonial carousel** (several fake quotes), dots = nav + auto-rotate (~4.5s), same glass card styling.
    *   Password: **Eye / EyeOff** toggle (type `password` ↔ `text` only).
    *   Footer: `© {new Date().getFullYear()} Clinicforce`.
    *   Client component. React Hook Form + Zod. Sonner toasts on error. `useForm({ resolver: zodResolver(schema) })` without a generic so types infer from the resolver; no `defaultValues` for Zod `.default()` fields (see `docs/04-API-Specification.md`).
    *   `signIn.email()` from `lib/auth/client.ts`. Redirects to `?returnUrl` or `/home/dashboard` on success.
    *   No OAuth buttons. No "Request access" link. `rememberMe` checkbox wired to form.
*   **Home**: 
    *   `/dashboard`: High-level stats, recent appointments, recent patients.
    *   `/reports`: Placeholder view.
*   **Appointments**: 
    *   `/dashboard`: Calendar views (Month/Week/Day).
    *   `/new` & `/view/[id]`: `<DetailPanel />` + `<DetailForm />` — one form column (all appointment fields); **patient select disabled in edit**; edit mode: sidebar Documents tab + activity log; create mode: full-width form.
    *   `/reports`: Placeholder view.
*   **Patients**: 
    *   `/dashboard`: DataTable (Search by name/chart_id, filter by Last Dr. / Status); row click → `/patients/view/[id]` (intercepting modal).
    *   `/new` & `/view/[id]`: `<DetailPanel />` + `<DetailForm />` (RHF + Zod): form column (all fields + clinical notes), sidebar tabs Documents | Appointments, activity log in sidebar bottom zone; create mode hides sidebar. After successful `createPatient`, modal closes via `back` + `refresh`; full-page new route pushes to `dashboard`.
    *   `/reports`: Placeholder view.
*   **Medicines**: 
    *   `/dashboard`: DataTable (Search by name, filter by category/form); first column = category-mapped Lucide icon in `surface-alt` square + name/brand (same flex pattern as patients + `InitialsBadge`); row click → `/medicines/view/[id]` (intercepting modal).
    *   `/new` & `/view/[id]`: `<DetailPanel />` + `<DetailForm />` — form column + sidebar activity log in edit; create hides sidebar.
    *   `/reports`: Placeholder view.

Forms and detail views (`/new`, `/view/[id]`) render as **Intercepting Modals** (`@modal/(.)[entity]/...` parallel routes) inside a `<ModalShell />` with a full-page fallback for direct URL access, sharing logic via entity-specific `_components/` directories.

## ❌ DO NOT

*   **Do not hardcode colors.** Always use the CSS variables.
*   **Do not use bare `/[id]` for detail routes.** Always use `/view/[id]`.
*   **Do not build custom list tables.** Always use `<DataTable />`.
*   **Do not make one-off page headers.** Always use `<PageHeader />`.
*   **Do not define Zod schemas inline.** Import them from `lib/validators/`.
*   **Do not modify Shadcn UI components directly** in `components/ui/` unless making a globally required baseline fix (like adding `cursor-pointer` to buttons).
*   **Do not implement client-side data tables.** The client never holds the full dataset. Pagination and filtering must be handled via URL state + Server Actions.
*   **Do not use Shadcn's default toast.** Use Sonner.

## 📚 References
For deeper implementation details, consult the canonical documentation:
- `docs/06-UI-Design-System.md` - Complete design tokens, components, and matrix routing logic.
- `docs/07-Page-Specifications.md` - Full URL schemas, exact layout column sizings, and action requirements.
- `CLAUDE.md` - Project architecture and high-level rules.
