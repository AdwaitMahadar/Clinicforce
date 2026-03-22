# 05 — Authentication & Session Management

This document covers the authentication strategy, session shape, middleware protection, and the mock session approach used during development.

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
    type: "admin" | "doctor" | "staff";
    firstName: string;
    lastName: string;
    email: string;
  };
}

export async function getSession(): Promise<AppSession> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error("UNAUTHORIZED");

  // Fetch extended fields (clinicId, type) from the users table
  const dbUser = await db.select(...).from(users).where(eq(users.id, session.user.id)).limit(1);
  if (!dbUser[0]) throw new Error("USER_NOT_FOUND");

  // Validate user belongs to the clinic derived from the request subdomain
  const subdomainClinicId = (await headers()).get("x-clinic-id");
  if (subdomainClinicId && dbUser[0].clinicId !== subdomainClinicId) {
    throw new Error("CLINIC_MISMATCH");
  }

  return { user: { id, clinicId, type, firstName, lastName, email } };
}
```

**Rules:**
- Every server action must start with `const session = await getSession()`
- `session.user.clinicId` is the source of truth for all database queries — never hardcode the clinicId anywhere else
- `session.user.type` is the source of truth for all role checks

---

## 3. Auth Configuration (Better-Auth)

**Location:** `lib/auth/index.ts`

```typescript
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema: { user, session, account, verification } }),
  emailAndPassword: { enabled: true, requireEmailVerification: false },
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  trustedOrigins: [
    process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
    "http://demo-clinic.localhost:3000",
    // TODO (production): replace with dynamic origin validation for *.clinicforce.com
  ],
});
```

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

### How it works
1. A request comes in to `riverside.clinicforce.com`
2. Next.js middleware reads the hostname, extracts `riverside`
3. Middleware resolves the clinic with a direct Drizzle query on the `clinics` table (same logic as `GET /api/clinic`, shared in `lib/clinic/resolve-by-subdomain.ts`). Middleware runs on the **Node.js** runtime (`config.runtime: 'nodejs'`) so it can use the `pg` pool — no internal HTTP fetch per navigation.
4. The `clinicId` is attached to the request (via a header or cookie)
5. `getSession()` reads this alongside the user session to construct the full `AppSession`

### Middleware (target implementation)

```typescript
// middleware.ts
import { NextRequest, NextResponse } from "next/server"

export async function middleware(req: NextRequest) {
  const hostname = req.headers.get("host") || ""
  const subdomain = hostname.split(".")[0]

  // Skip for localhost and non-subdomain requests
  if (subdomain === "localhost" || subdomain === "www") {
    return NextResponse.next()
  }

  // Attach subdomain to request headers for use in getSession()
  const response = NextResponse.next()
  response.headers.set("x-clinic-subdomain", subdomain)
  return response
}
```

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
import { getSession } from "@/lib/auth/session"
import { redirect } from "next/navigation"
import { USER_TYPE_LABELS } from "@/lib/constants/user"

export default async function AppLayout({ children, modal }) {
  try {
    const session = await getSession()
    const displayName =
      [session.user.firstName, session.user.lastName].filter(Boolean).join(" ") || session.user.email
    const userTypeLabel = USER_TYPE_LABELS[session.user.type]
    return (
      <AppShell modal={modal} userDisplayName={displayName} userTypeLabel={userTypeLabel}>
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
- [ ] Wildcard `trustedOrigins` for `*.clinicforce.com` (see TODO in `lib/auth/index.ts`)
- [ ] Password reset flow
- [ ] Email verification
