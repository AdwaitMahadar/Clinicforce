# Clinicforce UI Guidelines

This document defines the UI architecture, component strategy, and design rules for the Clinicforce CMS. All AI agents and developers must follow these guidelines to ensure consistency across the application.

---

## 1. Navigation Architecture — The Matrix Model

The app navigation works like a coordinate system. The **top navbar** is the X-axis (domain/entity), and the **left sidebar** is the Y-axis (view within that domain). Together they define what is shown in the main content area.

### Top Navbar (X-axis) — Entity Selection
| Key | Label | Description |
|---|---|---|
| `home` | Home | Clinic-wide overview and reports |
| `appointments` | Appointments | All appointment management |
| `patients` | Patients | Patient records and directory |
| `medicines` | Medicines | Medicine reference library |

The top nav also exposes **global search** (`components/common/UniversalSearch.tsx`): a `Dialog` + cmdk `Command` palette (⌘/Ctrl+K) that calls `searchGlobal` and navigates or opens documents via presigned URL.

### Left Sidebar (Y-axis) — View Selection
| Key | Label | Description |
|---|---|---|
| `dashboard` | Dashboard | Primary data view for the selected entity |
| `reports` | Reports | Analytics and reporting for the selected entity |

The sidebar always shows **Dashboard** and **Reports** for whichever top-nav entity is active. **Top nav** items can be **permission-filtered** (e.g. **Medicines** is omitted for **staff** when `usePermission("viewMedicines")` is false — see `components/layout/TopNav.tsx` and `lib/permissions.ts`).

**Collapsed width persistence:** The user can collapse or expand the sidebar (`components/layout/SideNav.tsx`). The preference is stored in an HTTP cookie named `sidebar-collapsed` (`1` = collapsed, `0` = expanded), with `Max-Age` of one year and `Path=/`, `SameSite=Lax`. `app/(app)/layout.tsx` reads the cookie with `cookies()` before render and passes `initialCollapsed` through `AppShell` to `SideNav` so the first HTML paint matches the saved width (no flash). Toggling updates the cookie via `document.cookie` on the client.

**Sidebar clinic branding:** The top brand row shows `clinicName` from `getSession()` (`clinics.name`) and a public logo URL built in `(app)/layout` as `{ASSETS_BASE_URL}/{subdomain}/assets/logo/logo.png` (`lib/clinic/build-clinic-logo-url.ts`, normalised subdomain; `ASSETS_BASE_URL` is the browser-facing asset prefix — see `docs/10-Environments-and-Dev-Workflow.md`). The shared clinic mark is **`ClinicBrandMark`** (`components/common/ClinicBrandMark.tsx`) — used by **`SideNav`** and the login right panel — always rendering **`InitialsBadge`** from `clinicName` with the logo URL as a CSS **`background-image`** on a stacked layer (`background-size: contain`, centered, no repeat). When the asset loads, it covers the initials; if it fails or is slow, initials stay visible — no React loading state, skeleton, or `<img>` hooks. The top nav’s right “product” slot is `public/clinicforce-mark.png` inside a `--color-ink` rounded square (`<TopNav />`, `size-6` image).

**Sidebar user avatar:** The bottom account row shows a DiceBear **open-peeps** illustration loaded from `https://api.dicebear.com/7.x/open-peeps/svg` with `seed` set to `session.user.id` (passed as `avatarSeed` from `(app)/layout` through `AppShell`), plus constrained `skinColor` and `backgroundColor` palettes in the query string, and a `face` parameter restricted to an allowlist of neutral or professional expressions (see `DICEBEAR_OPEN_PEEPS_FACE_ALLOWLIST` in `components/layout/SideNav.tsx`). The same user always gets the same avatar. It is rendered as a plain `<img>` (not `next/image`) inside a `size-9` rounded, overflow-hidden frame.

### Route Structure
Routes follow the pattern `/{entity}/{view}`. All routes are **static segments** — no dynamic routing for the matrix itself.

```
/home/dashboard
/home/reports
/appointments/dashboard
/appointments/reports
/patients/dashboard
/patients/reports
/medicines/dashboard
/medicines/reports
```

The root `/` should redirect to `/home/dashboard`.

### Active State Rules
- The top navbar item matching the current route segment highlights as active (pill style, dark background).
- The sidebar item matching the current route segment highlights as active (subtle background).
- Both active states are driven by `usePathname()` from Next.js — never manage active state manually.

---

## 2. URL & Routing Rules

### Matrix Routes
Static segments as defined above. No dynamic routing for the main matrix.

### Detail / Modal Routes (Intercepting Routes)
When a user clicks a row or a "New" button to view or edit a specific record, an **intercepting route modal** opens over the current page. The underlying list/view remains mounted and visible behind the modal.

Use Next.js App Router's `@modal` parallel route pattern for this.

```
app/
  @modal/
    (.)patients/view/[id]/
      page.tsx        ← intercepted modal view
  patients/
    dashboard/
      page.tsx        ← list view (stays mounted under modal)
    view/
      [id]/
        page.tsx      ← full page fallback (direct URL access)
```

**Rule:** Every entity that supports row-click detail (Patients, Appointments, Medicines, Users) must have both an intercepting modal route and a full-page fallback route. The modal is shown when navigating from within the app; the full page is shown on direct URL access or page refresh.

**CRITICAL — Detail URL Pattern:**
Detail routes MUST use the `/view/[id]` sub-path pattern (e.g. `/appointments/view/abc-123`), **never** a bare `/[id]` directly under the entity (e.g. `/appointments/abc-123`).

Reason: Next.js intercepting route `(.)appointments/[id]` is a dynamic segment that matches ANY string, including static nav segments like `dashboard`, `new`, and `reports`. This causes `router.push('/appointments/dashboard')` to be intercepted as a modal, freezing the background page and breaking navigation. The `/view/` sub-path creates a completely separate route namespace — `(.)appointments/view/[id]` can never match `/appointments/dashboard`.

---

## 2.1 Route loading (`loading.tsx`)

Authenticated routes under `app/(app)/` use a colocated **`loading.tsx`** per segment where the page suspends (async Server Components, slow navigations). Each file default-exports a layout that mirrors the real page shell (padding, `PageHeader`, tables, calendar, detail card, or modal) using the Shadcn **`Skeleton`** primitive (`components/ui/skeleton.tsx`). Reusable shapes live in **`components/common/skeletons/`** (e.g. `TableDashboardSkeleton`, `HomeDashboardSkeleton`, `DetailPageSkeleton`) so fallbacks stay aligned with the design tokens and do not use centered spinners alone. Where the corresponding page uses the main content width rule (§2.2), the skeleton applies the same **`max-w-[1700px] mx-auto w-full`** inner wrapper.

**Intercepting modals (`app/(app)/@modal/…`):** Do **not** use a colocated **`loading.tsx`** that renders a full duplicate modal (backdrop + panel): it causes a double animation when the real **`ModalShell`** mounts. Instead: **`view/[id]`** routes use a server **`page.tsx`** that renders **`ModalShell`** immediately and wraps slow data in **`<Suspense fallback={<ModalDetailPanelBodySkeleton variant="detail" />}>`** around an async child (e.g. `*ViewModalContent.tsx`). **`new`** routes use a server **`page.tsx`** that renders **`ModalShell`** and a small client inner module — no segment **`loading.tsx`**. **`ModalDetailPanelBodySkeleton`** mirrors **`DetailPanel`** only (header / body / footer); **`ModalDetailSkeleton`** remains for rare standalone full-modal loading (backdrop + sized panel + animation) and composes the same inner body. Width/height presets are shared with **`ModalShell`** via **`components/common/modal-shell-sizes.ts`**.

### 2.2 Main content width (full-page routes)

Every **`page.tsx`** under `app/(app)/` that renders in the AppShell main card (not `@modal` interceptors) wraps its primary content in an inner **`max-w-[1700px] mx-auto w-full`** container, inside the usual **`p-8`** (or height-preserving flex) outer shell. On wide viewports this keeps body content centered with a consistent max width. For vertically filling layouts (tables, calendar, full-page detail/new), the inner wrapper also carries **`flex-1 min-h-0`** (and flex column + gap where applicable) so **`h-full`** chains and scroll regions keep working.

**Appointments calendar:** `appointments/dashboard/page.tsx` applies **`p-8`** on the outer shell; **`AppointmentCalendarClient`** must not add **`p-8`** on its root — otherwise horizontal padding would stack inside the max-width column and narrow the calendar vs other dashboards.

---

## 3. Folder & File Structure

```
app/
  (app)/                        ← Route group for authenticated app shell
    layout.tsx                  ← AppShell layout (TopNav + SideNav + main)
    home/
      dashboard/page.tsx
      dashboard/loading.tsx     ← Suspense fallback (optional per segment)
      reports/page.tsx
    appointments/
      dashboard/page.tsx
      reports/page.tsx
      new/page.tsx              ← Full page fallback for new appointment
      view/
        [id]/page.tsx           ← Full page appointment detail fallback
    patients/
      dashboard/page.tsx
      reports/page.tsx
      view/
        [id]/page.tsx           ← Full page patient detail
    medicines/
      dashboard/page.tsx
      reports/page.tsx
      new/page.tsx
      view/
        [id]/page.tsx           ← Full page medicine detail
    @modal/                     ← Parallel route for intercepting modals
      (.)patients/view/[id]/page.tsx
      (.)appointments/new/page.tsx
      (.)appointments/view/[id]/page.tsx
      (.)medicines/new/page.tsx
      (.)medicines/view/[id]/page.tsx
  (auth)/                       ← Route group for login/auth pages
    login/page.tsx

components/
  ui/                           ← Shadcn base components (do not modify)
  layout/                       ← App shell components
    AppShell.tsx
    TopNav.tsx
    SideNav.tsx
    NavItem.tsx
    PageHeader.tsx
  common/
    skeletons/                  ← Route loading.tsx building blocks (Skeleton-based)
  clinic/                       ← Domain-specific reusable components
    Badge.tsx                   ← Unified badge component (all variants)
    PatientAvatar.tsx
    DataTable.tsx
    SearchFilterBar.tsx
    AppointmentEventCard.tsx    ← FullCalendar custom event renderer
    WaitlistItem.tsx
  calendar/
    MonthMiniCalendar.tsx       ← Shadcn Calendar-based date navigator
    WeekViewGrid.tsx            ← FullCalendar timeGridWeek wrapper

lib/
  constants/
    sidebar.ts                  ← `sidebar-collapsed` cookie name, max-age, parse helper
  db/                           ← Drizzle schema and query functions
  validators/                   ← Zod schemas (shared between forms and API)
  auth/                         ← Better-Auth config
  utils/
    avatar.ts                   ← Deterministic colour from name/id hash
```

**Login page (`/login`):** **`app/(auth)/login/page.tsx`** is a Server Component: reads **`x-forwarded-host`** / **`host`**, derives subdomain via **`extractSubdomainFromHost`**, loads **`getActiveClinicBySubdomain`**, builds **`buildClinicLogoPublicUrl`**, passes `{ name, logoUrl }` (or `null` when unknown / no subdomain) into **`login-page-client.tsx`** (`"use client"`). Public split layout — left brand column (gradient, optional grain overlay, top-left **Clinicforce** wordmark with `public/clinicforce-mark.png` (`size-9`) in the ink rounded square, marketing headline, **glass testimonial carousel**: multiple quotes with dot navigation, auto-advance ~4.5s, `aria-live` for updates) and right column: **`lg:p-14`** on the panel so the **desktop** **`ClinicBrandMark` + clinic name** row shares the same left inset as the left panel’s Clinicforce row (avoid a wider horizontal padding on the panel that would push the clinic mark inward); the credentials stack lives in **`flex-1` / `justify-center`** with **`lg:px-10`** on that inner band so the form keeps the prior horizontal rhythm; **mobile** shows Clinicforce then optional clinic row. Password field uses a **visibility toggle** (Lucide `Eye` / `EyeOff`) that only switches `input` type between `password` and `text`. Footer copyright uses **`new Date().getFullYear()`**. All colours via design tokens (`var(--color-*)`). Typography: serif display for the left headline; sans for form and body.

---

## 4. Component Library Strategy

### Base Layer — Shadcn/UI
Shadcn components live in `components/ui/`. They are owned by the repo (not a node_modules dependency) and should **not be modified directly**, with rare exceptions for global baseline fixes (e.g. adding `cursor-pointer` to `buttonVariants`). Compose them, don't edit them.

**Install these Shadcn components at project setup:**
- Layout & Feedback: `button`, `badge`, `avatar`, `skeleton`, `separator`, `tooltip`, `sonner`
- Overlay: `dialog`, `sheet`, `dropdown-menu`, `popover`
- Forms: `form`, `input`, `select`, `textarea`, `checkbox`, `calendar`
- Data: `table`, `command`

Use **Sonner** for all toast notifications. Do not use Shadcn's default toast.

### Domain Layer — `components/clinic/`
Custom components built on top of Shadcn. These encode Clinicforce-specific business logic and visual patterns.

### Third-Party Libraries
| Purpose | Library | Notes |
|---|---|---|
| Data tables | TanStack Table v8 | Used in "manual" mode for server-side pagination |
| Date navigator | Shadcn `<Calendar />` (react-day-picker) | For mini calendar and date pickers only |
| Time-grid calendar | FullCalendar (`@fullcalendar/react` + `@fullcalendar/timegrid` + `@fullcalendar/interaction`) | For week and day views only |
| Forms | React Hook Form + Zod | Always use together |
| Toasts | Sonner | Replace Shadcn default toast |

---

## 5. Core Components Specification

### `<Badge />` — Unified Badge Component
**Location:** `components/clinic/Badge.tsx`

One component handles all badge/pill use cases in the app via a `variant` prop. Do not create separate badge components per entity.

**Variants:**
```ts
type BadgeVariant =
  | 'chartId'           // 8821 style — muted background, monospace font
  | 'appointmentStatus' // scheduled | completed | cancelled | no-show
  | 'patientStatus'     // active | inactive | critical
  | 'appointmentCategory' // general | orthopedic | physiotherapy (if used — calendar styling uses `CATEGORY_COLORS` in `lib/appointment-calendar-styles.ts`)
```

**Colour mapping:**
```ts
// Appointment Status
scheduled    → amber background, amber text
completed    → blue background, blue text
cancelled    → red background, red text
no-show      → purple background, purple text

// Patient Status
active       → green background, green text
inactive     → grey background, grey text
critical     → red background, red text

// Chart ID
chartId      → subtle grey background, monospace font, e.g. #PT-8821
              Format: '#PT-' prefix for patients, '#STF-' prefix for staff/users
              Use `formatPatientChartId` / `formatStaffChartId` from `lib/utils/chart-id.ts` (display layer only; DB stores integers).
```

**Usage:**
```tsx
<Badge variant="appointmentStatus" value="scheduled" />
<Badge variant="patientStatus" value="critical" />
<Badge variant="chartId" value={patient.chartId} entityType="patient" />
```

### `<PatientAvatar />` — Initials Avatar
**Location:** `components/clinic/PatientAvatar.tsx`

Displays a circle with the patient's initials. The background colour is **deterministic** — derived from a hash of the patient's ID so the same patient always gets the same colour everywhere in the app.

```ts
// lib/utils/avatar.ts
export function getAvatarColour(id: string): string {
  // Hash the id, map to a predefined palette of 8-10 accessible colours
  // Never random — must be pure and deterministic
}
```

**Sizes:** `sm` (28px), `md` (36px), `lg` (48px). Default: `md`.

### `<PageHeader />` — Page Title Block
**Location:** `components/layout/PageHeader.tsx`

Used at the top of every dashboard and reports page. Accepts slots for title, subtitle, and right-side actions.

```tsx
<PageHeader
  title="Patients Directory"
  subtitle="Manage patient records, history, and active treatments."
  actions={<Button>+ New Patient</Button>}
/>
```

### `<DataTable />` — Universal Data Table
**Location:** `components/common/DataTable.tsx`

Built on **TanStack Table v8**. Used for all list views (Patients, Medicines, etc.). The parent owns **`columns`** (`ColumnDef<TData>[]`) and **`data`**; optional **`enableSorting`** (default `true`), **`emptyState`**, **`onRowClick`**, and a wrapper **`className`**.

**Critical: Server-side mode only.** Filtering, pagination, and list-defining sort order come from **URL search params + server actions** — the dashboard `page.tsx` reads `searchParams` and fetches a page of rows. The DataTable may apply **client-side sorting** to the current page via TanStack when `enableSorting` is true; it does not load extra pages or replace server filters.

**Loading:** Route-level **`loading.tsx`** (and skeleton components under `components/common/skeletons/`) show table-shaped placeholders. The DataTable itself has no `isLoading` prop — never show the empty state during initial load; show skeleton rows in the route fallback instead.

**Padding & edge insets (all applied on `DataTable` via `className` on `TableHead` / `TableCell` — do not change `components/ui/table.tsx` for list spacing):**
- **Headers:** `px-4` on every cell; **`first:pl-8`** and **`last:pr-8`** on the first and last column so the table has extra breathing room at the left and right edges.
- **Body cells:** `px-4 py-3` with the same **`first:pl-8 last:pr-8`** on outer columns. The empty-state row (single spanned cell) uses the same pattern so horizontal inset matches.

**Sort interaction:** Sort toggles are attached to an **inner** `inline-flex` span that wraps the header label and sort icon only — not the full `TableHead` cell — so clicking the padded area of a wide header does not reorder columns.

**Row click navigation:** Pass **`onRowClick`** to navigate to the entity’s intercepting modal route (e.g. `/patients/view/[id]`). Do not hardcode routes inside `DataTable`.

**Leading column visuals:** List rows may place a leading affordance in the first column before the primary label — e.g. **`InitialsBadge`** on `/patients/dashboard`, or a **`size-8` rounded square** (`--color-surface-alt`, `--color-border`) with a **category-mapped Lucide icon** on `/medicines/dashboard` (`MedicinesTable`). Keep colours on design tokens; do not duplicate one-off padding — inherit from `DataTable` cell rules.

### `<SearchFilterBar />` — Search and Filter Row
**Location:** `components/clinic/SearchFilterBar.tsx`

The row containing the search input, filter dropdowns, and export button. Appears on Patients and Appointments dashboards. Props are specific to each use case — keep it flexible via slots.

```tsx
<SearchFilterBar
  searchPlaceholder="Search by name, ID, or phone..."
  filters={<StatusFilter />}
  actions={<ExportButton />}
  onSearch={(value) => ...}
/>
```

### `<DetailForm />` — Entity Detail Form
**Location:** `components/common/DetailForm.tsx`

A generic field-driven form panel wired to React Hook Form and Zod. Pass a **`fields`** array (the only layout mode); it renders one scrollable 2-column grid (`colSpan` controls full-width rows). Exposes **`forwardRef`** + **`DetailFormHandle`** (`submit()`, `reset()`). Footer buttons are **not** included — the parent **`DetailPanel`** (or a custom layout) calls `formRef.current?.submit()` after validation. Optional **`insideForm`**: children rendered inside the same `<Form>` provider above the field grid — use with **`useFormContext`** for cross-field effects (e.g. appointment fee → auto status). Select fields use a **controlled** Radix Select (`value` + `key`) so programmatic default changes stay in sync. Select descriptors may set optional **`selectContentClassName`** (merged onto `<SelectContent />`) — used e.g. to cap dropdown height for long lists without affecting other selects. **`TextField`** descriptors may set optional **`prefix`** (e.g. `₹`, units): renders an input-group shell with a muted, non-editable prefix segment sharing one border with the `<Input />`; focus ring uses **`focus-within`** on the shell. **`type: "number"`** fields may also set **`step`** and **`min`** (forwarded to `<Input />`) — appointment **Fee** uses **`prefix: "₹"`**, `step="0.01"`, `min="0"`. Optional **`readOnly`** on **`TextField`**: uses HTML **`readOnly`** so the value looks like a normal input (no disabled opacity); while the form is saving, the control still becomes **`disabled`**. Staff appointment **Fee** uses **`readOnly`** when the field is visible.

### `<AsyncSearchCombobox />` — server-searched combobox
**Location:** `components/common/AsyncSearchCombobox.tsx`

Popover (`modal={false}` for use inside intercepting `Dialog`s) + shadcn **`Command`** / cmdk with **`shouldFilter={false}`**. Callers pass a debounced async **`fetchItems(query)`**; results render as **`CommandItem`**s with a scroll-capped **`CommandList`** (default ~8 rows via `max-h` + `overflow-y-auto`). Generic **`getOptionValue` / `getOptionLabel`** (and optional **`renderOption`**) keep it reusable for other entities. First consumer: **`AppointmentPatientCombobox`** (`appointments/_components/`) + **`searchPatientsForPicker`**.

### `<DetailPanel />` — Detail Modal / Page Shell
**Location:** `components/common/DetailPanel.tsx`

Layout for entity create/edit: **header** slot, **form** slot (usually `<DetailForm />`), optional **sidebar** (`DetailSidebar` — ~40% width in edit mode) with tabbed content + activity log, **footer** with Save, Cancel, and optional destructive action. Set **`isCreate`** to hide the sidebar and give the form full width.

### `useDetailExit` — post-mutation navigation for detail panels
**Location:** `lib/hooks/use-detail-exit.ts`

Entity panels (**`PatientDetailPanel`**, **`AppointmentDetailPanel`**, **`MedicineDetailPanel`**) call **`useDetailExit({ listHref, onClose })`** and invoke **`exitAfterMutation()`** after a successful save, delete/deactivate, or (medicines) reactivation confirm. **Intercepting modal** routes pass **`onClose`** (typically **`router.back()`** via a small `*ViewModalClient` / `New*ModalClient` wrapper) so the list behind the modal keeps its URL state; **`exitAfterMutation`** wraps **`onClose()`** and **`router.refresh()`** in React **`startTransition`** so navigation and refresh are coordinated as one transition (avoids an immediate post-**`back`** refresh targeting the wrong segment). **Full-page** `/view/[id]` and `/new` routes omit **`onClose`** so **`exitAfterMutation`** uses **`router.replace(listHref)`** (entity dashboard) then an **immediate** **`router.refresh()`**. **Cancel** still uses **`onClose ?? (() => router.back())`** on the panel — unchanged.

### `<DetailSidebar />` — Tabbed Sidebar + Activity Log
**Location:** `components/common/DetailSidebar.tsx`

Optional top **tabs** (`sidebarTabs`) and a persistent bottom **events** list (`EventLog`-compatible entries). Used inside `DetailPanel` for documents, related lists, and audit-style activity.

### `<ModalShell />` — Intercepting Modal Wrapper
**Location:** `components/common/ModalShell.tsx`

Wrapper for intercepting route modals, built on shadcn **`Dialog`** (Radix) without modifying `components/ui/dialog.tsx`. It composes **`Dialog`**, **`DialogPortal`**, **`DialogOverlay`**, **`DialogTitle`** (screen-reader-only name from the `label` prop), and Radix **`Dialog.Content`** with clinic sizing and styling. **Radix provides:** focus trap, focus restoration on close, scroll lock, `aria-modal` / dialog role, and escape / outside-pointer dismissal (with optional `closeOnEscape` / `closeOnBackdropClick` overrides). The shell is **always `open`** while the route is active; closing calls `onClose` or **`router.back()`**. Overlay fill uses **`var(--color-modal-overlay)`**; panel shadow uses **`var(--shadow-modal)`** (both defined in `globals.css`). Width/height presets match **`modal-shell-sizes.ts`** (shared with **`ModalDetailSkeleton`**).

---

## 6. Calendar Components

### Month View — Appointments Dashboard
The Appointments dashboard view uses a **two-panel layout**:
- **Left panel:** `<MonthMiniCalendar />` — a Shadcn `<Calendar />` component used as a date navigator. Clicking a date filters the right panel. Also shows a scheduled/cancelled count summary below it. Also shows a Today's Waitlist section below the summary.
- **Right panel:** `<UpcomingAppointmentsList />` — a list/table of upcoming appointments with Date, Patient, Doctor, Type, and Status columns. Has an "All Doctors" filter dropdown.

This is a custom layout, **not** FullCalendar. Use Shadcn's `<Calendar />` for the mini calendar only.

### Week & Day View — Appointments Dashboard
The week and day views use **FullCalendar** with the `timeGridWeek` and `timeGridDay` plugins.

```tsx
// Install these packages:
// @fullcalendar/react
// @fullcalendar/timegrid
// @fullcalendar/daygrid
// @fullcalendar/interaction  ← install now, enables drag-and-drop later
```

**Custom event rendering:** Use FullCalendar's `eventContent` prop to render `<AppointmentEventCard />` instead of the default event block. The card shows the standard appointment heading (`formatAppointmentHeading`), visit-type badge, and time range with a coloured left border based on **category**.

**Appointment category colours** (shared by month chips and time-grid cards): defined in `lib/appointment-calendar-styles.ts` as `CATEGORY_COLORS` / `CATEGORY_LABELS`, keyed by DB **`appointment_category`**: **general** → blue emphasis (`--color-blue-bg-strong` / `--color-blue-border-emphasis`), **orthopedic** → amber, **physiotherapy** → green. Event titles use **`formatAppointmentHeading`** (`Category - Visit Type` or with optional title in parentheses).

**Month view chips** show `time · patientFirstName` using `patientFirstName` from the calendar query (not parsed from `patientName`). Derive chip time and day grouping from `parseISO(start)` + `format` (local timezone), not substrings of the UTC ISO string.

**View toggle:** Month / Week / Day buttons in the PageHeader actions area control which view is shown. Store this in the URL via `nuqs` (use `useQueryStates` to natively batch simultaneous `view` and `date` state updates to prevent flicker) so the selected view survives refresh and is shareable. Interactive tab buttons in the view control match `TopNav` link behavior (`hover:text-primary`), and icon arrows match with `hover:bg-surface-alt`.

**Time Grid Scroll:** In Day and Week views, use FullCalendar's `scrollTime` with a `-2` hour offset to position the current time smoothly in the viewport.

**Rule — what goes in the URL vs useState:**
- URL via `nuqs`: anything that affects what data is fetched or what the user sees — search, filters, pagination, selected date, calendar view mode
- `useState`: pure UI state with no data or shareability implications — e.g. whether a dropdown is open, whether a panel is expanded

---

## 7. Design Tokens

### Colour Palette
```css
--bg:           #F0EEE6   /* App background — warm off-white */
--surface:      #FAFAF7   /* Cards, sidebar, navbar */
--surface-alt:  #F5F3EC   /* Table row hover, input backgrounds */
--border:       #E2DDD4   /* All borders and dividers */

--text-primary:   #1A1A18  /* Headings, body text */
--text-secondary: #7A7769  /* Labels, subtitles */
--text-muted:     #A8A395  /* Placeholders, timestamps */

--green:    #2D9B6F  --green-bg:  #E6F5EE
--amber:    #D97706  --amber-bg:  #FEF3C7
--red:      #DC2626  --red-bg:    #FEE2E2
--blue:     #2563EB  --blue-bg:   #EFF6FF
--purple:   #7C3AED  --purple-bg: #F5F3FF
```

**Intercepting modal (`ModalShell`):** `--color-modal-overlay` (scrim, `color-mix` on text primary) and `--shadow-modal` (panel elevation). Declared in `globals.css` `@theme inline`; consume only via `var(…)` in components.

### Typography
- **Display / Page titles:** DM Serif Display — used for `<h1>` page titles and the brand name only.
- **All other text:** DM Sans — UI labels, body, table content, buttons.
- **Chart IDs:** Monospace font (e.g. `font-mono` in Tailwind) for `#PT-` / `#STF-` style identifiers. Format via `lib/utils/chart-id.ts`.

### Spacing & Radius
- Page content padding: `px-10 py-9`
- Card border radius: `rounded-xl` (12px)
- Button / badge border radius: `rounded-lg` (8px) for buttons, `rounded-full` for status badges
- All borders: `1px solid var(--border)`

### Shadows
Avoid heavy shadows. Use borders instead of box-shadows for card separation. The design is flat and border-defined.

---

## 8. Forms & Validation Rules

- Every form uses **React Hook Form** with a **Zod schema** from `lib/validators/`.
- Zod schemas are the **single source of truth** — the same schema is used for both client-side form validation and server-side API/action validation. Never duplicate validation logic.
- Forms that create or edit records open in an **intercepting modal** (Dialog). Full-page forms are only used if a form is too complex for a modal (more than ~8 fields).
- On submit: show a loading state on the submit button (disabled + spinner). On success: leave the detail surface via **`useDetailExit`** (§5 — modal: **`startTransition`** around **`onClose`** + **`router.refresh()`**; full-page: **`router.replace`** then immediate **`router.refresh()`**), and show a Sonner toast. On error: show field-level errors from Zod, show a Sonner error toast for server errors.

---

## 9. Data Fetching Rules

- All data fetching uses **Next.js Server Actions** or **Route Handlers**.
- **Server-side pagination, filtering, and sorting** for all list views. The client never holds a full dataset.
- Every list view passes `page`, `pageSize`, `search`, `sort`, and any entity-specific filters as URL search params so that the state is shareable and survives refresh. The appointments calendar also stores the selected date and view mode (month/week/day) in the URL.
- Use `nuqs` to manage all URL search params as typed state. Filter/search/pagination components are `"use client"` and use `useQueryState` to read and write params. Dashboard `page.tsx` files are async Server Components that read `searchParams` directly and pass them to server actions — no `useEffect`, no client-side refetching, no intermediate client shell components.
- Always reset `page` to `1` when search or any filter changes.
- Always show `<Skeleton />` rows in the DataTable while data is loading. Never show an empty state during initial load.

---

## 10. Multi-Tenancy Rules (UI Layer)

- `clinicId` is never passed through the UI as a prop or stored in client state. It is resolved server-side from the authenticated session on every request.
- Never expose `clinicId` in URLs.
- The `chartId` (patients: e.g. `#PT-8821`; staff: e.g. `#STF-101`) is the user-facing identifier shown in the UI. The internal UUID is never shown to clinic staff.

---

## 11. RBAC — UI Visibility Rules

UI elements are shown or hidden based on the current user's role. The role is available from the session server-side and should be passed to the layout via a server component.

| Feature | Staff | Doctor | Admin |
|---|---|---|---|
| Users management link (top nav) | Hidden | Hidden | Visible |
| "Delete / Deactivate" action on Patients | Hidden | Visible | Visible |
| "Delete" actions on Documents | Hidden | Visible | Visible |
| "Edit / Deactivate" actions on Medicines | Visible | Visible | Visible |
| "Deactivate" action on Appointments | Visible | Visible | Visible |
| New Patient button | Visible | Visible | Visible |
| New Appointment button | Visible | Visible | Visible |

**Rule:** Never rely on UI hiding alone for access control. All server actions and API routes must also enforce role checks. UI hiding is for UX only, not security.

---

## 12. General Rules for AI Agents

- **Do not install new UI libraries** without checking this document first. The approved libraries are: Shadcn/UI, TanStack Table, FullCalendar, React Hook Form, Zod, Sonner, nuqs.
- **Do not modify files in `components/ui/`** directly, except for global baseline fixes like adding `cursor-pointer` to button variants. Compose from them in `components/clinic/` or `components/layout/`.
- **Always use the `<Badge />` component** from `components/clinic/Badge.tsx` for any status, type, or ID indicator. Do not create inline badge styles.
- **Always use `<PageHeader />`** at the top of every page. Do not create one-off page headers.
- **Always use `<DataTable />`** for list views. Do not build ad-hoc tables.
- **Zod schemas live in `lib/validators/`** — never define validation inline in a component or action file.
- **Colours must use CSS variables** defined in the design tokens section. Do not hardcode hex values in component files.
- **All text uses DM Sans.** DM Serif Display is used only for `<h1>` page titles and the brand name.
