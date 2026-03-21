# Clinicforce — Auth Integration Plan
> **Cursor Agent Handoff Document**  
> Read this entire file before writing a single line of code. Execute phases in order. Do not skip ahead.

---

## Project Context

Clinicforce is a multi-tenant SaaS Clinic Management System. It is staff-only (no patient portal). The app uses:
- **Next.js 15 App Router**, TypeScript strict mode
- **Better-Auth** for authentication (Drizzle adapter, database sessions, email+password only)
- **Drizzle ORM** + PostgreSQL
- **Shadcn/UI** + Tailwind CSS + **Lucide React** icons (NOT Material Symbols)
- **React Hook Form** + Zod for forms
- **Sonner** for toasts
- `nuqs` for URL state

### Multi-Tenancy Model
Every DB table has a `clinic_id` column. The `clinics` table is the tenant record. Clinic identity is resolved from the **subdomain** of the request URL — not from the user's login credentials.

- Production: `medlife.clinicforce.com` → subdomain = `medlife`
- Development: `demo-clinic.localhost:3000` → subdomain = `demo-clinic`

The dev subdomain `demo-clinic` maps to an existing row in the `clinics` table with `subdomain = 'demo-clinic'`.

**Local `/etc/hosts` setup required** (tell the developer to add this if not already present):
```
127.0.0.1   demo-clinic.localhost
```

### Existing Auth Files (current state)
These files exist at `lib/auth/`:

**`lib/auth/index.ts`** — Better-Auth configured with Drizzle adapter, email+password enabled. Already correct, do not modify.

**`lib/auth/client.ts`** — `authClient` + `signIn`, `signOut`, `signUp`, `useSession` exported. Already correct, do not modify.

**`lib/auth/session.ts`** — Currently a stub returning hardcoded values. Will be replaced in Phase 1.

**`lib/auth/rbac.ts`** — Currently a no-op. Will be implemented in Phase 3.

### UI Rules (Non-Negotiable)
- **All colors via CSS variables** — no hardcoded hex values anywhere. Variables are in `app/globals.css`
- **Typography:** DM Serif Display for `<h1>` page titles only; DM Sans for everything else
- **Icons:** Lucide React only — do not use Material Symbols or any other icon library
- **Toasts:** Sonner only (`import { toast } from 'sonner'`)
- **Do not** modify anything in `components/ui/`
- **Do not** hardcode `clinicId` or user `id` anywhere — always resolve from session

### Design Tokens (from `app/globals.css`)
```
--bg:               #F0EEE6
--surface:          #FAFAF7
--border:           #E2DDD4
--text-primary:     #1A1A18
--text-secondary:   #7A7769
--text-muted:       #A8A395
--green:            #2D9B6F
--amber:            #D97706
--red:              #DC2626
--blue:             #2563EB
```

---

## Phase 1 — Auth Infrastructure

### 1A. Better-Auth Route Handler

**Create:** `app/api/auth/[...all]/route.ts`

```ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

This single file enables all Better-Auth endpoints (`/api/auth/sign-in/email`, `/api/auth/sign-out`, `/api/auth/get-session`, etc.).

---

### 1B. Middleware

**Create:** `middleware.ts` at the project root.

**Logic:**
1. Extract the subdomain from `request.headers.get('host')`
   - Production: `medlife.clinicforce.com` → `medlife`
   - Development: `demo-clinic.localhost:3000` → `demo-clinic`
   - Fallback: if no subdomain can be extracted, redirect to a generic error or the base domain
2. Query the `clinics` table to resolve `clinicId` from the subdomain — **but do not do a DB call in middleware directly** (middleware runs on the Edge runtime; use a lightweight fetch to an internal API route instead, or use the pattern below)
3. Check for a valid Better-Auth session cookie
4. If the route is protected and no session → redirect to `/{subdomain-aware}/login?returnUrl=<original-path>` (or just `/login?returnUrl=<path>` since the subdomain is already in the host)
5. If the user is authenticated but hitting `/login` → redirect to `/home/dashboard`
6. On every authenticated request: validate that the session user's `clinicId` matches the subdomain's `clinicId` — if mismatch, redirect to `/login` (cross-clinic access attempt)

**Protected routes:** everything except:
- `/login`
- `/api/auth/*`
- `/_next/*`
- `/favicon.ico`
- `/public/*`

**Important note on Edge runtime and DB:**
Drizzle ORM cannot run directly in middleware (Edge runtime). To resolve the subdomain → clinicId mapping in middleware, use one of these two approaches:

**Recommended approach — Internal API route for subdomain resolution:**

Create `app/api/clinic/route.ts`:
```ts
import { db } from "@/lib/db";
import { clinics } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const subdomain = request.nextUrl.searchParams.get("subdomain");
  if (!subdomain) return NextResponse.json(null, { status: 400 });

  const clinic = await db
    .select({ id: clinics.id, isActive: clinics.isActive })
    .from(clinics)
    .where(eq(clinics.subdomain, subdomain))
    .limit(1);

  if (!clinic[0] || !clinic[0].isActive) {
    return NextResponse.json(null, { status: 404 });
  }

  return NextResponse.json({ clinicId: clinic[0].id });
}
```

Middleware fetches this internal route to resolve the clinicId, then attaches it as a request header (`x-clinic-id`) for downstream server components to read.

**Middleware skeleton:**
```ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const PUBLIC_PATHS = ["/login", "/api/auth", "/_next", "/favicon.ico"];

function extractSubdomain(host: string): string | null {
  // demo-clinic.localhost:3000 → demo-clinic
  // medlife.clinicforce.com → medlife
  const parts = host.split(".");
  if (parts.length >= 2 && parts[0] !== "www" && parts[0] !== "localhost") {
    return parts[0];
  }
  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") ?? "";
  const subdomain = extractSubdomain(host);

  // Allow public paths through
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Resolve clinicId from subdomain
  if (!subdomain) {
    // No subdomain — unknown clinic
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const clinicRes = await fetch(
    `${request.nextUrl.origin}/api/clinic?subdomain=${subdomain}`,
    { headers: { "x-internal": "1" } }
  );

  if (!clinicRes.ok) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { clinicId } = await clinicRes.json();

  // Check session
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("returnUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Forward clinicId to server components via header
  const response = NextResponse.next();
  response.headers.set("x-clinic-id", clinicId);
  response.headers.set("x-subdomain", subdomain);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

Note: The full session user ↔ clinic validation (does this user belong to this clinic?) is enforced in `getSession()` in Phase 1C, not in middleware, to avoid Edge runtime DB limitations.

---

### 1C. Replace `lib/auth/session.ts`

Replace the entire stub with a real implementation:

```ts
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

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
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("UNAUTHORIZED");
  }

  // Fetch extended user fields (clinicId, type) from our users table
  // Better-Auth's session only contains base fields
  const dbUser = await db
    .select({
      id: users.id,
      clinicId: users.clinicId,
      type: users.type,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!dbUser[0]) {
    throw new Error("USER_NOT_FOUND");
  }

  // Validate user belongs to the clinic derived from subdomain
  // Read clinicId that middleware resolved and forwarded via header
  const headersList = await headers();
  const subdomainClinicId = headersList.get("x-clinic-id");

  if (subdomainClinicId && dbUser[0].clinicId !== subdomainClinicId) {
    throw new Error("CLINIC_MISMATCH");
  }

  return {
    user: {
      id: dbUser[0].id,
      clinicId: dbUser[0].clinicId!,
      type: dbUser[0].type as "admin" | "doctor" | "staff",
      firstName: dbUser[0].firstName ?? "",
      lastName: dbUser[0].lastName ?? "",
      email: dbUser[0].email,
    },
  };
}
```

**Phase 1 checkpoint:** 
- `GET /api/auth/get-session` returns session data
- Visiting a protected route without a session redirects to `/login?returnUrl=...`
- `getSession()` returns real user data (not hardcoded)

---

## Phase 2 — Login Page

### 2A. Login Page

**Create:** `app/(auth)/login/page.tsx`

This is a **client component** (`"use client"`). The login form calls `signIn.email()` directly from `lib/auth/client.ts`.

**Layout:** Faithfully recreated from the provided Stitch HTML template with these Clinicforce-specific adaptations:

**Left panel (brand):**
- Logo: Use `Activity` icon from Lucide React (clinic/health context) in a dark rounded container
- App name: "Clinicforce" in bold
- Headline `<h1>`: DM Serif Display font — keep the italic span style from the template  
- Tagline: "The complete management system for modern healthcare practices."
- Testimonial glass card: fictional doctor quote, keep the glass styling
- Bottom meta: show version and security info as in the template

**Right panel (form):**
- "Welcome back" heading, DM Sans
- Two fields only: Email + Password (no OAuth buttons — internal staff app, no self-signup)
- Labels styled as small-caps uppercase (matching the template's style)
- "Forgot?" link — render it but it can be `href="#"` for now (future feature)
- "Keep session active for 30 days" checkbox — wire it to the `rememberMe` field
- Primary button: "Sign In" with `ArrowRight` Lucide icon — dark zinc background matching template
- Remove: Google/Apple OAuth buttons entirely
- Remove: "Request access" link entirely
- Footer: "© 2025 Clinicforce" + Privacy/Terms links

**Colors:** Map to CSS variables:
- Background cream → `var(--bg)`
- Form panel white → `var(--surface)`  
- Input borders → `var(--border)`
- Text → `var(--text-primary)`, `var(--text-secondary)`, `var(--text-muted)`
- Button: `var(--text-primary)` background (deep dark) with white text
- Do NOT hardcode any hex values

**Zod schema:**
```ts
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().default(false),
});
```

**Form submit logic:**
```ts
const searchParams = useSearchParams();
const returnUrl = searchParams.get("returnUrl") ?? "/home/dashboard";

const onSubmit = async (data: LoginFormValues) => {
  setIsLoading(true);
  try {
    await signIn.email({
      email: data.email,
      password: data.password,
      callbackURL: returnUrl,
      fetchOptions: {
        onError: (ctx) => {
          toast.error(ctx.error.message ?? "Invalid credentials. Please try again.");
          setIsLoading(false);
        },
      },
    });
  } catch {
    toast.error("Something went wrong. Please try again.");
    setIsLoading(false);
  }
};
```

**Loading state:** Disable the button and show a spinner (use `Loader2` Lucide icon with `animate-spin`) while `isLoading` is true.

**Phase 2 checkpoint:**
- Login page renders at `demo-clinic.localhost:3000/login`
- Valid credentials → redirect to `/home/dashboard`
- Invalid credentials → Sonner toast error
- Visiting a protected route unauthenticated → redirect to `/login?returnUrl=<path>` → after login → redirect to original path

---

## Phase 3 — RBAC Enforcement

### 3A. Implement `lib/auth/rbac.ts`

Replace the no-op with real enforcement:

```ts
import { type AppSession } from "./session";

export class ForbiddenError extends Error {
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function requireRole(
  session: AppSession,
  allowed: Array<"admin" | "doctor" | "staff">
): void {
  if (!allowed.includes(session.user.type)) {
    throw new ForbiddenError();
  }
}
```

### 3B. Server Action Pattern

Every server action must follow this exact pattern:

```ts
"use server";
import { getSession } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/rbac";
import { ForbiddenError } from "@/lib/auth/rbac";

export async function someAction(input: SomeInput) {
  // 1. Get session (throws UNAUTHORIZED if no session)
  const session = await getSession();
  
  // 2. Enforce role (throws ForbiddenError if wrong role)
  requireRole(session, ["admin", "doctor"]); // adjust per permission matrix
  
  // 3. Get clinicId from session (NEVER from client input)
  const { clinicId } = session.user;
  
  // 4. DB operation always filtered by clinicId
  const result = await db
    .select()
    .from(someTable)
    .where(eq(someTable.clinicId, clinicId));
    
  return result;
}
```

**Catching errors in server actions — return typed results:**
```ts
try {
  // ...action logic
  return { success: true, data: result };
} catch (error) {
  if (error instanceof ForbiddenError) {
    return { success: false, error: "FORBIDDEN" };
  }
  return { success: false, error: "INTERNAL_ERROR" };
}
```

### 3C. Permission Matrix Audit

Audit every existing server action and apply `requireRole()` per this matrix:

| Entity | Operation | Allowed Roles |
|--------|-----------|---------------|
| Users | Create / Update / Delete | `["admin"]` |
| Users | Read | `["admin"]` |
| Appointments | All CRUD | `["admin", "doctor", "staff"]` |
| Patients | Create / Read / Update | `["admin", "doctor", "staff"]` |
| Patients | Delete | `["admin", "doctor"]` |
| Documents | Create / Read | `["admin", "doctor", "staff"]` |
| Documents | Update / Delete | `["admin", "doctor"]` |
| Medicines | Create / Read | `["admin", "doctor", "staff"]` |
| Medicines | Update / Delete | `["admin", "doctor"]` |

**Phase 3 checkpoint:**
- A staff user attempting to delete a patient gets a `FORBIDDEN` error response
- All mutations gate-check the role before any DB operation

---

## Phase 4 — Cleanup & Smoke Test

### 4A. Remove all hardcoded values

- Confirm `lib/auth/session.ts` has no hardcoded IDs (done in Phase 1C)
- Search the entire codebase for the old hardcoded user ID `yn5d3vkdpzxzmare7bac8baj` and clinic ID `3ba05aa6-b010-44a5-a556-dcc793c49792` — remove any remaining references
- These values only exist in the DB as seed data for the dev login — they should never appear in code

### 4B. Smoke Test Checklist

Run through these manually after all phases are complete:

1. Visit `demo-clinic.localhost:3000/patients/dashboard` without a session
   - ✅ Should redirect to `demo-clinic.localhost:3000/login?returnUrl=/patients/dashboard`

2. Log in with the seeded admin credentials
   - ✅ Should redirect to `/patients/dashboard` (the returnUrl)
   - ✅ Session cookie should be set

3. Refresh any dashboard page
   - ✅ Data should load — `clinicId` now comes from session (same value as before, so data is identical)

4. Call `signOut()` from the UI
   - ✅ Should redirect to `/login`, session cookie cleared

5. Log in again, open DevTools → Application → Cookies
   - ✅ Better-Auth session cookie should be present

6. Manually hit `/api/auth/get-session`
   - ✅ Should return the full session object with user data

---

## File Creation Summary

| File | Action |
|------|--------|
| `app/api/auth/[...all]/route.ts` | **Create** |
| `app/api/clinic/route.ts` | **Create** |
| `middleware.ts` | **Create** |
| `lib/auth/session.ts` | **Replace** |
| `lib/auth/rbac.ts` | **Replace** |
| `app/(auth)/login/page.tsx` | **Create** |

All other existing files remain untouched.

---

## Dev Environment Setup Note

Before testing, ensure `demo-clinic.localhost` resolves locally. Add this line to `/etc/hosts` (Mac/Linux: `sudo nano /etc/hosts`, Windows: `C:\Windows\System32\drivers\etc\hosts`):

```
127.0.0.1   demo-clinic.localhost
```

Then access the app at: `http://demo-clinic.localhost:3000`

---

## Reference: Login Page HTML Template

The login page design is based on the Stitch-generated HTML template provided separately. Key structural elements to preserve:
- Split 50/50 layout (left brand panel hidden on mobile, right form full-width on mobile)
- Glass morphism testimonial card on the left panel
- Small-caps uppercase input labels
- Deep zinc primary button with arrow icon
- Fixed footer bottom-right with copyright + links
- Subtle paper texture overlay on left panel (can use a CSS grain effect instead of the external image URL)

Adapt all copy, branding, icons, and colors to Clinicforce standards as described in Phase 2 above.
