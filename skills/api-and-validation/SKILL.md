---
name: api-and-validation
description: Use this skill whenever writing server actions, defining API route handlers, creating or modifying Zod schemas, or implementing request/response contracts between the client and server. This skill enforces the exact sequence of validation, session/role checking, and data-fetching patterns across the Clinicforce backend.
---

# API and Validation Skill

This skill documents the rigorous pattern used for all server actions and API route handlers in Clinicforce. You MUST follow this blueprint exactly to ensure security, correct multi-tenant data isolation, and robust validation.

## 🔗 The Server Action Anatomy

Every server action in Clinicforce follows a strict procedural sequence to ensure robust security and data isolation:

1. **Session & Auth Check**: First, verify the user session (`getSession()`). This provides the immutable `clinicId` and `role`. Do not trust client-provided IDs for this.
2. **RBAC Verification**: Call `requireRole(session, [allowedRoles])` using the `role` from the session. Reject unauthorized requests immediately.
3. **Input Validation**: Validate incoming payloads against the shared Zod schema from `lib/validators/`. Do not define custom inline schemas.
4. **Data Operations & Isolation**: Execute the Drizzle ORM query. **Crucial**: Every DB operation must be scoped with a `WHERE clinic_id = session.clinicId`.

### Error Handling Pattern

Every server action wraps its logic in a `try/catch` and returns a typed result — it never throws to the caller:

```typescript
"use server";
import { getSession } from "@/lib/auth/session";
import { requireRole, ForbiddenError } from "@/lib/auth/rbac";

export async function someAction(input: unknown) {
  try {
    const session = await getSession();          // throws UNAUTHORIZED if no session
    requireRole(session, ["admin", "doctor"]);   // throws ForbiddenError if wrong role
    const { clinicId } = session.user;

    const parsed = someSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }

    const result = await db.select().from(someTable).where(eq(someTable.clinicId, clinicId));
    return { success: true as const, data: result };
  } catch (err) {
    if (err instanceof ForbiddenError) return { success: false as const, error: "FORBIDDEN" };
    console.error("[someAction]", err);
    return { success: false as const, error: "Failed to perform action." };
  }
}
```

**Response shape is always `{ success: true, data }` or `{ success: false, error }`** — callers check `result.success` before using `result.data`.

## 🛡️ Zod Validation Conventions

Zod schemas are the **single source of truth for validation rules**, shared identically between the client (React Hook Form) and the server (API/Actions).

- Entity detail/create UIs use **`DetailForm`** (`components/common/DetailForm.tsx`) with **`zodResolver(schema)`** — the same exported schema as the server action; never duplicate rules in the component.
- All Zod schemas MUST live in `lib/validators/`. Auth schemas: `lib/validators/auth.ts` (`loginSchema`, `LoginFormValues`). Document upload schemas: `lib/validators/document.ts` (`getUploadPresignedUrlSchema`, `confirmDocumentUploadSchema`, `uploadDocumentDialogSchema`). Shared primitives: `lib/validators/common.ts` exports `idSchema` (`z.string().uuid(...)`) and `n()` (blank-string-to-null coercion) — import from there in every action file; never redefine locally.
- **Enum string lists** (appointment status / **category** / **visit type**, patient gender/blood group, medicine category/form) MUST be imported from `lib/constants/` — never duplicate the same literals in validators. Appointment form/API uses camelCase **`visitType`** (maps to DB `visit_type`). Optional **`fee`**: preprocess empty string → create omits / DB null; update empty → `null`. Constants are Zod-free so client `types/` can import them without pulling Zod; validators use them in `z.enum()`.
- Every schema exports the main `z.object()` and the inferred type (e.g. `export type CreateMedicineInput = z.infer<typeof createMedicineSchema>;`). Medicine validator exports `createMedicineSchema` / `CreateMedicineInput` and `updateMedicineSchema` / `UpdateMedicineInput` — there are no deprecated aliases.
- You may use *drizzle-zod* schemas as base insert/select models, but extend them generously with specific error messages, custom transforms, and rigorous `.refine()` logic (e.g. enforcing "email OR phone must exist").
- Ensure schemas use explicit error messaging like `.min(2, "Name must be at least 2 characters")`.
- **ID shape:** Use `z.string().uuid()` only for values that are always Postgres UUIDs (e.g. `patientId`). Use `z.string().min(1)` for Better-Auth user ids (`doctorId`) and for document `assignedToId` (patient UUID or user id depending on `assignedToType`).
- **RHF + `zodResolver`:** If a field uses `.default()` in Zod, omit that key from `useForm`’s `defaultValues`. Avoid `useForm<z.infer<typeof schema>>()` unless you align input/output (`z.input`); prefer `useForm({ resolver: zodResolver(schema) })` without a generic so inference from the resolver stays consistent (see login page).

## 📌 API Contracts and Requirements

- **Public:** `GET /api/clinic?subdomain=` — no session; returns `{ clinicId, name }` for an active clinic (see `docs/04-API-Specification.md`). Login branding uses the same DB helper server-side, not this route.

For full action contracts per entity — exact input shapes, output shapes, and which actions belong to which pages — always read `docs/04-API-Specification.md` before implementing. Do not guess at shapes or infer them from the page specs.

The general pattern for every action follows the anatomy above:
- **List actions**: Accept `clinicId` (from session), `page`, `pageSize`, `search`, `sort`, and entity-specific filters. Always return a paginated shape with `{ data, total }`.
- **`getPatients` list rows:** Each row has `status: "active" | "inactive"` only (mapped from DB in the query). There is no `isActive` on that payload — UI mappers must pass through `row.status`, not `row.isActive`. **`lastVisit` / `assignedDoctor` / `lastVisitCategory` / `lastVisitDoctorId`** use the same **completed**, **past** (`scheduled_at < now()`), **active** appointment row (`docs/08-Business-Rules.md`); category + doctor id are for appointment prefill, not table columns yet.
- **Get actions**: Accept `id` + `clinicId`. Return a fully joined aggregate including nested `eventLog` and `documents` where applicable.
- **Create actions**: Accept validated Zod payload. Map `session.userId` → `createdBy` and `session.clinicId` → `clinicId` before insertion. Never accept these from the client.
- **Update actions**: Accept `id` + validated Zod payload. Scope the UPDATE with `clinic_id` to prevent cross-tenant writes. Example: `updateAppointment` never updates `patientId` and rejects if the client sends a different `patientId` than the row.
- **Appointments:** **`FOLLOW_UP_WINDOW_DAYS`** (`lib/constants/appointment.ts`) — use for follow-up create prefill windows; don’t hard-code `60`.
- **Appointment mutations** (`createAppointment`, `updateAppointment`, `deleteAppointment`): After success, call **`revalidatePath("/appointments/dashboard")`**; client detail panels call **`router.refresh()`** after create/update/cancel so the calendar stays in sync. For **staff**, `createAppointment` always persists `title` as null; `updateAppointment` removes `title` from the parsed payload (parallel to `notes` / `viewClinicalNotes`). For **staff** reads, `getAppointmentDetail`, `getAppointments`, `getPatientDetail` (nested `appointments[].title`), `searchGlobal`, and `getRecentAppointments` return **`title: null`** (DB unchanged).
- **Cross-cutting actions** (activity logging, S3 presigned URLs): Follow the same session → RBAC → validate → execute sequence. See `docs/09-File-Upload-Flow.md` for the upload flow specifically.
- **Global search**: `searchGlobal` in `lib/actions/search.ts` — validate with `searchGlobalQuerySchema` (`lib/validators/search.ts`); parallel `LIMIT 5` queries per entity, all scoped by `clinicId`; return type `GroupedSearchResults` in `types/search.ts`.
- **Appointment pickers:** `getActiveDoctors()` in `lib/actions/appointments.ts` (server preload for doctor `<Select />`). **`searchPatientsForPicker`** in `lib/actions/patients.ts` for the patient combobox (8-row cap; same search columns as `getPatients`). `getActivePatients()` remains for other bulk use; appointment form does not preload all patients.

## Detail Mapper Pattern

Every entity has a shared mapper in `_lib/*-detail-mapper.ts` that converts the server action result (`Extract<Awaited<ReturnType<typeof getXxxDetail>>, { success: true }>["data"]`) to the UI detail type from `types/`. Both the full-page route and the intercepting modal content component import the same mapper:

- `buildPatientDetail(r)` — `patients/_lib/patient-detail-mapper.ts` (includes `pastHistoryNotes`; `createPatientSchema` / `updatePatientSchema` carry UI-only `age`, stripped server-side)
- `buildMedicineDetail(r)` — `medicines/_lib/medicine-detail-mapper.ts`
- `buildAppointmentDetail(r)` — `appointments/_lib/appointment-detail-mapper.ts` — maps **`patientDocuments`** / **`patientAppointments`** (headings via `formatAppointmentHeading`; titles pre-redacted for staff in the action)

Never duplicate mapping logic between `view/[id]/page.tsx` and `@modal/(.)entity/view/[id]/EntityViewModalContent.tsx`. Always import the shared mapper instead.

## ❌ DO NOT

- **Do not** write server actions without retrieving and enforcing the `session`.
- **Do not** accept `clinicId` from the client. ALWAYS pull `clinicId` from the server session.
- **Do not** forget to scope every database query dynamically with `.where(eq(table.clinicId, session.clinicId))`.
- **Do not** build validation schemas directly inside component files or route handler files. Define them exclusively inside `lib/validators/`.
- **Do not** manage authorization logic through UI-hiding flags exclusively. Action functions MUST do their own RBAC assertions.

## 📚 References
- `docs/04-API-Specification.md` - Complete contract boundaries for the server API.
- `lib/validators/` - Home directory for all Zod implementations.
- `lib/constants/` - Shared `as const` enum lists wired into Zod and Drizzle `pgEnum`.
- `docs/07-Page-Specifications.md` - Backend contract requirements per page.
- `CLAUDE.md` - Core project and multi-tenancy rules.
