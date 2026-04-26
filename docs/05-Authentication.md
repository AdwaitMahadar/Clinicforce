# 05 — Authentication & Session Management

This document covers the authentication strategy, session shape, middleware, and tenant resolution.

---

## 1. Strategy Overview

- **Provider:** Better-Auth with Drizzle adapter
- **Method:** Email + password only. OAuth is not implemented (future if needed).
- **Session type:** Database-backed sessions (not JWT)
- **Session cookie cache:** Better-Auth `session.cookieCache` is enabled (5-minute `maxAge`) so repeated session validation avoids hitting the database on every request when the signed cookie cache is still valid.
- **Session expiry:** 7 days
- **Password reset:** Not implemented yet
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

export const getSession = cache(async (): Promise<AppSession> => {
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
});
```

(`import { cache } from "react"` in the real module.) React `cache()` deduplicates by call site within a single request: multiple `await getSession()` invocations during one render / server action chain share the first execution’s result (one Better-Auth read + one user join query per request).

**Rules:**
- Every server action must start with `const session = await getSession()`
- `session.user.clinicId` is the source of truth for all database queries — never hardcode the clinicId anywhere else
- `session.user.clinicSubdomain` is loaded with the user (no extra clinic round-trip) and is the tenant slug for path-based features such as S3 object keys
- `session.user.clinicName` is the clinic display name from `clinics.name` (safe to pass to client components; never pass `clinicId`)
- `app/(app)/layout.tsx` builds the public clinic logo URL from `ASSETS_BASE_URL` and `session.user.clinicSubdomain` (`lib/clinic/build-clinic-logo-url.ts` — `{ASSETS_BASE_URL}/{subdomain}/assets/logo/logo.png`) and passes it to `SideNav`; the sidebar clinic mark (`ClinicBrandMark` in `SideNav`) stacks **`InitialsBadge`** under a CSS **`background-image`** for the logo (`contain`, centered) so initials show through until or unless the asset loads — no skeleton or `<img>` load handlers
- `session.user.type` is the source of truth for all role checks

---

## 3. Auth Configuration (Better-Auth)

**Location:** `lib/auth/index.ts`

```typescript
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema: { user, session, account, verification } }),
  emailAndPassword: { enabled: true, requireEmailVerification: false },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
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

1. **Middleware** (`middleware.ts`, Node runtime): reads **`x-forwarded-host`** (first, for reverse proxies such as Cloudflare) then **`host`** → **`extractSubdomainFromHost()`** in `lib/clinic/extract-subdomain-from-host.ts` (which explicitly returns `null` for the apex `clinicforce.app` to prevent resolving `"clinicforce"`) → resolves `clinicId` via an **in-memory `Map`** (max 500 entries, FIFO eviction on overflow) with **`getClinicIdBySubdomain()`** as fallback on cache miss (same DB lookup as `GET /api/clinic`: **`getActiveClinicBySubdomain()`** in `lib/clinic/resolve-by-subdomain.ts`). Unknown or inactive subdomains are **not** cached (each miss still queries the DB). Requires a session cookie for protected routes; sets **`x-clinic-id`** and **`x-subdomain`** on the forwarded request. **No subdomain** (apex / non-tenant host) → If `pathname === "/"`, pass through to render marketing root (**`/`**). Otherwise, redirect to **`/`** so users always land on the marketing page. **Subdomain** present but no active clinic (`clinicId` not resolved) → redirect to **`/clinic-not-found`** (static public page; path is in **`PUBLIC_PATHS`** so middleware does not loop). The **`config.matcher`** negative lookahead skips **`_next/static`**, **`_next/image`**, **`favicon.ico`**, and any path whose final segment ends in common static extensions (e.g. `.png`, `.svg`, `.woff2`, `.css`, `.js`) so files under **`public/`** (such as `/clinicforce-mark.png`) are not intercepted—Next.js serves them without running middleware.
2. **`getSession()`**: loads the user from the DB (joined to `clinics` for `clinicSubdomain`). It strictly requires **`x-clinic-id`** to be present (throws **`MISSING_CLINIC_CONTEXT`** if missing) and it must equal `user.clinicId` (or **`CLINIC_MISMATCH`** is thrown) — so a user cannot use a session on another tenant’s host or anywhere without a middleware-backed tenant boundary.

**Why two steps?** Middleware binds the **HTTP request** to a tenant before RSC/server actions run. The session binds the **user** to a clinic. Both are required; `clinicSubdomain` on the session is the DB slug (e.g. S3 paths), not a replacement for middleware resolution.

### `GET /api/clinic?subdomain=`

Optional JSON resolver: returns **`{ clinicId, name }`** for an active subdomain (same DB lookup as middleware: `getActiveClinicBySubdomain`). The in-app UI does not need to call it for normal navigation; use it for tooling or external clients. The **`/login`** page resolves tenant name + logo URL in **`app/(auth)/login/page.tsx`** (Server Component) from the same host headers + `buildClinicLogoPublicUrl` — it does not depend on this route.

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

The `app/(auth)/` route group (`/login`, `/clinic-not-found`) is public and must never call `getSession()`.

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

## 6. Server-Side Permission Guard — `requirePermission()`

**Location:** `lib/auth/require-permission.ts`

Use this utility in Server Component page files to enforce page-level access control. It combines `getSession()` and `hasPermission()` in one call — no hardcoded role strings in page files.

```typescript
import { requirePermission } from "@/lib/auth/require-permission";

// Guard only — session not needed:
await requirePermission("viewMedicines");

// Guard + session reuse — avoids a second getSession() call:
const session = await requirePermission("manageUsers");
// session.user.clinicId, session.user.type, etc. are available
```

**Behaviour:**
1. Calls `getSession()` (React-`cache()`-memoised — no extra DB hit if already resolved in the same request).
2. Calls `hasPermission(session.user.type, permission)` from `lib/permissions.ts`.
3. If the user lacks the permission: calls `redirect(redirectTo)` (default `"/home/dashboard"`).
4. Returns the `AppSession` so callers can read session fields without a second `getSession()`.

**Rules:**
- All medicines pages use `await requirePermission("viewMedicines")` — no inline `session.user.type === "staff"` checks anywhere in page files.
- Use `requirePermission` for any future page that must be fully locked to a subset of roles.
- The custom `redirectTo` parameter lets you redirect to a different destination if needed (e.g. a dedicated "access denied" page in the future).

---

## 7. Using Session in Server Actions

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

## 8. Auth Pages (`/login` & `/clinic-not-found`)

**Routes:** Inside `app/(auth)/`

- **Shared UI:** Both pages use a split-screen layout. The left panel (`AuthPanelLeft.tsx`) and an interactive `TestimonialCarousel.tsx` are extracted into `app/(auth)/_components/` and shared between the `/login` and `/clinic-not-found` pages.
- **`/login` Forms + types:** The login form uses `useForm({ resolver: zodResolver(loginSchema) })` without an explicit generic (so types infer from the resolver), `z.infer<typeof loginSchema>` for the submit handler, and no `defaultValues` for Zod `.default()` fields such as `rememberMe`.
- **UI-only (see `docs/06-UI-Design-System.md`):** Password field visibility toggle; footer copyright year from `new Date().getFullYear()`. These do not change auth behaviour.
- Email + password form
- On success: Better-Auth redirects using `callbackURL` passed from the client (`returnUrl` search param when middleware sent the user to login, otherwise `/home/dashboard`).
- On failure: the submit handler **`await`s `signIn.email(...)`** and inspects the **return value**. The Better-Auth client (via `@better-fetch/fetch`) returns `{ data, error }`. **`fetchOptions.onError` is not sufficient on its own:** `onError` runs only for **non-2xx** HTTP responses, while failed email/password sign-in may still come back as **HTTP 200** with a JSON body that lacks a signed-in `user`. Treat **`result.error`** (after mapping 5xx / missing status / 403 to a generic message) or **`result.data` without a `user` object** as failure and show **Sonner** `toast.error("Invalid credentials. Please try again.")`; use **`toast.error("Something went wrong. Please try again.")`** for thrown errors and server/origin-style `result.error` statuses. Reset submit loading on every failure path; on success the page navigates away so loading state need not be cleared.
- **Remember me:** optional checkbox exists in the form schema/UI; session length is still governed by Better-Auth `session.expiresIn` in `lib/auth/index.ts` unless the field is wired to the client API.
- No "forgot password" link yet — can be added later as a single isolated feature
- The login page must be the only page accessible without a session

---

## 9. Client-Side Session Context & Permissions

### `AppSessionProvider` + `useAppSession()`

**Location:** `lib/auth/session-context.tsx`

The layout already resolves the session server-side. To avoid extra server round-trips, the layout passes a safe subset of the session user into a React context that any client component can consume via `useAppSession()`.

```typescript
// app/(app)/layout.tsx (excerpt)
import { AppSessionProvider } from "@/lib/auth/session-context";

// Inside AppLayout:
<AppSessionProvider
  user={{
    type: session.user.type,
    firstName: session.user.firstName,
    lastName: session.user.lastName,
    email: session.user.email,
    clinicName: session.user.clinicName,
  }}
>
  ...
</AppSessionProvider>
```

The `AppSessionUser` type (exported from `lib/auth/session-context.tsx`) contains only the fields that are safe and useful client-side — it deliberately excludes `id`, `clinicId`, and `clinicSubdomain` which must remain server-only.

```typescript
export interface AppSessionUser {
  type: "admin" | "doctor" | "staff";
  firstName: string;
  lastName: string;
  email: string;
  clinicName: string;
}
```

### `usePermission()` Hook

```typescript
import { usePermission } from "@/lib/auth/session-context";

function DeleteButton() {
  const canDelete = usePermission("deletePatient");
  if (!canDelete) return null;
  return <button>Delete</button>;
}
```

### `<RoleGate />` Component

**Location:** `components/common/RoleGate.tsx`

```tsx
import { RoleGate } from "@/components/common/RoleGate";

// Renders nothing when role lacks permission:
<RoleGate permission="manageUsers">
  <UserManagementPanel />
</RoleGate>

// Optional fallback:
<RoleGate permission="deleteDocument" fallback={<p>Admin/Doctor only</p>}>
  <DeleteDocumentButton />
</RoleGate>
```

### `lib/permissions.ts` — Permission Map

**Location:** `lib/permissions.ts`

This file is the **single source of truth for all UI permission decisions**. It exports:
- `PERMISSIONS` — a `const` object mapping each `Permission` key to an array of allowed `UserType` values.
- `Permission` — the union of all permission keys.
- `hasPermission(role, permission)` — pure utility used internally by `usePermission()`.

The full permission map reflects the PRD RBAC table:

| Permission | staff | doctor | admin |
| :--- | :---: | :---: | :---: |
| `manageUsers` | — | — | ✓ |
| `viewPatients` / `createPatient` / `editPatient` | ✓ | ✓ | ✓ |
| `deletePatient` | ✓ | ✓ | ✓ |
| `viewClinicalNotes` / `editClinicalNotes` | — | ✓ | ✓ |
| `viewAppointmentTitle` | — | ✓ | ✓ |
| `viewDetailSidebar` | — | ✓ | ✓ |
| `viewAppointments` / `createAppointment` / `editAppointment` / `deleteAppointment` | ✓ | ✓ | ✓ |
| `viewDocuments` / `uploadDocument` | — | ✓ | ✓ |
| `viewPrescriptions` / `createPrescription` | — | ✓ | ✓ |
| `editDocument` / `deleteDocument` | — | ✓ | ✓ |
| `viewMedicines` / `createMedicine` / `editMedicine` / `deleteMedicine` | — | ✓ | ✓ |

**Rules:**
- UI gating (`RoleGate`, `usePermission`) is for UX only. Server actions must still call `requireRole()` independently.
- `clinicId` and `clinicSubdomain` are never passed to the client context — always resolve them server-side from `getSession()`.
- `useAppSession()` and `usePermission()` throw if called outside `app/(app)/` (i.e. outside `AppSessionProvider`).
- **Medicines — full staff lockout:** All medicines server actions use `requireRole(session, ["admin", "doctor"])`. Every medicines **`page.tsx`** (dashboard, new, view, **reports**, and `@modal` intercepts) calls **`await requirePermission("viewMedicines")`** before rendering. The Medicines tab in `TopNav` is hidden via `usePermission("viewMedicines")`. **`searchGlobal`** skips the **medicines** DB query when **`session.user.type === "staff"`**, returning **`medicines: []`**. **`UniversalSearch`** hides the Medicines result group via **`usePermission("viewMedicines")`**.
- **Clinical notes / patient past history — staff hidden:** `viewClinicalNotes` is `["admin", "doctor"]`. `PatientDetailPanel` filters `pastHistoryNotes`; `AppointmentDetailPanel` filters appointment `notes` when the user lacks this permission. **`getPatientDetail`**, **`getAppointmentDetail`** (including joined **`patientPastHistoryNotes`** on the appointment aggregate), **`getAppointments`**, **`createPatient`**, **`updatePatient`**, **`createAppointment`**, and **`updateAppointment`** also redact or ignore these fields for **staff** so values are not returned or mutated by that role.
- **Appointment title (form field) — staff hidden:** `viewAppointmentTitle` is `["admin", "doctor"]`. `AppointmentDetailPanel` omits the **Title** field when the user lacks this permission (create and edit). **`createAppointment`** stores `title` as null for staff regardless of payload; **`updateAppointment`** strips **`title`** from staff payloads so existing titles cannot be changed or cleared by that role. **`getAppointmentDetail`**, **`getAppointments`**, **`getPatientDetail`** (nested appointments), **`searchGlobal`**, and **`getRecentAppointments`** return **`title: null`** for staff in the response shape only (stored values are unchanged).
- **Appointment fee (staff UI):** By **`user.type === 'staff'`** (not a separate permission): **Fee** is hidden on **new** appointment; on **edit**, fee field and header fee line show only when **`status === 'completed'`**, and the fee input is non-editable via **`DetailForm`** **`TextField.readOnly`** (normal visual weight, not `disabled` opacity). Admin and doctor keep full fee edit access.
- **Documents — staff excluded:** `viewDocuments` and `uploadDocument` are `["admin", "doctor"]`. **`getUploadPresignedUrl`**, **`confirmDocumentUpload`**, and **`getViewPresignedUrl`** use `requireRole(session, ["admin", "doctor"])`. For **staff**, **`getPatientDetail`** returns **`documents: []`**, **`getAppointmentDetail`** returns **`patientDocuments: []`**, and **`searchGlobal`** skips the documents DB query and returns **`documents: []`**. **`UniversalSearch`** gates the Documents result group with **`usePermission("viewDocuments")`**. Staff cannot open or upload files via server actions even if a client bypasses the UI.
- **Prescriptions — staff excluded:** `viewPrescriptions` and `createPrescription` are `["admin", "doctor"]` (mirrors the documents split: view vs mutate). Prescription **server actions** (`lib/actions/prescriptions.ts`) use **`requireRole(session, ["admin", "doctor"])`**. For **staff**, **`getPatientDetail`** returns **`prescriptions: []`** and **`getAppointmentDetail`** returns **`prescription: null`** with **`prescriptionHistory: []`** (response-only; DB unchanged). UI: gate read surfaces with **`usePermission("viewPrescriptions")`** and add/edit/clear/reorder with **`usePermission("createPrescription")`** (appointment Prescriptions tab, patient read-only Rx list). Staff cannot read or change structured prescriptions even if a client bypasses the UI.
- **Detail right column + main-column Documents/Appointments tabs — staff hidden:** `viewDetailSidebar` is `["admin", "doctor"]`. `DetailPanel` internally calls `usePermission("viewDetailSidebar")` and computes `noSidebar = isCreate || !canViewSidebar`. When `noSidebar` is true, the main column is full-width, **Documents** / **Appointments** tabs are not composed, and the tab strip is hidden when only **Details** remains (same layout width as create mode). View modal pages (`@modal/(.)patients/view/[id]` and `@modal/(.)appointments/view/[id]`) call `getSession()` and use `size="lg"` for staff (vs. `"xl"` for other roles) so the narrower modal matches the full-width form. `ModalDetailPanelBodySkeleton` (the `<Suspense>` fallback) applies the same `noSidebar = isCreate || !canViewSidebar` logic via `usePermission` so the loading skeleton layout matches the final render for all roles with no layout shift.

---

## 10. Implementation Status

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
- [x] `lib/permissions.ts` — `PERMISSIONS` map, `Permission` type, `hasPermission()` utility
- [x] `lib/auth/session-context.tsx` — `AppSessionProvider`, `useAppSession()`, `usePermission()` hooks
- [x] `lib/auth/require-permission.ts` — `requirePermission()` server-side page guard
- [x] `components/common/RoleGate.tsx` — declarative permission-gating component
- [x] `app/(app)/layout.tsx` — `AppSessionProvider` wraps the app tree (no extra server calls)

**Not implemented yet:**
- [ ] Password reset flow
- [ ] Email verification
