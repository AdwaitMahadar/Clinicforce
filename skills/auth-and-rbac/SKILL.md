---
name: auth-and-rbac
description: Context-routing skill for authentication, user sessions, and role-based access control (RBAC). You MUST use this skill whenever working on user auth flows, Better-Auth integration, protecting server actions, checking user roles (admin, doctor, staff), or enforcing any permissions in the application.
---

# Auth & RBAC Skill

This skill provides critical context for handling authentication, user sessions, and Role-Based Access Control (RBAC) in Clinicforce.

## 🚨 Authentication Strategy & Flow

Clinicforce uses **Better-Auth** with the Drizzle ORM adapter (using the PostgreSQL provider) and database-backed sessions (not JWT).

### The `getSession()` Pattern
Currently, authentication is mocked to accelerate core development. All server actions and data fetching MUST use the unified `getSession()` function from `lib/auth/session.ts`.

```typescript
// The standard contract for getSession():
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
```

*   **Multi-tenancy context**: The user's `clinicId` is resolved via subdomains (e.g., `riverside.clinicforce.com`). The middleware attaches it to the request, and `getSession()` reads it alongside the user session.
*   **Single source of truth**: `session.user.clinicId` is the ONLY acceptable source for database queries and filtering.
*   **Role source of truth**: `session.user.type` is the ONLY acceptable source for checking a user's RBAC role.

## 🔐 RBAC Permission Matrix

Clinicforce utilizes Role-Based Access Control with three roles: `admin`, `doctor`, and `staff`. Before writing any data manipulation code, check this matrix:

| Feature | Staff (Receptionist) | Doctor | Admin |
| :--- | :--- | :--- | :--- |
| **Users Management** | - | - | Full CRUD |
| **Appointments** | Full CRUD | Full CRUD | Full CRUD |
| **Patients** | View / Add / Edit | Full CRUD | Full CRUD |
| **Documents** | View / Add | Full CRUD | Full CRUD |
| **Medicines** | View / Add | Full CRUD | Full CRUD |

*(Note: "Full CRUD" includes Create, Read, Update, and Delete. Note that Staff cannot delete Patients, Documents, or Medicines, but they can delete/cancel Appointments)*

## 🛡️ Enforcement Rules

1.  **Server Actions MUST start with a generic session validation.**
    ```typescript
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");
    ```
2.  **Server Actions MUST independently enforce RBAC.**
    Before executing database operations, the server action must explicitly check if `session.user.type` has the correct permission to perform the action according to the matrix.
    ```typescript
    if (session.user.type === "staff") {
      throw new Error("Forbidden: Staff cannot delete patients");
    }
    ```
3.  **UI hiding is for UX only.**
    You should hide restricted buttons (like a "Delete" button) in the UI if the user's role lacks permission, but this is NOT a security measure. The server action must serve as the absolute boundary.

## ❌ DO NOT

- **Do not** write custom auth session retrieval logic. Always call `getSession()` from `lib/auth/session.ts`.
- **Do not** build UI for role-switching or clinic-switching. The session explicitly dictates both. To test different roles during local development, temporarily edit the hardcoded mock user in `getSession()`.
- **Do not** rely solely on client-side routing or UI hiding to protect features. Server actions must strictly enforce the rules.
- **Do not** allow unauthenticated access to any route inside the `app/(app)/` folder. Only the `app/(auth)/login` route is public.
- **Do not** trust the client for the user's role or `clinicId`. Always pull them securely from the server session.

## References
For deeper implementation details, consult the canonical documentation:
- `docs/05-Authentication.md` - Complete auth flow, Better-Auth target state, and subdomain routing mechanics.
- `docs/01-PRD.md` - Core project requirements and complete scope constraints.
- `CLAUDE.md` - General project constraints and rules.
