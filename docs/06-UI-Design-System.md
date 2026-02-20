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

### Left Sidebar (Y-axis) — View Selection
| Key | Label | Description |
|---|---|---|
| `dashboard` | Dashboard | Primary data view for the selected entity |
| `reports` | Reports | Analytics and reporting for the selected entity |

The sidebar always shows both items for all top nav selections in the MVP. No hiding logic is required now but the architecture should support it via a config object in the future.

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
    (.)patients/[id]/
      page.tsx        ← intercepted modal view
  patients/
    dashboard/
      page.tsx        ← list view (stays mounted under modal)
    [id]/
      page.tsx        ← full page fallback (direct URL access)
```

**Rule:** Every entity that supports row-click detail (Patients, Appointments, Medicines, Users) must have both an intercepting modal route and a full-page fallback route. The modal is shown when navigating from within the app; the full page is shown on direct URL access or page refresh.

---

## 3. Folder & File Structure

```
app/
  (app)/                        ← Route group for authenticated app shell
    layout.tsx                  ← AppShell layout (TopNav + SideNav + main)
    home/
      dashboard/page.tsx
      reports/page.tsx
    appointments/
      dashboard/page.tsx
      reports/page.tsx
    patients/
      dashboard/page.tsx
      reports/page.tsx
      [id]/page.tsx             ← Full page patient detail
    medicines/
      dashboard/page.tsx
      reports/page.tsx
      [id]/page.tsx
    @modal/                     ← Parallel route for intercepting modals
      (.)patients/[id]/page.tsx
      (.)appointments/[id]/page.tsx
      (.)medicines/[id]/page.tsx
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
  db/                           ← Drizzle schema and query functions
  validators/                   ← Zod schemas (shared between forms and API)
  auth/                         ← Better-Auth config
  utils/
    avatar.ts                   ← Deterministic colour from name/id hash
```

---

## 4. Component Library Strategy

### Base Layer — Shadcn/UI
Shadcn components live in `components/ui/`. They are owned by the repo (not a node_modules dependency) and should **not be modified directly**. Compose them, don't edit them.

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
  | 'appointmentStatus' // confirmed | pending | cancelled | no-show | rescheduled
  | 'patientStatus'     // active | inactive | critical
  | 'appointmentType'   // general | follow-up | emergency
```

**Colour mapping:**
```ts
// Appointment Status
confirmed    → green background, green text
pending      → amber background, amber text
cancelled    → red background, red text
no-show      → red background, red text
rescheduled  → grey background, grey text

// Patient Status
active       → green background, green text
inactive     → grey background, grey text
critical     → red background, red text

// Chart ID
chartId      → subtle grey background, monospace font, e.g. #PT-8821
              Format: '#PT-' prefix for patients, '#USR-' prefix for users
```

**Usage:**
```tsx
<Badge variant="appointmentStatus" value="confirmed" />
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
**Location:** `components/clinic/DataTable.tsx`

Built on **TanStack Table v8**. Used for all list views (Patients, Appointments, Medicines, Users). Accepts column definitions and data as props.

**Critical: Server-side mode only.** The DataTable does not manage filtering, sorting, or pagination state internally. It receives data and emits change events upward.

```ts
interface DataTableProps<TData> {
  columns: ColumnDef<TData>[]
  data: TData[]
  totalRows: number
  pageIndex: number
  pageSize: number
  onPageChange: (page: number) => void
  onSortChange: (sort: SortingState) => void
  onFilterChange: (filters: ColumnFiltersState) => void
  isLoading?: boolean
}
```

When `isLoading` is true, render skeleton rows instead of data rows. Never show an empty table while data is fetching.

Row click navigation: each row should navigate to the entity's intercepting modal route. Pass an `onRowClick` handler — do not hardcode navigation inside the DataTable component.

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

**Custom event rendering:** Use FullCalendar's `eventContent` prop to render `<AppointmentEventCard />` instead of the default event block. The card shows appointment type, patient name, and time range with a coloured left border based on type.

**Appointment type colours:**
```ts
consultation  → blue
vaccination   → amber/yellow
checkup       → orange
dental        → teal
surgery       → pink/red
emergency     → green
lab test      → purple
therapy       → blue-purple
```

**View toggle:** Month / Week / Day buttons in the PageHeader actions area control which view is shown. This is a local UI state — store in `useState`, not in the URL.

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

### Typography
- **Display / Page titles:** DM Serif Display — used for `<h1>` page titles and the brand name only.
- **All other text:** DM Sans — UI labels, body, table content, buttons.
- **Chart IDs:** Monospace font (e.g. `font-mono` in Tailwind) for `#PT-` style identifiers.

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
- On submit: show a loading state on the submit button (disabled + spinner). On success: close modal, show a Sonner toast, invalidate and refetch the relevant data. On error: show field-level errors from Zod, show a Sonner error toast for server errors.

---

## 9. Data Fetching Rules

- All data fetching uses **Next.js Server Actions** or **Route Handlers**.
- **Server-side pagination, filtering, and sorting** for all list views. The client never holds a full dataset.
- Every list view passes `page`, `pageSize`, `search`, `sort`, and any entity-specific filters as URL search params so that the state is shareable and survives refresh.
- Use `nuqs` library to manage URL search params as typed state. This replaces manual `URLSearchParams` manipulation.
- Always show `<Skeleton />` rows in the DataTable while data is loading. Never show an empty state during initial load.

---

## 10. Multi-Tenancy Rules (UI Layer)

- `clinicId` is never passed through the UI as a prop or stored in client state. It is resolved server-side from the authenticated session on every request.
- Never expose `clinicId` in URLs.
- The `chartId` (e.g. `#PT-8821`) is the user-facing identifier shown in the UI. The internal UUID is never shown to clinic staff.

---

## 11. RBAC — UI Visibility Rules

UI elements are shown or hidden based on the current user's role. The role is available from the session server-side and should be passed to the layout via a server component.

| Feature | Staff | Doctor | Admin |
|---|---|---|---|
| Users management link (top nav) | Hidden | Hidden | Visible |
| "Delete" actions on Patients | Hidden | Visible | Visible |
| "Delete" actions on Documents | Hidden | Visible | Visible |
| "Delete" actions on Medicines | Hidden | Visible | Visible |
| New Patient button | Visible | Visible | Visible |
| New Appointment button | Visible | Visible | Visible |

**Rule:** Never rely on UI hiding alone for access control. All server actions and API routes must also enforce role checks. UI hiding is for UX only, not security.

---

## 12. General Rules for AI Agents

- **Do not install new UI libraries** without checking this document first. The approved libraries are: Shadcn/UI, TanStack Table, FullCalendar, React Hook Form, Zod, Sonner, nuqs.
- **Do not modify files in `components/ui/`** directly. Compose from them in `components/clinic/` or `components/layout/`.
- **Always use the `<Badge />` component** from `components/clinic/Badge.tsx` for any status, type, or ID indicator. Do not create inline badge styles.
- **Always use `<PageHeader />`** at the top of every page. Do not create one-off page headers.
- **Always use `<DataTable />`** for list views. Do not build ad-hoc tables.
- **Zod schemas live in `lib/validators/`** — never define validation inline in a component or action file.
- **Colours must use CSS variables** defined in the design tokens section. Do not hardcode hex values in component files.
- **All text uses DM Sans.** DM Serif Display is used only for `<h1>` page titles and the brand name.
