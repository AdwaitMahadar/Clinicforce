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

## What's Next (Phase 2)

- **Shadcn/UI init** — install the component library (Button, Input, Card, etc.)
- **AppShell layout** — the top navigation bar (Home, Appointments, Patients, Medicines) and left sidebar (Dashboard, Reports)
- **Route structure** — create the `/{entity}/dashboard` page skeletons
- **Auth middleware** — protect all `(app)` routes so non-logged-in users are redirected to `/login`
