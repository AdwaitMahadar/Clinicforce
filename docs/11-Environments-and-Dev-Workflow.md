# 11 — Environments & Development Workflow

This document defines the three-environment model for Clinicforce, how each environment is configured, and the rules for working across them.

---

## 1. The Three Environments

| Environment | Purpose | Database | File Storage | URL |
|---|---|---|---|---|
| **Local** | Day-to-day development | Docker Postgres | Minio (Docker) | `*.localhost:3000` |
| **Staging** | Test against real infra before shipping | Neon `staging` branch | Cloudflare R2 | `staging.clinicforce.app` (future) |
| **Production** | Real clinics, real data | Neon `production` branch | Cloudflare R2 | `*.clinicforce.app` |

**The rule:** you develop locally, verify on staging, ship to production. Environments never share data. Production is never used for testing.

---

## 2. Local Environment

### What runs locally
- Next.js dev server (`pnpm dev`) on `localhost:3000`
- PostgreSQL via Docker Compose
- Minio (S3-compatible) via Docker Compose

### Starting local services
```bash
docker-compose up -d    # starts Postgres + Minio in background
pnpm dev                # starts Next.js
```

### `.env.local` (never commit)
```bash
# DATABASE
DATABASE_URL="postgresql://clinicforce:clinicforce_secret@localhost:5432/clinicforce_dev"

# BETTER-AUTH
BETTER_AUTH_SECRET="your-local-secret"
BETTER_AUTH_URL="http://localhost:3000"

# FILE STORAGE — Minio
S3_ENDPOINT="http://localhost:9000"
S3_REGION="us-east-1"
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin_secret"
S3_BUCKET_NAME="clinicforce-docs"

# PUBLIC ASSET URL — browser-facing prefix for `{subdomain}/assets/...` (e.g. clinic logos)
ASSETS_BASE_URL="http://localhost:9000/clinicforce-docs"

# APP
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

### Local subdomain testing
Modern browsers resolve `*.localhost` automatically — no `/etc/hosts` changes needed.

- `demo-clinic.localhost:3000` → resolves to your local app
- The middleware extracts `demo-clinic` as the subdomain
- You need a matching row in your local `clinics` table with `subdomain = 'demo-clinic'`

### Running migrations locally
```bash
pnpm drizzle-kit migrate
```
This runs against your local Docker Postgres (via `DATABASE_URL` in `.env.local`). Run this every time you add or change a schema file.

### Seed script (`scripts/seed.ts`)

Edit the **SEED CONFIG** block at the top of the file, then run:

```bash
pnpm tsx scripts/seed.ts list-clinics   # inspect tenant rows
pnpm tsx scripts/seed.ts list-users     # inspect staff users + clinic

pnpm tsx scripts/seed.ts clinic         # insert one clinic row
pnpm tsx scripts/seed.ts user            # Better-Auth sign-up, then Drizzle patch for clinicId / type / chartId, etc.
```

- Loads `.env.local` by default (`DATABASE_URL`, `BETTER_AUTH_SECRET`, …). Override `DATABASE_URL` on the command line to point at Neon or another DB without editing the file.
- **Users:** created via `auth.api.signUpEmail` (password hashing + `accounts` row), then `users` is updated with `clinicId`, `firstName`, `lastName`, `type`, `chartId`, etc. Do not insert passwords directly into SQL.
- Set `USER_SEED.clinicId` (paste from `list-clinics`) **or** `USER_SEED.clinicSubdomain` before running `user`.

---

## 3. Staging Environment

### Purpose
Staging exists to catch issues that only appear on real infrastructure — subdomain routing, Cloudflare proxy headers, R2 file uploads, Neon SSL connections — before they affect production clinics.

### What staging uses
- **Database:** Neon `staging` branch (isolated from production, same schema)
- **File storage:** Cloudflare R2 (same bucket as production, different folder prefix — or separate bucket if preferred)
- **Hosting:** Railway production environment (same deployment, driven by env vars)

### Debugging subdomain routing (Railway / reverse proxies)

If tenant resolution fails or users are redirected to `/login` when they should not be, the platform may be sending a different `Host` or `x-forwarded-host` than the browser address bar suggests. Middleware prefers **`x-forwarded-host`** over **`host`** (see `docs/05-Authentication.md` §4). To see what the Node middleware actually receives, add a **temporary** `console.log` of both headers plus the extracted subdomain in `middleware.ts` immediately before the no-subdomain branch (note: public paths return earlier, so hit a protected route to trigger the log), inspect **Railway deployment logs** (or your host’s log stream), then **remove** the log before merging or releasing.

### `.env.staging` (never commit — local use only)
Use this file when you want to run the app locally but pointed at Neon staging instead of Docker. Switch to it manually only when specifically testing cloud infrastructure.

```bash
# DATABASE — Neon staging branch
DATABASE_URL="postgresql://neondb_owner:...@....us-east-1.aws.neon.tech/neondb?sslmode=require"

# BETTER-AUTH
BETTER_AUTH_SECRET="same-as-production-or-separate"
BETTER_AUTH_URL="http://localhost:3000"

# FILE STORAGE — Cloudflare R2
S3_ENDPOINT="https://<account-id>.r2.cloudflarestorage.com"
S3_REGION="auto"
S3_ACCESS_KEY="your-r2-access-key"
S3_SECRET_KEY="your-r2-secret-key"
S3_BUCKET_NAME="clinicforce-docs"

# PUBLIC ASSET URL — browser-facing prefix for `{subdomain}/assets/...` (R2 custom domain or CDN)
ASSETS_BASE_URL="https://assets.clinicforce.app"

# APP
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

To use it temporarily:
```bash
# Mac/Linux
DATABASE_URL="..." S3_ENDPOINT="..." pnpm dev

# Or copy .env.staging to .env.local temporarily — just don't commit it
```

### Running migrations against Neon staging
```bash
DATABASE_URL="<neon staging connection string>" pnpm drizzle-kit migrate
```

---

## 4. Production Environment

### What production uses
- **Hosting:** Railway (`clinicforce.app`, `*.clinicforce.app`)
- **Database:** Neon `production` branch
- **File storage:** Cloudflare R2
- **DNS + SSL:** Cloudflare (wildcard `*.clinicforce.app`)

### Environment variables (set in Railway dashboard)
```bash
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://clinicforce.app
BETTER_AUTH_URL=https://clinicforce.app
BETTER_AUTH_SECRET=<production secret — never share>
DATABASE_URL=<neon production connection string>
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_REGION=auto
S3_ACCESS_KEY=<r2 access key>
S3_SECRET_KEY=<r2 secret key>
S3_BUCKET_NAME=clinicforce-docs
ASSETS_BASE_URL=https://assets.clinicforce.app
```

### Deployments
Every push to the `master` branch on GitHub triggers an automatic Railway deployment. No manual steps needed.

### Running migrations against production
Never run migrations against production from your local machine unless it is an emergency. The correct flow is:

1. Write and test the migration locally
2. Run it against Neon staging, verify it works
3. Merge to `master` — Railway deploys automatically
4. Run the migration against Neon production:

```bash
DATABASE_URL="<neon production connection string>" pnpm drizzle-kit migrate
```

---

## 5. Onboarding a New Clinic

Since there is no self-serve signup, new clinics are provisioned manually via a seed script or directly in the Neon SQL editor.

### Via Neon SQL editor (quickest)
Go to Neon dashboard → your project → SQL Editor. Run:

```sql
INSERT INTO clinics (id, name, subdomain, email, is_active, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'MedLife Clinic',
  'medlife',
  'admin@medlife.com',
  true,
  now(),
  now()
);
```

The clinic is immediately live at `medlife.clinicforce.app` — no DNS changes, no redeployment needed. The wildcard DNS record handles it automatically.

### Via seed script (recommended for repeatability)
Use `scripts/seed.ts` (see §2 Local — Seed script). Example:
```bash
DATABASE_URL="<neon production connection string>" pnpm tsx scripts/seed.ts clinic
DATABASE_URL="<neon production connection string>" pnpm tsx scripts/seed.ts user
```

### After creating the clinic
You also need to create the first admin user for that clinic so staff can log in. Prefer `pnpm tsx scripts/seed.ts user` (Better-Auth `signUpEmail` + Drizzle update for `clinicId` / RBAC). Do not insert raw passwords into the `accounts` table directly.

---

## 6. The Migration Workflow

| Situation | Command | Target |
|---|---|---|
| Local schema change | `pnpm drizzle-kit migrate` | Docker Postgres |
| Test migration on staging | `DATABASE_URL="<staging>" pnpm drizzle-kit migrate` | Neon staging |
| Ship to production | `DATABASE_URL="<production>" pnpm drizzle-kit migrate` | Neon production |
| Generate new migration file | `pnpm drizzle-kit generate` | Creates file only, no DB change |

**Never** run `drizzle-kit push` against production — always use `migrate` with explicit migration files so changes are tracked and reversible.

---

## 7. What Lives Where (Summary)

```
.env.local          ← Docker Postgres + Minio — committed to .gitignore, never to Git
.env.staging        ← Neon staging + R2 — committed to .gitignore, never to Git
Railway Variables   ← Neon production + R2 — set in Railway dashboard only
```

The `.gitignore` should include:
```
.env.local
.env.staging
.env*.local
```

---

## 8. Service Accounts & Credentials

Keep a secure record (e.g. a password manager) of:

| Service | What to store |
|---|---|
| Neon | Project URL, production connection string, staging connection string |
| Cloudflare R2 | Account ID, bucket name, Access Key ID, Secret Access Key |
| Railway | Project ID, `BETTER_AUTH_SECRET` value |
| Cloudflare DNS | Login — owns `clinicforce.app` and all subdomain routing |

If any of these credentials are rotated, update Railway environment variables and redeploy.
