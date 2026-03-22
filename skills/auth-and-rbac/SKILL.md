---
name: auth-and-rbac
description: Context-routing skill for authentication, user sessions, and role-based access control (RBAC). You MUST use this skill whenever working on user auth flows, Better-Auth integration, protecting server actions, checking user roles (admin, doctor, staff), or enforcing any permissions in the application.
---

# Auth & RBAC Skill

This skill provides critical context for handling authentication, user sessions, and Role-Based Access Control (RBAC) in Clinicforce.

## 🚨 Authentication Strategy & Flow

Clinicforce uses **Better-Auth** with the Drizzle ORM adapter (PostgreSQL provider) and database-backed sessions (not JWT). Auth is fully implemented — there is no mock session.

### Infrastructure

| File | Role |
| :--- | :--- |
| `lib/auth/index.ts` | Better-Auth config — email+password, 7-day sessions, `trustedOrigins` |
| `lib/auth/session.ts` | `getSession()` — the ONLY way to get session data in server code |
| `lib/auth/rbac.ts` | `requireRole()` + `ForbiddenError` |
| `lib/auth/client.ts` | `authClient`, `signIn`, `signOut`, `signUp`, `useSession` for client components |
| `app/api/auth/[...all]/route.ts` | Better-Auth catch-all route handler |
| `app/api/clinic/route.ts` | Optional `GET ?subdomain=` → `{ clinicId }` — same query as middleware; not used by in-app navigation |
| `lib/clinic/resolve-by-subdomain.ts` | Shared Drizzle lookup for active clinic by subdomain |
| `middleware.ts` | Node runtime; extracts subdomain, calls resolver, guards routes, sets `x-clinic-id` + `x-subdomain` |
| `app/(auth)/login/page.tsx` | Login page — client component, React Hook Form + Zod, Sonner toasts |

### Request pipeline

- **Middleware** — Binds the request to a tenant (`Host` → subdomain → `clinicId`); forwards **`x-clinic-id`** and **`x-subdomain`**. Requires session cookie on protected routes.
- **`getSession()`** — Loads user + `clinicSubdomain` (join to `clinics`); throws **`CLINIC_MISMATCH`** if `x-clinic-id` ≠ `user.clinicId`. Middleware and session serve different jobs (request vs user); both stay.

### Middleware Behaviour

1. Public paths (`/login`, `/api/auth/*`, `/api/clinic`, `/_next/*`, `/favicon.ico`) pass through without checks.
2. Subdomain is extracted from the `host` header (`demo-clinic.localhost:3000` → `demo-clinic`).
3. Middleware calls `getClinicIdBySubdomain()` (Drizzle) to resolve `clinicId` — no internal HTTP round-trip.
4. If no Better-Auth session cookie → redirect to `/login?returnUrl=<path>`.
5. On success, `x-clinic-id` and `x-subdomain` headers are forwarded to server components.

### The `getSession()` Pattern

```typescript
import { getSession } from "@/lib/auth/session";

// In any server action:
const session = await getSession();
// Throws "UNAUTHORIZED" if no session
// Throws "CLINIC_MISMATCH" if user's clinicId ≠ subdomain's clinicId
```

The `AppSession` interface is the contract — never import from Better-Auth directly outside `lib/auth/`:

```typescript
export interface AppSession {
  user: {
    id: string;
    clinicId: string;
    clinicSubdomain: string; // from clinics row (joined in getSession)
    type: "admin" | "doctor" | "staff";
    firstName: string;
    lastName: string;
    email: string;
  };
}
```

*   **`session.user.clinicId`** — ONLY acceptable source for DB query scoping.
*   **`session.user.clinicSubdomain`** — tenant slug from DB (e.g. S3 key prefix); not a substitute for `clinicId` in SQL filters.
*   **`session.user.type`** — ONLY acceptable source for role checks.

## 🔐 RBAC Permission Matrix

| Feature | Staff | Doctor | Admin |
| :--- | :--- | :--- | :--- |
| **Users Management** | — | — | Full CRUD |
| **Appointments** | Full CRUD | Full CRUD | Full CRUD |
| **Patients** | View / Create / Update | Full CRUD | Full CRUD |
| **Documents** | View / Upload | Full CRUD | Full CRUD |
| **Medicines** | View / Create | Update / Delete | Full CRUD |

Staff **can** cancel/delete appointments. Staff **cannot** delete patients, documents, or medicines.

### `requireRole()` Usage

```typescript
import { requireRole, ForbiddenError } from "@/lib/auth/rbac";

export async function someAction(input: unknown) {
  const session = await getSession();              // 1. Auth check
  requireRole(session, ["admin", "doctor"]);       // 2. RBAC check — throws ForbiddenError
  const { clinicId } = session.user;              // 3. Scope from session, never client

  try {
    // ... DB operation scoped with clinicId
    return { success: true as const, data: result };
  } catch (err) {
    if (err instanceof ForbiddenError) return { success: false as const, error: "FORBIDDEN" };
    console.error("[someAction]", err);
    return { success: false as const, error: "Failed to perform action." };
  }
}
```

## ❌ DO NOT

- **Do not** write custom session retrieval logic. Always call `getSession()` from `lib/auth/session.ts`.
- **Do not** edit the mock session or hardcode user/clinic IDs anywhere in code — those stubs are gone.
- **Do not** rely solely on client-side routing or UI hiding to protect features. Server actions must enforce RBAC independently.
- **Do not** allow unauthenticated access to any route inside `app/(app)/`. Only `app/(auth)/` routes are public.
- **Do not** trust the client for `clinicId` or `type`. Always pull from `session.user`.
- **Do not** call Better-Auth APIs directly from client components — use the exported helpers from `lib/auth/client.ts`.

## References
- `docs/05-Authentication.md` — Complete auth flow, session shape, middleware, and implementation status.
- `docs/01-PRD.md` — Core project requirements and scope constraints.
- `CLAUDE.md` — General project constraints and rules.
