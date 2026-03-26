# 05 — Authentication & Session Management

This document covers the authentication strategy, session shape, middleware, and tenant resolution.

---

## 1. Strategy Overview

- **Provider:** Better-Auth with Drizzle adapter
- **Method:** Email + password only (MVP). OAuth is deferred post-MVP.
- **Session type:** Database-backed sessions (not JWT)
- **Session expiry:** 7 days
- **Password reset:** Not implemented in MVP
- **Multi-tenancy:** Clinic context is resolved from subdomain, not from user input

---

## 2. Session Implementation

Auth is implemented via Better-Auth with a real `getSession()` function in `lib/auth/session.ts`. All server actions and data fetching must call this function — never access session data any other way, and never hardcode user IDs or clinic IDs anywhere in code.

**Location:** `lib/auth/session.ts`

```typescript
export interface AppSession {
  user: {
    id: string;
    clinicId: string;
    clinicSubdomain: string; // from `clinics.subdomain` (same query as user)
    clinicName: string; // from `clinics.name` — safe for client UI (e.g. sidebar)
    type: "admin" | "doctor" | "staff";
    firstName: string;
    lastName: string;
    email: string;
  };
}

export async function getSession(): Promise<AppSession> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error("UNAUTHORIZED");

  // Fetch user inner-joined to clinics — includes clinics.subdomain as clinicSubdomain
  const row = await db
    .select({
      id: users.id,
      clinicId: users.clinicId,
      clinicSubdomain: clinics.subdomain,
      clinicName: clinics.name,
      type: users.type,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
    })
    .from(users)
    .innerJoin(clinics, eq(users.clinicId, clinics.id))
    .where(eq(users.id, session.user.id))
    .limit(1);
  if (!row[0]) throw new Error("USER_NOT_FOUND");

  // Validate user belongs to the clinic derived from the request subdomain
  const subdomainClinicId = (await headers()).get("x-clinic-id");
  if (subdomainClinicId && row[0].clinicId !== subdomainClinicId) {
    throw new Error("CLINIC_MISMATCH");
  }

  return { user: { id, clinicId, clinicSubdomain, clinicName, type, firstName, lastName, email } };
}
```

**Rules:**
- Every server action must start with `const session = await getSession()`
- `session.user.clinicId` is the source of truth for all database queries — never hardcode the clinicId anywhere else
- `session.user.clinicSubdomain` is loaded with the user (no extra clinic round-trip) and is the tenant slug for path-based features such as S3 object keys
- `session.user.clinicName` is the clinic display name from `clinics.name` (safe to pass to client components; never pass `clinicId`)
- `app/(app)/layout.tsx` builds the public clinic logo URL from `ASSETS_BASE_URL` and `session.user.clinicSubdomain` (`lib/clinic/build-clinic-logo-url.ts` — `{ASSETS_BASE_URL}/{subdomain}/assets/logo/logo.png`) and passes it to `SideNav`; the sidebar clinic mark (`ClinicBrandMark` in `SideNav`) shows a Shadcn **`Skeleton`** while the logo `<img>` loads (image stays in the DOM with `opacity-0` so the fetch is not deferred), then the logo on `onLoad`, or **`InitialsBadge`** on `onError` with the image removed — no broken icon
- `session.user.type` is the source of truth for all role checks

---

## 3. Auth Configuration (Better-Auth)

**Location:** `lib/auth/index.ts`

```typescript
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema: { user, session, account, verification } }),
  emailAndPassword: { enabled: true, requireEmailVerification: false },
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  advanced: {
    crossSubDomainCookies: {
      enabled: process.env.NODE_ENV === "production",
      domain:
        process.env.NODE_ENV === "production"
          ? ".clinicforce.app"
          : ".localhost",
    },
  },
  trustedOrigins:
    process.env.NODE_ENV === "production"
      ? [
          "https://clinicforce.app",
          "https://*.clinicforce.app",
        ]
      : [
          "http://localhost:3000",
          "http://*.localhost:3000",
        ],
});
```

`advanced.crossSubDomainCookies` is enabled only when `NODE_ENV === "production"`. In production it sets the session cookie `Domain` to `.clinicforce.app` so the same Better-Auth session is available on any tenant subdomain. In local development it is disabled so the cookie is not scoped with `Domain=.localhost` (browsers such as Chrome reject that attribute on `localhost`).

Better Auth matches `trustedOrigins` with **glob strings** (`*` / `?`), not `RegExp` literals — see `matchesOriginPattern` in better-auth. Production uses apex `https://clinicforce.app` plus `https://*.clinicforce.app`; development uses `http://localhost:3000` plus `http://*.localhost:3000` for tenant subdomains.

### Database Tables
Better-Auth manages these tables via the Drizzle adapter. Schema is defined in `03-Database-Schema.md`.
- `users` — extended with `clinicId`, `type`, `firstName`, `lastName`, `chartId`, `isActive`
- `sessions` — standard Better-Auth session table
- `accounts` — for future OAuth providers
- `verifications` — for future email verification / password reset

---

## 4. Multi-Tenancy via Subdomains

Each clinic is accessed via its own subdomain: `{subdomain}.clinicforce.com`

For example: `riverside.clinicforce.com`, `downtown.clinicforce.com`

The subdomain is the `subdomain` column in the `clinics` table. This is already in the schema.

### How it works (pipeline)

1. **Middleware** (`middleware.ts`, Node runtime): reads **`x-forwarded-host`** (first, for reverse proxies such as Cloudflare) then **`host`** → subdomain → `getClinicIdBySubdomain()` (shared with `GET /api/clinic` in `lib/clinic/resolve-by-subdomain.ts`). Requires a session cookie for protected routes; sets **`x-clinic-id`** and **`x-subdomain`** on the forwarded request. No subdomain or unknown clinic → redirect to `/login`.
2. **`getSession()`**: loads the user from the DB (joined to `clinics` for `clinicSubdomain`). If **`x-clinic-id`** is present, it must equal `user.clinicId` or **`CLINIC_MISMATCH`** is thrown — so a user cannot use a session on another tenant’s host.

**Why two steps?** Middleware binds the **HTTP request** to a tenant before RSC/server actions run. The session binds the **user** to a clinic. Both are required; `clinicSubdomain` on the session is the DB slug (e.g. S3 paths), not a replacement for middleware resolution.

### `GET /api/clinic?subdomain=`

Optional JSON resolver: returns `{ clinicId }` for a subdomain (same DB query as middleware). The in-app UI does not need to call it for normal navigation; use it for tooling or external clients.

### Local Development
Use `riverside.localhost:3000` — modern browsers resolve this correctly without any `/etc/hosts` changes.

### DNS Requirement (production)
A wildcard DNS record `*.clinicforce.com` pointing to the server. This is a hosting/deployment concern, not a code concern.

---

## 5. Route Protection

All routes under `app/(app)/` are protected. Unauthenticated users are redirected to `/login`.

Protection is enforced in two places:
1. **Middleware** — fast check before the page renders, redirects to `/login` if no session
2. **Layout server component** — `app/(app)/layout.tsx` calls `getSession()` and redirects to `/login` on failure (e.g. invalid or missing session), as a safety net

The `app/(auth)/` route group (login page) is public and must never call `getSession()`.

```typescript
// app/(app)/layout.tsx (illustrative)
import { cookies } from "next/headers"
import { getSession } from "@/lib/auth/session"
import { redirect } from "next/navigation"
import {
  SIDEBAR_COLLAPSED_COOKIE_NAME,
  parseSidebarCollapsedCookie,
} from "@/lib/constants/sidebar"
import { USER_TYPE_LABELS } from "@/lib/constants/user"

export default async function AppLayout({ children, modal }) {
  try {
    const session = await getSession()
    const displayName =
      [session.user.firstName, session.user.lastName].filter(Boolean).join(" ") || session.user.email
    const userTypeLabel = USER_TYPE_LABELS[session.user.type]
    const cookieStore = await cookies()
    const initialCollapsed = parseSidebarCollapsedCookie(
      cookieStore.get(SIDEBAR_COLLAPSED_COOKIE_NAME)?.value
    )
    return (
      <AppShell
        modal={modal}
        userDisplayName={displayName}
        userTypeLabel={userTypeLabel}
        avatarSeed={session.user.id}
        initialCollapsed={initialCollapsed}
      >
        {children}
      </AppShell>
    )
  } catch {
    redirect("/login")
  }
}
```

---

## 6. Using Session in Server Actions

Every server action must retrieve the session as its first operation. Never trust data from the client for `clinicId` or role.

```typescript
// Example server action pattern
"use server"
import { getSession } from "@/lib/auth/session"

export async function createPatient(input: CreatePatientInput) {
  const session = await getSession()

  // 1. Auth check — session must exist
  if (!session) throw new Error("Unauthorized")

  // 2. Role check — enforce RBAC before any DB operation
  if (!["admin", "doctor", "staff"].includes(session.user.type)) {
    throw new Error("Forbidden")
  }

  // 3. Always use clinicId from session, never from input
  const { clinicId, id: createdBy } = session.user

  // 4. Proceed with database operation
  await db.insert(patients).values({ ...input, clinicId, createdBy })
}
```

---

## 7. Login Page

**Route:** `/login` (inside `app/(auth)/`)

- **Forms + types:** The login form uses `useForm({ resolver: zodResolver(loginSchema) })` without an explicit generic (so types infer from the resolver), `z.infer<typeof loginSchema>` for the submit handler, and no `defaultValues` for Zod `.default()` fields such as `rememberMe`.
- **UI-only (see `docs/06-UI-Design-System.md`):** Left-panel testimonial carousel with dot navigation; password field visibility toggle; footer copyright year from `new Date().getFullYear()`. These do not change auth behaviour.
- Email + password form
- On success: redirect to `/home/dashboard`
- On failure: show inline error message — do not use a toast for auth errors, show them next to the form
- No "remember me" toggle — session is always 7 days
- No "forgot password" link in MVP — can be added later as a single isolated feature
- The login page must be the only page accessible without a session

---

## 8. Implementation Status

Auth integration is complete. All items below are done.

- [x] Install Better-Auth and Drizzle adapter
- [x] Configure `lib/auth/index.ts`
- [x] Better-Auth schema tables in DB (`users`, `sessions`, `accounts`, `verifications`)
- [x] Real `getSession()` in `lib/auth/session.ts` with clinic mismatch validation
- [x] Build `/login` page UI and wire to Better-Auth `signIn`
- [x] Middleware for session-based route protection
- [x] Subdomain middleware for clinic context (`x-clinic-id` header)
- [x] `app/api/clinic/route.ts` subdomain resolver (shared query with middleware via `lib/clinic/resolve-by-subdomain.ts`)
- [x] RBAC: `requireRole()` + `ForbiddenError` in `lib/auth/rbac.ts`
- [x] All server actions gate-checked with `getSession()` + `requireRole()`

**Remaining (post-MVP):**
- [ ] Password reset flow
- [ ] Email verification
