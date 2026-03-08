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

## 2. Mock Session (Development)

Auth is intentionally deferred until core functionality is built. During development, a hardcoded `getSession()` function is used as a stand-in. All server actions and data fetching must call this function — never access session data any other way. When real auth is wired up, only this one file changes.

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
  // TODO: Replace with real Better-Auth session when auth is implemented
  return {
    user: {
      id: "yn5d3vkdpzxzmare7bac8baj",
      clinicId: "3ba05aa6-b010-44a5-a556-dcc793c49792",
      type: "admin" as const,
      firstName: "Dev",
      lastName: "User",
      email: "dev@clinicforce.com",
    },
  };
}
```

**Rules while using the mock session:**
- Every server action must start with `const session = await getSession()`
- `session.user.clinicId` is the source of truth for all database queries — never hardcode the clinicId anywhere else
- `session.user.type` is the source of truth for all role checks
- Test different roles by temporarily changing `type` in the mock — do not build role-switching UI

---

## 3. Real Auth Implementation (Better-Auth)

To be implemented after core features are complete. This section documents the target state.

### Setup

```typescript
// lib/auth/auth.ts
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { db } from "@/lib/db"

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: { enabled: true },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days in seconds
  },
})
```

### Session Shape (Real)
When Better-Auth is wired up, `getSession()` is replaced with a function that:
1. Reads the Better-Auth session from the request cookies
2. Joins the session with the `users` table to get `clinicId`, `type`, `firstName`, `lastName`
3. Returns the same `AppSession` interface — the shape does not change

The `AppSession` interface in `lib/auth/session.ts` is the contract. Better-Auth's internal session object is mapped to it before being returned. Nothing outside `lib/auth/session.ts` should ever import from Better-Auth directly.

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
3. Middleware looks up the clinic by subdomain in the database
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
2. **Layout server component** — `app/(app)/layout.tsx` calls `getSession()` and redirects if null, as a safety net

The `app/(auth)/` route group (login page) is public and must never call `getSession()`.

```typescript
// app/(app)/layout.tsx
import { getSession } from "@/lib/auth/session"
import { redirect } from "next/navigation"

export default async function AppLayout({ children }) {
  const session = await getSession()
  if (!session) redirect("/login")
  // pass session to layout as needed
  return <AppShell session={session}>{children}</AppShell>
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

## 8. Implementation Checklist

Use this when the time comes to replace the mock session with real auth.

- [ ] Install Better-Auth and Drizzle adapter
- [ ] Configure `lib/auth/auth.ts`
- [ ] Run Better-Auth migration to generate session/account tables
- [ ] Replace mock `getSession()` in `lib/auth/session.ts` with real implementation
- [ ] Build `/login` page UI and wire to Better-Auth `signIn`
- [ ] Add middleware for session-based route protection
- [ ] Add subdomain middleware for clinic context
- [ ] Test with two separate clinic subdomains to verify data isolation
- [ ] Verify that changing `clinicId` in a request cannot access another clinic's data
