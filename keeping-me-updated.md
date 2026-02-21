# Phase 1 — What We Built & How to Verify It

A plain-English breakdown of everything set up in Phase 1, written for someone new to this stack.

---

## The Big Picture

We built the **foundation** of the Clinicforce app. Think of it like constructing a building:
- The **Next.js project** is the building frame
- **Docker** runs the database and file storage as separate services in the background
- **Drizzle ORM + schema files** define the shape of all data (like designing the rooms in the building)
- **Migration** actually creates those rooms (tables) in the real database
- **Better-Auth** handles who can walk in the front door (login)

---

## 1. Next.js 15 Project (The Framework)

### What it is
Next.js is the web framework the entire app is built on. It handles routing (which URL shows which page), server logic, and rendering. We used version 15 with the **App Router** — a modern file-system-based routing system where a file at `app/(auth)/login/page.tsx` automatically becomes the `/login` page.

**TypeScript strict mode** means the code editor and compiler will catch type mistakes before they become bugs at runtime.

### Key files created
| File | What it does |
|---|---|
| `app/layout.tsx` | The root HTML shell — wraps every page. Loads fonts. |
| `app/page.tsx` | The root `/` route — immediately redirects to `/login` |
| `app/globals.css` | Global styles and design tokens (colour palette, fonts) |
| `tsconfig.json` | TypeScript config — `"strict": true` is the important bit |
| `package.json` | Lists all dependencies and runnable scripts |

### How to verify
Open `tsconfig.json` and confirm:
```json
"strict": true
```
Run the dev server (after Docker is up):
```bash
pnpm dev
```
Visit `http://localhost:3000` — you should be redirected to `http://localhost:3000/login`.

---

## 2. Docker Compose — PostgreSQL & Minio (The Database & File Storage)

### What it is
**Docker** is a tool that runs software in isolated containers — like a mini computer-within-your-computer. We defined two services in `docker-compose.yml`:

- **PostgreSQL** — the main database where all clinic data lives (patients, appointments, etc.)
- **Minio** — an open-source file storage server. It behaves exactly like Amazon S3, but runs locally. This is where uploaded documents (lab reports, X-rays, etc.) will be stored.

### Key files
| File | What it does |
|---|---|
| `docker-compose.yml` | Defines both services, their credentials, and which ports they use |

### Ports used
| Service | Port | What you can access |
|---|---|---|
| PostgreSQL | `5432` | Database connections |
| Minio S3 API | `9000` | File upload/download |
| Minio Web Console | `9001` | Visual file browser UI |

### How to verify

**Check containers are running:**
```bash
docker compose ps
```
You should see both `clinicforce_db` and `clinicforce_minio` with status `Up`.

**Open the Minio web console in your browser:**
```
http://localhost:9001
```
Login with:
- Username: `minioadmin`
- Password: `minioadmin_secret`

You'll see a clean file browser UI — this is where uploaded clinic documents will live.

**Connect to the database directly:**
```bash
docker exec clinicforce_db psql -U clinicforce -d clinicforce_dev -c "\dt"
```
This lists all the tables. You should see 9 rows.

---

## 3. Environment Variables — `.env.local` (Secrets & Config)

### What it is
Environment variables are settings that change between environments (local dev vs. production server). We never hardcode secrets like database passwords in code — they live in `.env.local` which is **never committed to Git**.

`.env.example` is the safe version — it shows the structure without real secrets, so teammates know what variables they need.

### Key variables
| Variable | What it's for |
|---|---|
| `DATABASE_URL` | Connection string so the app can talk to PostgreSQL |
| `BETTER_AUTH_SECRET` | A cryptographic secret used to sign login sessions |
| `BETTER_AUTH_URL` | The URL of the app (used by the auth system) |
| `S3_ENDPOINT` | Where Minio is running (locally: `http://localhost:9000`) |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | Credentials to upload/download files to Minio |
| `S3_BUCKET_NAME` | The name of the "folder" in Minio where files are stored |

### How to verify
Open `.env.local` — you should see all variables filled in with real values (not placeholders).

The `BETTER_AUTH_SECRET` was generated with:
```bash
openssl rand -hex 32
```
This creates a cryptographically random 64-character string.

---

## 4. Drizzle ORM Schema (Defining the Database Structure)

### What it is
**ORM** stands for Object-Relational Mapper. Instead of writing raw SQL like:
```sql
CREATE TABLE patients (id UUID, first_name TEXT, ...);
```
We write TypeScript code in `lib/db/schema/` that describes the same thing — and Drizzle converts it to SQL for us.

This means the database structure and the TypeScript types are always in sync — if you add a column in the schema file, TypeScript will immediately know about it everywhere in the app.

### Schema files created
| File | Tables inside | What it represents |
|---|---|---|
| `lib/db/schema/clinics.ts` | `clinics` | The SaaS tenant — one row per clinic |
| `lib/db/schema/auth.ts` | `users`, `sessions`, `accounts`, `verifications` | Login system tables (managed by Better-Auth) |
| `lib/db/schema/patients.ts` | `patients` | Patient medical records |
| `lib/db/schema/appointments.ts` | `appointments` | Clinical visit records |
| `lib/db/schema/documents.ts` | `documents` | Uploaded file metadata |
| `lib/db/schema/medicines.ts` | `medicines` | Medicine reference library |
| `lib/db/schema/index.ts` | (re-exports all) | Single import point for entire schema |

### The `clinicId` pattern (Multi-tenancy)
Almost every table has a `clinicId` column. This is the **multi-tenancy** design — one database, many clinics, but each clinic can only see its own data. Every database query in the app will always include `WHERE clinic_id = ?`.

### How to verify
Open any schema file, e.g. `lib/db/schema/patients.ts`. You'll see TypeScript that looks like:
```ts
export const patients = pgTable("patients", {
  id: uuid("id").primaryKey().defaultRandom(),
  clinicId: uuid("clinic_id").notNull().references(() => clinics.id),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  // ...
});
```
This is the source of truth for what the `patients` table looks like.

---

## 5. Drizzle Config & Migration (Creating the Real Database Tables)

### What it is
Writing schema files doesn't change the actual database — it's just TypeScript. The migration process has two steps:

**Step 1 — Generate:** Drizzle reads your schema files and writes a `.sql` file describing what SQL to run.
```bash
pnpm db:generate
```
This created: `lib/db/migrations/0000_mixed_risque.sql`

**Step 2 — Migrate:** Drizzle connects to the live PostgreSQL database and runs that SQL file.
```bash
pnpm db:migrate
```

### The dotenv fix
`drizzle-kit` is a standalone CLI tool — it doesn't know about Next.js's `.env.local` convention. We added this to the top of `drizzle.config.ts` to explicitly load it:
```ts
import { config } from "dotenv";
config({ path: ".env.local" });
```

### How to verify
**See the generated SQL:**
Open `lib/db/migrations/0000_mixed_risque.sql` — you'll see raw `CREATE TABLE` statements.

**Confirm tables in the database:**
```bash
docker exec clinicforce_db psql -U clinicforce -d clinicforce_dev -c "\dt"
```
Expected output:
```
 public | accounts      | table | clinicforce
 public | appointments  | table | clinicforce
 public | clinics       | table | clinicforce
 public | documents     | table | clinicforce
 public | medicines     | table | clinicforce
 public | patients      | table | clinicforce
 public | sessions      | table | clinicforce
 public | users         | table | clinicforce
 public | verifications | table | clinicforce
(9 rows)
```

**Open Drizzle Studio (a visual DB browser):**
```bash
pnpm db:studio
```
Visit the URL it prints — you'll see a GUI to browse and edit rows in every table.

---

## 6. Better-Auth (Login System)

### What it is
**Better-Auth** is the authentication library. It handles:
- Storing password hashes securely in the `accounts` table
- Creating and validating session tokens in the `sessions` table
- The `/api/auth/*` API routes automatically

We configured it with:
- **Email + Password** sign-in (only method for this internal staff app)
- **7-day sessions** — staff stay logged in for a week
- **Drizzle adapter** — Better-Auth reads/writes directly into our PostgreSQL tables

### Key files
| File | What it does |
|---|---|
| `lib/auth/index.ts` | Server-side auth config — used in API routes and server components |
| `lib/auth/client.ts` | Browser-side auth client — exports `signIn`, `signOut`, `useSession` hooks |
| `app/api/auth/[...all]/route.ts` | The catch-all API route — Better-Auth handles every `/api/auth/*` request |

### How to verify
Once the dev server is running (`pnpm dev`), visit:
```
http://localhost:3000/api/auth/get-session
```
It should return `null` (no active session yet) — but importantly it should return valid JSON, not a 404 error. This confirms Better-Auth is wired up.

---

## 7. Login Page

### What it is
The UI for signing in. Lives at `app/(auth)/login/page.tsx`.

The `(auth)` in the folder name is a **Route Group** — the parentheses tell Next.js not to include that word in the URL. So the file is at `(auth)/login/page.tsx` but the URL is just `/login`.

When staff submit the form, it calls `signIn.email()` from Better-Auth's client library. On success, it redirects to `/patients/dashboard` (the main app).

### Route groups created
| Folder | URL prefix | Purpose |
|---|---|---|
| `app/(auth)/` | (none) | Login page — centered layout, no navigation |
| `app/(app)/` | (none) | Authenticated app — will have TopNav + SideNav in Phase 2 |

### How to verify
With `pnpm dev` running, visit `http://localhost:3000` — you should land on a login page with:
- The Clinicforce logo and name
- Email and password fields
- A "Sign in" button

---

## Full Verification Checklist

Run through these steps top to bottom to confirm everything is working:

```bash
# 1. Confirm Docker containers are running
docker compose ps

# 2. Confirm all 9 DB tables exist
docker exec clinicforce_db psql -U clinicforce -d clinicforce_dev -c "\dt"

# 3. Start the dev server
pnpm dev
```

Then in your browser:
- [ ] `http://localhost:3000` → redirects to `/login`
- [ ] `http://localhost:3000/login` → shows the login page
- [ ] `http://localhost:3000/api/auth/get-session` → returns `{"session":null,"user":null}` (valid JSON)
- [ ] `http://localhost:9001` → Minio console (login: `minioadmin` / `minioadmin_secret`)

---

## Useful Commands to Know

```bash
# Start all Docker services (Postgres + Minio)
docker compose up -d

# Stop all Docker services
docker compose down

# Start dev server
pnpm dev

# If you change a schema file, regenerate and re-apply migrations:
pnpm db:generate
pnpm db:migrate

# Visual database browser
pnpm db:studio

# Check what's in the database via terminal
docker exec clinicforce_db psql -U clinicforce -d clinicforce_dev -c "\dt"
```

---

## What's Next (Phase 3)

- **Auth middleware** — protect all `(app)` routes so unauthenticated users are redirected to `/login`
- **Patients DataTable** — server-side paginated, filtered, sorted table for `patients/dashboard`
- **Appointments calendar** — schedule view for `appointments/dashboard`
- **Patient detail page** — `/patients/[patientId]` with tabs for records, appointments, documents

---

---

# Phase 2 — UI Shell & Navigation

Everything in this phase is about making the app *look and feel* like the design. No new database logic — purely UI structure.

---

## The Big Picture

Phase 2 built the **app shell** — the chrome around every page:

- The **warm beige background** you see on every screen
- The **floating nav island** at the top with entity links and search
- The **collapsible left sidebar** showing Dashboard / Reports for the current section
- The **floating main content card** — the white rounded panel that holds each page
- **8 route pages** (1 real, 7 stubs) to fill the shell

---

## 8. Shadcn/UI (Component Library)

### What it is
**Shadcn/UI** is not a regular npm package. It's a code generator — it **copies component source files** directly into your project so you own the code completely and can customise it without a library version mismatch.

It uses **Tailwind CSS v4** for styling and **Radix UI** under the hood for accessible primitives (dropdowns, dialogs, etc.).

### How it was initialised
```bash
pnpm dlx shadcn@latest init --defaults -y
```
This created:
- `components.json` — Shadcn config file (component paths, style, TSX toggle)
- `lib/utils.ts` — The `cn()` helper (merges Tailwind class names cleanly)

### Components installed
```bash
pnpm dlx shadcn@latest add button badge avatar skeleton separator tooltip dialog sheet dropdown-menu popover form input select textarea checkbox calendar table command
```

All component files land in `components/ui/`:

| Component file | What it's used for |
|---|---|
| `button.tsx` | Primary action buttons (e.g. "New Appt") |
| `badge.tsx` | Status pills (Confirmed, Pending, Cancelled) |
| `avatar.tsx` | User profile pictures |
| `skeleton.tsx` | Loading placeholder shimmer |
| `separator.tsx` | Horizontal/vertical dividers |
| `tooltip.tsx` | Hover tooltips (requires `TooltipProvider` in root layout) |
| `dialog.tsx` | Modal dialogs |
| `sheet.tsx` | Slide-in side panels |
| `dropdown-menu.tsx` | Dropdown/context menus |
| `popover.tsx` | Floating popover panels |
| `input.tsx` | Text input fields |
| `form.tsx` | React Hook Form integration |
| `select.tsx` | Dropdown selects |
| `textarea.tsx` | Multi-line text areas |
| `checkbox.tsx` | Checkboxes |
| `calendar.tsx` | Date picker calendar |
| `table.tsx` | Styled table shell |
| `command.tsx` | Command palette (search + keyboard navigation) |

### If you want to add more components later
```bash
pnpm dlx shadcn@latest add [component-name]
# Examples:
pnpm dlx shadcn@latest add tabs
pnpm dlx shadcn@latest add accordion
```

---

## 9. Design Tokens — `app/globals.css`

### What it is
This is the **single source of truth** for the app's colour palette, fonts, and spacing. Every colour in the UI comes from a CSS variable defined here — **no hardcoded hex values** anywhere in component files.

### Where to adjust colours
Open `app/globals.css`. The key section is the `:root {}` block:

```css
:root {
  --background:  #F0EEE6;  /* ← App-level warm beige background */
  --foreground:  #1A1A18;  /* ← Default text colour */
  /* ...etc */
}
```

And the `@theme inline {}` block defines the named tokens:

| Token | Value | Where it shows up |
|---|---|---|
| `--color-bg` | `#F0EEE6` | The app-level beige canvas |
| `--color-surface` | `#FAFAF7` | Cards, sidebar, navbar background |
| `--color-surface-alt` | `#F5F3EC` | Table row hover, input backgrounds |
| `--color-border` | `#E2DDD4` | All borders and dividers |
| `--color-text-primary` | `#1A1A18` | Headings, body text |
| `--color-text-secondary` | `#7A7769` | Labels, subtitles, inactive nav items |
| `--color-text-muted` | `#A8A395` | Placeholders, timestamps |
| `--color-green` / `--color-green-bg` | `#2D9B6F` / `#E6F5EE` | "Confirmed" status |
| `--color-amber` / `--color-amber-bg` | `#D97706` / `#FEF3C7` | "Pending" status |
| `--color-red` / `--color-red-bg` | `#DC2626` / `#FEE2E2` | "Cancelled" / destructive |

**To change any colour app-wide** — edit the value once in `globals.css` and it updates everywhere automatically.

### Fonts
The app uses two Google Fonts loaded in `app/layout.tsx`:
- **DM Sans** — body text, labels, UI (`var(--font-sans)`)
- **DM Serif Display** — page titles/headings (`var(--font-serif)`)

To change fonts, update the `DM_Sans` / `DM_Serif_Display` imports in `app/layout.tsx` and update the CSS variable names in `globals.css`.

### Global utility classes
Two convenience classes are defined globally (no import needed anywhere):

```css
.glass { ... }       /* Semi-transparent frosted-glass panel */
.main-card { ... }   /* The floating white rounded content card */
```

---

## 10. Layout Components — `components/layout/`

This folder holds all the "chrome" — the UI that surrounds every page. These are **not** page content; they are the persistent frame.

### File map

| File | What it renders | Where it lives in the UI |
|---|---|---|
| `AppShell.tsx` | The root flex container | Wraps everything in `(app)/layout.tsx` |
| `TopNav.tsx` | Centered nav island + right action buttons | Top bar above the main card |
| `SideNav.tsx` | Left sidebar with logo, nav links, user profile | Left side, fixed height |
| `NavItem.tsx` | A single sidebar nav link | Used inside `SideNav.tsx` |
| `PageHeader.tsx` | Page title + subtitle + right action slot | Top of every page's content area |

---

### `AppShell.tsx` — The outer container

```
┌─────────────────────────────────────────────┐
│  SideNav  │  TopNav (above)                  │
│           │  ┌───────────────────────────┐   │
│           │  │  Main Content Card        │   │
│           │  │  (children go here)       │   │
│           │  └───────────────────────────┘   │
└─────────────────────────────────────────────┘
```

**To adjust:** Edit `components/layout/AppShell.tsx`.
- Change sidebar width: look for the `w-60` / `w-20` in `SideNav.tsx`
- Change main card margin/rounding: look for `mx-4 mb-4` and the `.main-card` class in `globals.css`

---

### `TopNav.tsx` — Top navigation island

The **centered floating island** at the top of every page. It contains:
1. **Entity nav links** — Home, Appointments, Patients, Medicines
2. **Search bar** — currently a static input (wired in Phase 3)
3. **Notification bell** — badge with red dot
4. **Help button**
5. **Grid/App button** — dark square on the right

**Active state:** The nav link for the current entity gets a white pill background. This is driven by `usePathname()` — it checks if the current URL starts with that entity's segment.

**To add a new top-level entity:**
Open `components/layout/TopNav.tsx` and add to `NAV_ITEMS`:
```ts
const NAV_ITEMS = [
  { href: "/home/dashboard",      label: "Home",      icon: Home },
  // ↓ Add your new entity here:
  { href: "/staff/dashboard",     label: "Staff",     icon: UserCog },
];
```
Then create the page files at `app/(app)/staff/dashboard/page.tsx` and `app/(app)/staff/reports/page.tsx`.

---

### `SideNav.tsx` — Left sidebar

The **collapsible left sidebar**. It shows:
1. **Logo / brand pill** — "CF" icon + "Clinicforce" wordmark + collapse button
2. **Dashboard** and **Reports** nav links — dynamically link within the current entity
3. **User profile card** at the bottom — initials avatar + name + role

**Context-aware nav links:** The sidebar reads the current entity from the URL. If you're on `/patients/dashboard`, the "Dashboard" link goes to `/patients/dashboard` and the "Reports" link goes to `/patients/reports`. If you navigate to Appointments, those links automatically switch to `/appointments/dashboard` and `/appointments/reports`. You don't need to configure anything — it's automatic.

**Collapsed state:** Clicking the `⊣` icon shrinks the sidebar to icon-only mode (80px wide). Text labels hide; icons remain. Click again to expand.

**To change the user name/role:** Right now it's hardcoded as `Dr. Jenkins / Surgeon`. In Phase 3, this will be replaced with real session data from Better-Auth.
- Temporary change: edit the default prop values at the top of `SideNav.tsx`:
  ```ts
  export function SideNav({ userName = "Dr. Jenkins", userRole = "Surgeon" })
  ```

---

### `PageHeader.tsx` — Page title block

Used at the top of every page's content. Accepts:
- `title` — shown in DM Serif Display (the elegant serif font)
- `subtitle` — smaller grey description line below
- `actions` — a React node (buttons, etc.) rendered on the right side

**Example usage:**
```tsx
<PageHeader
  title="Patients Directory"
  subtitle="Manage patient records, history, and active treatments."
  actions={<Button>+ New Patient</Button>}
/>
```

---

## 11. Route Structure

### How Next.js App Router routing works (quick explainer)

A file at `app/(app)/patients/dashboard/page.tsx` becomes the page at `/patients/dashboard`. The `(app)` in parentheses is a **Route Group** — it groups pages under a shared layout (`app/(app)/layout.tsx`) without adding `(app)` to the URL.

### Full route map

```
/                           → Redirects to /home/dashboard
/login                      → Login page (app/(auth)/login/page.tsx)

/home/dashboard             → ✅ REAL  — Full dashboard (stats, schedule, activity)
/home/reports               → 🔧 STUB — Phase 3

/appointments/dashboard     → 🔧 STUB — Phase 3
/appointments/reports       → 🔧 STUB — Phase 3

/patients/dashboard         → 🔧 STUB — Phase 3
/patients/reports           → 🔧 STUB — Phase 3

/medicines/dashboard        → 🔧 STUB — Phase 3
/medicines/reports          → 🔧 STUB — Phase 3
```

### The `(app)` layout

`app/(app)/layout.tsx` is the authenticated section's layout. **Every page inside `app/(app)/`** inherits this layout. It currently just wraps everything in `<AppShell>`.

When auth middleware is added (Phase 3), the session check will go here — any unauthenticated request gets redirected to `/login` before the page even renders.

### The `(auth)` layout

`app/(auth)/layout.tsx` is a simple centered full-screen layout — no sidebar or top nav. Only the login page lives here.

---

## 12. Home Dashboard — `/home/dashboard`

This is the only **fully implemented** page from Phase 2. It matches the sample screen in `sample-render/screen.png`.

### What's on the page

| Section | Description | Where the data comes from |
|---|---|---|
| **Stat cards** (4 cards) | Total Patients, Appointments, Pending Reports, Growth | Hardcoded placeholder — Phase 3 will fetch from DB |
| **Today's Schedule** table | 4 rows with time, patient initials + name, visit type, status badge | Hardcoded placeholder |
| **Recent Activity** timeline | 4 items with a vertical line + dots | Hardcoded placeholder |
| **"+ New Appt" button** | Top-right action button | No-op (wired in Phase 3) |

**To adjust the layout:** Edit `app/(app)/home/dashboard/page.tsx`.

**Status badge colours** are defined as a lookup object at the top of the file:
```ts
const STATUS_STYLES = {
  confirmed: { bg: "#E6F5EE", text: "#2D9B6F", ... },
  pending:   { bg: "#FEF3C7", text: "#D97706", ... },
  cancelled: { bg: "#FEE2E2", text: "#DC2626", ... },
};
```
To add a new status (e.g. `"no-show"`), add an entry here.

---

## Quick Adjustment Cheatsheet

| I want to… | File to edit |
|---|---|
| Change app background colour | `app/globals.css` → `--background` in `:root` |
| Change card/surface colour | `app/globals.css` → `.main-card` or `.glass` |
| Change the brand name / logo | `components/layout/SideNav.tsx` → the `<span>Clinicforce</span>` element |
| Add a new top-level nav entity | `components/layout/TopNav.tsx` → `NAV_ITEMS` array |
| Add sidebar links beyond Dashboard/Reports | `components/layout/SideNav.tsx` → `SIDEBAR_VIEWS` array |
| Change the logged-in user's name/role | `components/layout/SideNav.tsx` → default props `userName` / `userRole` |
| Change a page's title or subtitle | The page's `<PageHeader title="..." subtitle="..." />` |
| Change status badge colours | `app/(app)/home/dashboard/page.tsx` → `STATUS_STYLES` object |
| Add a new Shadcn component | `pnpm dlx shadcn@latest add [name]` |
| Change sidebar width | `components/layout/SideNav.tsx` → `w-60` (expanded) / `w-20` (collapsed) |
| Change fonts | `app/layout.tsx` → the `DM_Sans` / `DM_Serif_Display` imports |

---

## Updated Verification Checklist (Phase 1 + 2)

Run through these to confirm everything works end-to-end:

```bash
# Start Docker (Postgres + Minio)
docker compose up -d

# Start dev server
pnpm dev
```

Then in your browser, check each route and tick it off:

**Auth flow:**
- [ ] `http://localhost:3000` → redirects to `/home/dashboard`
- [ ] `http://localhost:3000/login` → shows the login page

**App shell (visible on every app page):**
- [ ] Left sidebar shows "Clinicforce" logo, Dashboard + Reports links, Dr. Jenkins at bottom
- [ ] Collapse button (`⊣`) shrinks sidebar to icon-only — expand button (`⊢`) brings it back
- [ ] Top nav island shows Home, Appointments, Patients, Medicines — active one has white pill
- [ ] Notification bell, Help, and dark grid button appear on the right

**Navigation:**
- [ ] Clicking "Appointments" in top nav → goes to `/appointments/dashboard`, "Appointments" pill is active
- [ ] Sidebar "Dashboard" and "Reports" links update to match current entity
- [ ] Clicking "Reports" in sidebar while on Appointments → goes to `/appointments/reports`
- [ ] Clicking "Patients" in top nav → "Patients" active in top nav, sidebar still shows Dashboard/Reports

**Pages:**
- [ ] `/home/dashboard` → Stat cards + schedule table + activity feed
- [ ] `/patients/dashboard` → "Patients Directory" heading + stub placeholder
- [ ] `/appointments/dashboard` → "Appointments" heading + stub placeholder
- [ ] `/medicines/dashboard` → "Medicines Library" heading + stub placeholder
