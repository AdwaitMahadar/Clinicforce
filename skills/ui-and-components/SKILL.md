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
*   **Role identity** (actor attribution in `ActivityLog` and any future role-attribution UI — do NOT substitute status-badge colours): `--role-color-admin` (indigo `#4F46E5`), `--role-color-doctor` (teal `#0D9488`), `--role-color-staff` (ochre `#B45309`)

**Typography Rules:**
*   **DM Serif Display**: Use ONLY for `<h1>` page titles and the brand name.
*   **DM Sans**: Use for EVERYTHING else (body, labels, buttons, tables).
*   **Monospace**: Use for Chart IDs. Format with `formatChartId(value, entityType)` from `lib/utils/chart-id.ts` (entity types: `'patient'` → `#PT-`, `'staff'` → `#STF-`, `'medicine'` → `#MED-`, `'user'` → `#USR-`). Convenience wrappers `formatPatientChartId` / `formatStaffChartId` are available for those two entities. Never hand-roll prefixes in components. `PatientRow.chartId` is a raw `number` — the table cell calls the formatter at render time; the server/page layer must not pre-format it.

**Forms & State:**
*   Always use **React Hook Form + Zod**. Schemas must be imported from `lib/validators/`.
*   Use **nuqs** for managing URL state (pagination, search, filters) instead of `URLSearchParams`. Always use **`useQueryStates`** to natively batch simultaneous URL parameter updates (like calendar `view` and `date`) to prevent Server Component flicker.
*   Use **Sonner** for toasts (never Shadcn's default toast).

## 🧩 Component Inventory

**Route loading:** Colocate `loading.tsx` with `page.tsx` under `app/(app)/` where segments suspend; use Shadcn `Skeleton` and `components/common/skeletons/*`. Full-page shells: same **`max-w-[1700px] mx-auto w-full`** as §2.2 in `docs/06-UI-Design-System.md`. **`@modal` intercepts:** no segment **`loading.tsx`** — **`ModalShell`** in **`page.tsx`** first; **view** routes use **`<Suspense fallback={<ModalDetailPanelBodySkeleton />}>`**; **`new`** routes use server **`page.tsx`** + client inner. Avoid full **`ModalDetailSkeleton`** on intercept routes (double modal flash).

Reuse existing components instead of building ad-hoc solutions. 

**Domain Components (`components/common/` & `components/clinic/`)**
*   `<DataTable />` — TanStack v8 list table: cell padding `px-4 py-3`, headers `px-4`, outer columns `first:pl-8 last:pr-8` for edge inset; sort handler on inner label+icon span only (not full header cell). Spacing is set in `DataTable` via `className` — do not edit `components/ui/table.tsx`. Initial load: route `loading.tsx` skeletons — no `isLoading` on DataTable. **Patients directory:** rightmost **actions** — **Eye** always; **Calendar** only when **`status !== "inactive"`**; empty state = no-results text + **New Patient** button (same ink styling as page header, **`router.push("/patients/new")`**); `stopPropagation` on the cell; Calendar → `/appointments/new?…` prefill (`docs/07-Page-Specifications.md`).
*   **`/appointments/new` prefill:** `parseNewAppointmentSearchParams` → **`AppointmentDetailPanel`** **`initialValues`**; prefilled **`patientId`** locks **`AppointmentPatientCombobox`** (like edit). Types: **`AppointmentCreateInitialValues`** (`types/appointment.ts`).
*   `<SearchFilterBar />` / `<TableFilterBar />` - Notion-style search and filter row.
*   `<TablePagination />` - Reusable pagination footer.
*   `<Badge />` / `<StatusBadge />` - Unified badge for statuses, types, and chart IDs. Appointment statuses: `scheduled` | `completed` | `cancelled` | `no-show`. Patient/medicine **inactive** uses red tokens (`--color-red` family), same semantic weight as cancelled appointments (`components/common/StatusBadge.tsx`).
*   `<PatientAvatar />` / `<InitialsBadge />` - Deterministic initials avatar.
*   `<ClinicBrandMark />` - `InitialsBadge` + clinic logo `background-image` (`components/common/ClinicBrandMark.tsx`); `SideNav` + login right panel.
*   `<PageHeader />` - Title block for *every* page.
*   `<ActivityLog />` — Presentational timeline of `ActivityLogEntry[]`. **Props:** `entries`, `hasMore`, `onLoadMore`, `isLoading`, `className?`. Does NOT fetch — parent supplies data. Features: vertical timeline with Lucide action icons colored by action type via `ACTION_COLOR` map (`created`=`--color-green`, `updated`=`--color-blue`, `deactivated`=`--color-amber`, `reactivated`=`--color-green`, `deleted`=`--color-red`); dot `size-[22px]` / icon `size={11}` / vertical rule `left-[11px]`; actor name by role (`--role-color-*`); entity descriptor `text-[11.5px]`; changed-field rows `text-[10.5px]` (sensitive → italic `"updated"`; normal → when `oldValue` is falsy shows italic `"(empty)"` in muted text instead of a dash — avoids confusion with the `→` arrow that follows; `newValue` still shows `"—"` when empty; label has no fixed `minWidth`); **IntersectionObserver infinite scroll** — `useIntersectionSentinel`: `callbackRef` via `useLayoutEffect`, `useEffect` deps on `enabled` only; works correctly inside `overflow-y-auto` scroll containers (spec clips intersection rect through overflow ancestors); three pulsing skeleton dots while loading more; full 4-item skeleton on initial load; empty state. Import from `@/components/common/ActivityLog`. **Home dashboard:** fed via `HomeDashboardActivityFeed` (`app/(app)/home/_components/HomeDashboardActivityFeed.tsx`) — `"use client"` wrapper; receives SSR page-1 data; calls `getRecentActivity({ page: n })` for subsequent pages; same `pageRef`/`isFetchingRef`/`useEffect([entries])` pattern as `DetailSidebar`. **Home dashboard card:** in `page.tsx` the feed is wrapped in a card (`--color-glass-fill-data` bg, `--shadow-card-border` border, `--shadow-card` shadow, `rounded-xl`) matching the DataTable treatment; inside the card, a `max-height: min(50vh, 480px)` `overflow-y-auto p-4 scrollbar-hover` div constrains height and enables in-card infinite scroll.
*   `<DocumentMimeTypeIcon />` - MIME-based file icon (PDF / image / generic); used in `<DocumentCard />` and `<UniversalSearch />`.
*   `<DocumentCard />` / `<UploadDocumentDialog />` - Patient/appointment document list + presigned upload (see `skills/file-upload/SKILL.md`). **`DocumentsTab`** — sidebar grid + Upload + dialog; **`patientId`** + optional **`appointmentId`**. **`AppointmentListTab`** — patient visit cards → **`/appointments/view/[id]`**; optional **`currentAppointmentId`** for **Current** on appointment detail.
*   `<UniversalSearch />` - TopNav command palette; `searchGlobal`; Medicines group when `usePermission("viewMedicines")`; Documents + `getViewPresignedUrl` when `usePermission("viewDocuments")`; ⌘/Ctrl+K.
*   `<DetailForm />` - RHF + Zod; required `fields` (single scrollable 2-column grid); `forwardRef` + `submit`/`reset`; footer lives on `<DetailPanel />`. Select fields may set **`selectContentClassName`** on the descriptor for `<SelectContent />` (e.g. appointment doctor picker max height ~6 rows + scroll). **`TextField`** may set **`prefix`** (input-group: muted prepended label + shared border, `focus-within` ring) or **`readOnly`** (HTML read-only — normal contrast, not `disabled` opacity). **`type: "number"`** may set **`step`** / **`min`**; appointment **Fee** uses **`prefix: "₹"`** + `step="0.01"`; staff visible fee uses **`readOnly`**.
*   `<AsyncSearchCombobox />` - Popover + cmdk; **`fetchItems(query)`** async (debounced internally); **`shouldFilter={false}`**; **`modal={false}`** for dialogs; optional **`renderOption`**. Appointment patient: **`AppointmentPatientCombobox`** + **`searchPatientsForPicker`** (limit 8, same search columns as `getPatients`).
*   `<DetailPanel />` / `<DetailSidebar />` - Detail shell: header, form column, optional sidebar tabs + activity log, footer (Save / Cancel / optional delete). Sidebar is hidden when `isCreate=true` OR when the user lacks `viewDetailSidebar` permission (staff) — `DetailPanel` reads this internally via `usePermission`, no extra prop needed in entity panels. View modal pages pass `size="lg"` instead of `"xl"` for staff so the narrower modal matches the full-width form. **Phase 6+ (fully wired):** `DetailPanel` accepts `events?: ActivityLogEntry[]`, `hasMoreEvents?: boolean`, `entityType?`, and `entityId?`; these are forwarded to `DetailSidebar`. `DetailSidebar` manages `allEntries` state (append-only across pages), `hasMore` state, an `isFetchingRef` guard, and a `pageRef` for stable pagination. `handleLoadMore` is a stable `useCallback([entityType, entityId])` that calls `getEntityActivity({ entityType, entityId, page: pageRef.current + 1 })` and appends results. On fetch failure `hasMore` stays true for silent retry on next scroll. **Activity log card:** the entries scroll container in `DetailSidebar` is wrapped in a subtle card (`--color-surface` bg, `1px solid --color-border`, `rounded-lg`) against the `--color-surface-alt` sidebar; the "ACTIVITY LOG" eyebrow label sits above the card; inner scroll div uses `.scrollbar-hover` (scrollbar hidden by default, revealed on container hover). Entity panels pass `entityType` (`"patient"` / `"appointment"` / `"medicine"`), `entityId` (entity `.id`), and `hasMoreEvents` (`entity.activityLogHasMore`) to `DetailPanel`.
*   `<PanelCloseButton />` - Shared X close button for all detail panels; uses Lucide `X` with CSS `:hover` (no imperative DOM). Always pass `onClose` explicitly — panels decide whether to call `router.back()` or a custom callback.
*   `<ModalShell />` - Intercepting route modals: shadcn `Dialog` / Radix (focus trap, scroll lock, `router.back()` on dismiss); sizes from `modal-shell-sizes.ts`.
*   **Calendar**: `<MonthView />`, `<TimeGridView />`, `<AppointmentEventCard />` — colours keyed by **`appointment_category`** in `lib/appointment-calendar-styles.ts` (`CATEGORY_COLORS`: general=blue emphasis, orthopedic=amber, physiotherapy=green). Standard labels: `formatAppointmentHeading` (`lib/utils/format-appointment-heading.ts`). Month chips: `time · patientFirstName` + `title` tooltip with full heading. Week/day: FullCalendar event title = heading. Appointments dashboard day-view fetch: `startOfDay`/`endOfDay` (`docs/07-Page-Specifications.md` §3). **Date-range computation** (month/week/day boundaries → ISO strings) is shared via `getCalendarRange(view, date)` in `app/(app)/appointments/_lib/calendar-range.ts` — import this in both the server dashboard page and any client code that needs the range; never duplicate the boundary logic.

*   `<ReportsComingSoon title subtitle />` - Placeholder for all Reports views (all 4 pages delegate to this). Never copy-paste the dashed-box stub — import from `@/components/common`.
*   `<RoleGate permission fallback? />` - Declarative permission gate; renders `children` when current user holds the named permission, `fallback` (default `null`) otherwise. Uses `usePermission` from `lib/auth/session-context`. For imperative checks use `usePermission("...")` directly. Never inline role arrays in components — add a named permission to `lib/permissions.ts`.

**Layouts (`components/layout/`)**
*   `<DetailPageShell breadcrumb>` - Full-page wrapper used by all entity `/new` and `/view/[id]` pages (outer padding, max-width column, breadcrumb text, glass card container). Always use this instead of repeating the wrapper inline.
*   `<AppShell />`, `<TopNav />`, `<SideNav />`. `SideNav` gets `userDisplayName` / `userTypeLabel` / `avatarSeed` (`session.user.id`, DiceBear open-peeps URL with skin/background palettes + `face` allowlist for professional expressions only — `DICEBEAR_OPEN_PEEPS_FACE_ALLOWLIST` in `SideNav.tsx`) from `(app)/layout` (`getSession()` + `USER_TYPE_LABELS` in `lib/constants/user.ts`), plus `clinicName` / `clinicLogoUrl` (from `buildClinicLogoPublicUrl` + `ASSETS_BASE_URL`; clinic mark: shared `<ClinicBrandMark />`), plus `initialCollapsed` from the `sidebar-collapsed` cookie (`cookies()` in layout → `AppShell`); toggling updates the cookie via `document.cookie` (1y `Max-Age`). Constants: `lib/constants/sidebar.ts`. Account menu uses Better Auth `signOut` → `/login`. `TopNav` right slot: `public/clinicforce-mark.png` in `--color-ink` square. Login: server `login/page.tsx` passes branding into `login-page-client.tsx`; same Clinicforce asset in left / mobile rows.

**AppShell page content:** Full-page routes in `app/(app)/` wrap primary UI in **`max-w-[1700px] mx-auto w-full`** inside `p-8` (or flex `h-full` shells); use **`flex-1 min-h-0`** on that inner wrapper when the page must fill height (tables, calendar, detail). `@modal` routes omit this — they render `<ModalShell />` only. **`appointments/dashboard`:** `p-8` lives on the page; **`AppointmentCalendarClient`** root must not use `p-8` (avoid double inset inside the max-width column).

## 🧭 Navigation & Routing Rules

**The Matrix Model:** Top Nav (Entity) × Side Nav (View). Routes use static segments: `/{entity}/{view}` (e.g., `/patients/dashboard`).
*   **Active State**: Driven strictly by `usePathname()`. Never manage manually.

**🚨 CRITICAL: The `/view/[id]` Pattern 🚨**
Detail records MUST use `/view/[id]` (e.g., `/appointments/view/123`), NEVER a bare `/[id]` (e.g., `/appointments/123`). 
*Why?* The App Router intercepting route `(.)[id]` matches any string, including static segments like `dashboard` or `new`. This will intercept standard navbar clicks, freezing the app. The `/view/` subpath prevents namespace collisions.

**Detail exit after mutation:** `useDetailExit({ listHref, onClose })` in `lib/hooks/use-detail-exit.ts` — `exitAfterMutation()`: modal = **`startTransition`** wrapping `onClose()` + **`router.refresh()`**; full-page = `router.replace(listHref)` + immediate **`router.refresh()`**.

## 📄 Per-Page Requirements (Summary)

*   **Login (`/login`):**
    *   Split 50/50 layout — left brand panel (hidden mobile), right form panel; **`login/page.tsx`** (server) resolves subdomain + `getActiveClinicBySubdomain` + `buildClinicLogoPublicUrl`; **`login-page-client.tsx`** renders UI. Right panel **`lg:p-14`** (same inset as left for the top brand row); form band **`flex-1 justify-center`** + **`lg:px-10`**. Mobile: Clinicforce row, optional clinic row, then form.
    *   Left: **testimonial carousel** (several fake quotes), dots = nav + auto-rotate (~4.5s), same glass card styling.
    *   Password: **Eye / EyeOff** toggle (type `password` ↔ `text` only).
    *   Footer: `© {new Date().getFullYear()} Clinicforce`.
    *   Form client: React Hook Form + Zod. Schema: `loginSchema` from `lib/validators/auth.ts`. Sonner toasts on error. `useForm({ resolver: zodResolver(schema) })` without a generic; no `defaultValues` for Zod `.default()` fields (see `docs/04-API-Specification.md`). Metadata (`title`, `description`) exported from `app/(auth)/layout.tsx`.
    *   `signIn.email()` from `lib/auth/client.ts`. Redirects to `?returnUrl` or `/home/dashboard` on success.
    *   No OAuth buttons. No "Request access" link. `rememberMe` checkbox wired to form.
*   **Home**: 
    *   `/dashboard`: High-level stats, recent appointments, recent patients.
    *   `/reports`: Placeholder view.
*   **Appointments**: 
    *   `/dashboard`: Calendar views (Month/Week/Day).
    *   `/new` & `/view/[id]`: `AppointmentDetailPanel` — server loads **`doctorOptions`** via `getActiveDoctors` + `loadAppointmentDoctorOptions` / `mapDoctorPickerResults` in `appointments/_lib/appointment-picker-options.ts`; **patient** create = debounced **`searchPatientsForPicker`** combobox; **patient** edit = disabled label from detail (`patientChartId` on `getAppointmentDetail`); **view** uses `Promise.all` with `getAppointmentDetail` + doctors; **Title** after doctor via `usePermission("viewAppointmentTitle")`; category + visit type same row (`colSpan` 1); doctor select scroll cap via `selectContentClassName`; **Fee** — staff: hidden create, edit only if status completed (**`DetailForm` `readOnly`**, not disabled styling) + header fee line same; edit: fee empty→positive auto-sets completed + toast via **`DetailForm` `insideForm`** + **`useWatch({ name: "fee" })`** + `setValue` (not `watch("fee")` alone — no re-render); sidebar **Documents** (all patient-assigned docs; upload still sets `appointmentId`) + **Appointments** (patient’s active visits, current row marked) + activity log in edit; create = full-width form. **Edit footer Delete appointment** → **`AlertDialog`**: **Cancel appointment** = **`updateAppointment`** `status: 'cancelled'`; **Delete** = **`deleteAppointment`**; **`useDetailExit`** after save/cancel/delete. Intercepting **view:** **`AppointmentViewModalClient`** passes **`onClose`** (modal: **`startTransition`** + refresh; full-page → **`replace`** `/appointments/dashboard`).
    *   `/reports`: Placeholder view.
*   **Patients**: 
    *   `/dashboard`: DataTable (Search by name/chart_id, filter by Last Dr. / Status); row click → `/patients/view/[id]` (intercepting modal).
    *   `/new` & `/view/[id]`: `<DetailPanel />` + `<DetailForm />` (RHF + Zod): DOB + Age sync via `PatientDobAgeSync` (`insideForm`); admin/doctor see **Patient's Past History** (`pastHistoryNotes`); sidebar tabs Documents | Appointments; create hides sidebar. **Edit:** **`onDelete`** → **`deactivatePatient`** (footer **Deactivate Patient**) **only if active**; saving while inactive opens **AlertDialog** → confirm **`updatePatient`** + **`isActive: true`**. List row subtitle: **phone** under name. `NewPatientModalClient` / `PatientViewModalClient` pass **`onClose`**; **`useDetailExit`** after create/update/deactivate/reactivate (modal: **`startTransition`** + refresh; full-page: **`replace`** `/patients/dashboard`). Patient writes → **`revalidatePath("/patients/dashboard")`**.
    *   `/reports`: Placeholder view.
*   **Medicines**: 
    *   `/dashboard`: DataTable (Search by name, filter by category/form); lists **active and inactive** medicines; Status column = `StatusBadge`; first column = category-mapped Lucide icon in `surface-alt` square + name/brand (same flex pattern as patients + `InitialsBadge`); row click → `/medicines/view/[id]` (intercepting modal).
    *   Medicine **detail** (`MedicineDetailPanel`): footer **Delete Medicine** only when **active**; saving while **`isActive === false`** opens **`AlertDialog`**; confirm → **`updateMedicine`** with **`isActive: true`** + form fields, then **`useDetailExit`**.
    *   `/new` & `/view/[id]`: `<DetailPanel />` + `<DetailForm />` — form column + sidebar activity log in edit; create hides sidebar. **`MedicineViewModalClient`** on intercepting view; **`useDetailExit`** → `/medicines/dashboard` after create/update/deactivate/reactivate confirm. Medicine writes → **`revalidatePath("/medicines/dashboard")`**.
    *   `/reports`: Placeholder view.

Forms and detail views (`/new`, `/view/[id]`) render as **Intercepting Modals** (`@modal/(.)[entity]/...` parallel routes) inside a `<ModalShell />` with a full-page fallback for direct URL access, sharing logic via entity-specific `_components/` (UI panels) and `_lib/` (server helpers) directories. **Detail mappers:** each entity has a `_lib/*-detail-mapper.ts` that converts the server action result to the UI detail type — both the full-page route and the modal content component import the same mapper (e.g. `buildPatientDetail`, `buildAppointmentDetail`, `buildMedicineDetail`).

## ❌ DO NOT

*   **Do not hardcode colors.** Always use the CSS variables.
*   **Do not use bare `/[id]` for detail routes.** Always use `/view/[id]`.
*   **Do not build custom list tables.** Always use `<DataTable />`.
*   **Do not make one-off page headers.** Always use `<PageHeader />`.
*   **Do not define Zod schemas inline.** Import them from `lib/validators/`.
*   **Do not modify Shadcn UI components directly** in `components/ui/` unless making a globally required baseline fix (like adding `cursor-pointer` to buttons).
*   **Do not implement client-side data tables.** The client never holds the full dataset. Pagination and filtering must be handled via URL state + Server Actions.
*   **Do not use Shadcn's default toast.** Use Sonner.
*   **Do not inline role arrays for UI gating.** Add a named permission to `lib/permissions.ts` and use `<RoleGate>` or `usePermission()`.

## 📚 References
For deeper implementation details, consult the canonical documentation:
- `docs/06-UI-Design-System.md` - Complete design tokens, components, and matrix routing logic.
- `docs/07-Page-Specifications.md` - Full URL schemas, exact layout column sizings, and action requirements.
- `CLAUDE.md` - Project architecture and high-level rules.
