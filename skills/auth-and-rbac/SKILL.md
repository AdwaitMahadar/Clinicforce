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
| `lib/auth/index.ts` | Better-Auth config — email+password, 7-day sessions; `session.cookieCache` enabled (5 min) to cut session DB round-trips; `advanced.crossSubDomainCookies` enabled only in prod (`Domain=.clinicforce.app`); off in dev (avoids `Domain=.localhost` cookie rejection); `trustedOrigins` by `NODE_ENV` (apex + `https://*.clinicforce.app` in prod; `localhost` + `http://*.localhost:3000` in dev — glob patterns, not RegExp) |
| `lib/auth/session.ts` | `getSession()` — the ONLY way to get session data in server code; wrapped in React `cache()` so repeated calls in one request reuse the first result |
| `lib/auth/rbac.ts` | `requireRole()` + `ForbiddenError` — server-action RBAC enforcement |
| `lib/auth/require-permission.ts` | `requirePermission(permission, redirectTo?)` — server-side page guard; calls `getSession()` + `hasPermission()` and redirects if unauthorised; returns session |
| `lib/auth/session-context.tsx` | `AppSessionProvider`, `useAppSession()`, `usePermission()` — client-side session context + permission hook; no extra server calls |
| `lib/auth/client.ts` | `authClient`, `signIn`, `signOut`, `signUp`, `useSession` for client components |
| `lib/permissions.ts` | `PERMISSIONS` map, `Permission` type, `hasPermission(role, permission)` — single source of truth for all UI role decisions |
| `components/common/RoleGate.tsx` | `<RoleGate permission="...">` — declarative UI permission gate |
| `app/api/auth/[...all]/route.ts` | Better-Auth catch-all route handler |
| `app/api/clinic/route.ts` | Optional `GET ?subdomain=` → `{ clinicId, name }` — same `getActiveClinicBySubdomain` as middleware; tooling / external clients |
| `lib/clinic/resolve-by-subdomain.ts` | `getActiveClinicBySubdomain` / `getClinicIdBySubdomain` — active clinic by subdomain |
| `lib/clinic/extract-subdomain-from-host.ts` | Host header → subdomain (shared: `middleware` + login server page) |
| `middleware.ts` | Node runtime; `extractSubdomainFromHost` → resolver → guards routes → `x-clinic-id` + `x-subdomain`; matcher skips static paths so `public/` assets bypass middleware |
| `app/(auth)/login/page.tsx` | Server: host → subdomain → clinic name + logo URL props |
| `app/(auth)/clinic-not-found/page.tsx` | Server: static page when subdomain doesn't match an active clinic; shares split-screen UI with `/login` |
| `app/(auth)/_components/AuthPanelLeft.tsx` | Pure UI split-screen left panel shared between `/login` and `/clinic-not-found` |
| `app/(auth)/login/login-page-client.tsx` | Client UI + RHF/Zod/Sonner; `useForm` + `zodResolver` without explicit generic (see `docs/04-API-Specification.md`); **`signIn.email`:** `await` and read **`{ data, error }`** — do not rely on **`fetchOptions.onError`** alone (200 + error-shaped JSON); toast invalid credentials vs generic error; clear loading on failure only |

### Request pipeline

- **Middleware** — Binds the request to a tenant (`x-forwarded-host` then `host` → **`extractSubdomainFromHost`** → `clinicId` via in-memory cache, DB on miss); forwards **`x-clinic-id`** and **`x-subdomain`**. Requires session cookie on protected routes.
- **`getSession()`** — Loads user + `clinicSubdomain` + `clinicName` (join to `clinics`); strictly requires **`x-clinic-id`** to be set by middleware (throws **`MISSING_CLINIC_CONTEXT`** if missing) and throws **`CLINIC_MISMATCH`** if `x-clinic-id` ≠ `user.clinicId`. Deduplicated per request via React `cache()`. Middleware and session serve different jobs (request vs user); both stay.

### Middleware Behaviour

1. **`config.matcher`** excludes `_next/static`, `_next/image`, `favicon.ico`, and URL paths ending in listed static extensions (see `docs/05-Authentication.md` section 4) so root-level public files are not redirected.
2. Public paths (`/login`, `/clinic-not-found`, `/api/auth/*`, `/api/clinic`, `/_next/*`, `/favicon.ico`) pass through without checks.
3. No subdomain (apex / non-tenant host) → If `pathname === "/"`, pass through to render marketing root (`/`). Otherwise, redirect to `/` to trap all un-routed apex requests to the marketing page.
4. Subdomain extracted from `x-forwarded-host` or `host` (`demo-clinic.localhost:3000` → `demo-clinic`). Apex `clinicforce.app` is explicitly trapped and returned as `null` to avoid falsely resolving "clinicforce". `clinicId` from in-memory map (cap 500, FIFO eviction) or `getClinicIdBySubdomain()` on miss. Does not cache unknown/inactive subdomains.
5. Subdomain but no active clinic → redirect to `/clinic-not-found`.
6. If no Better-Auth session cookie → redirect to `/login?returnUrl=<path>`.
7. On success, `x-clinic-id` and `x-subdomain` headers are forwarded to server components.

**Proxy / Railway:** If subdomain resolution looks wrong behind a reverse proxy, temporarily log `x-forwarded-host`, `host`, and the extracted subdomain in middleware and check platform logs; remove before ship (`docs/10-Environments-and-Dev-Workflow.md`).

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
    clinicName: string; // from clinics.name — safe for UI; never expose clinicId client-side
    type: "admin" | "doctor" | "staff";
    firstName: string;
    lastName: string;
    email: string;
  };
}
```

*   **`session.user.clinicId`** — ONLY acceptable source for DB query scoping.
*   **`session.user.clinicSubdomain`** — tenant slug from DB (e.g. S3 key prefix); not a substitute for `clinicId` in SQL filters.
*   **`session.user.clinicName`** — display name for branding (also used with env-based public logo URL in `app/(app)/layout.tsx`).
*   **`session.user.type`** — ONLY acceptable source for role checks.

## 🖥️ Client-Side Session Context

`app/(app)/layout.tsx` mounts `<AppSessionProvider>` with a safe subset of `AppSession.user` (`type`, `firstName`, `lastName`, `email`, `clinicName` — never `id`, `clinicId`, `clinicSubdomain`). This flows into the whole `app/(app)/` tree with no extra server round-trips.

**Usage in client components:**

```typescript
// Hook form — returns the full context value
import { useAppSession } from "@/lib/auth/session-context";
const { user } = useAppSession(); // user.type, user.firstName, …

// Boolean check for a single permission
import { usePermission } from "@/lib/auth/session-context";
const canDelete = usePermission("deletePatient"); // true for all roles (patient deactivate/reactivate)

// Declarative gate — renders children or fallback
import { RoleGate } from "@/components/common/RoleGate";
<RoleGate permission="manageUsers"><UserPanel /></RoleGate>
```

**Rules:**
- Add new permissions to `lib/permissions.ts` only — never inline role arrays in components.
- UI gating is UX-only; server actions must still call `requireRole()` from `lib/auth/rbac.ts`.
- `useAppSession()` / `usePermission()` throw outside `app/(app)/` (outside `AppSessionProvider`).

## 🔒 Server Page Guard — `requirePermission()`

Use in Server Component page files to lock a page to specific roles without hardcoding role strings:

```typescript
import { requirePermission } from "@/lib/auth/require-permission";

// Guard only (session not needed downstream):
await requirePermission("viewMedicines");

// Guard + session (no second getSession() call needed):
const session = await requirePermission("manageUsers");
```

- Calls `getSession()` (React `cache()` — one DB hit per request regardless of how many times it's called)
- Calls `hasPermission()` from `lib/permissions.ts` — no hardcoded role strings
- Redirects to `/home/dashboard` (or custom `redirectTo`) if unauthorised
- Returns the `AppSession` so callers can use `session.user.*` fields directly
- All medicines pages use `await requirePermission("viewMedicines")` as their single-line guard

## 🔐 RBAC Permission Matrix

| Feature | Staff | Doctor | Admin |
| :--- | :--- | :--- | :--- |
| **Users Management** | — | — | Full CRUD |
| **Appointments** | Full CRUD | Full CRUD | Full CRUD |
| **Patients** | View / Create / Update | Full CRUD | Full CRUD |
| **Documents** | **No access** (presign/view/upload API blocked; empty lists + no search hits) | View / upload / delete | View / upload / delete |
| **Prescriptions** (structured Rx) | **No access** (`viewPrescriptions` / `createPrescription`) | View + mutate | View + mutate |
| **Medicines** | **No access** | Full CRUD | Full CRUD |
| **Appt. clinical notes + patient past history** | **Hidden + API redacted** | Full | Full |
| **Appt. title field (form) + title API** | **Hidden; create stores null; update strips title; reads return `title: null`** | Full | Full |
| **Detail right column + main-column Documents/Appointments tabs** | **Hidden** (Details-only, tab bar hidden) | Visible | Visible |

Staff **cannot** delete patients or documents, or **view/upload/open** documents (`getUploadPresignedUrl` / `confirmDocumentUpload` / `getViewPresignedUrl` → `requireRole(session, ["admin", "doctor"])`; `getPatientDetail` / `getAppointmentDetail` return empty document arrays; `searchGlobal` skips the documents query; `UniversalSearch` hides the Documents group via `viewDocuments`). **Prescriptions** mirror documents: `viewPrescriptions` / `createPrescription` are admin+doctor only; staff get no tab / list and actions **`requireRole(session, ["admin", "doctor"])`**; **`getPatientDetail`** → **`prescriptions: []`**; **`getAppointmentDetail`** → **`prescription: null`**, **`prescriptionHistory: []`**. Staff has **no access to medicines** (nav tab hidden; every medicines `page.tsx` uses `requirePermission("viewMedicines")`; server actions `requireRole(session, ["admin", "doctor"])`; `searchGlobal` skips medicines query → `medicines: []`; `UniversalSearch` hides Medicines group via `viewMedicines`). Appointment `notes` and patient `pastHistoryNotes` are hidden in UI and **redacted/ignored in patient + appointment server actions** for staff. The **detail right column** (activity log + optional patient summary) and **main-column Documents/Appointments tabs** are hidden for staff — `DetailPanel` gates both via `usePermission("viewDetailSidebar")`. `ModalDetailPanelBodySkeleton` applies the **same `noSidebar` logic** so the Suspense fallback skeleton matches the final rendered layout with no layout shift.

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
- **Do not** inline role arrays (`["admin", "doctor"]`) in components for UI gating — add a named permission to `lib/permissions.ts` and use `usePermission()` or `<RoleGate>`.
- **Do not** pass `id`, `clinicId`, or `clinicSubdomain` into `AppSessionProvider` — those fields are server-only and must never reach the client.
- **Do not** allow staff to access any medicines route — UI hide alone is not enough; all medicines server actions use `requireRole(session, ["admin", "doctor"])` and all medicines pages/modals use `await requirePermission("viewMedicines")`.
- **Do not** write `session.user.type === "staff"` (or any inline role string) in page files — use `requirePermission()` from `lib/auth/require-permission.ts` instead.

## References
- `docs/05-Authentication.md` — Complete auth flow, session shape, middleware, and implementation status.
- `docs/01-PRD.md` — Core project requirements and scope constraints.
- `CLAUDE.md` — General project constraints and rules.
