# 04 — API Specification

Server actions and route handlers: session-scoped `clinicId`, RBAC via `requireRole`, Zod validation from `lib/validators/`. Full error-handling pattern: `docs/09` / `skills/api-and-validation/SKILL.md`.

## React Hook Form + Zod (client)

When using `zodResolver(schema)` with fields that use Zod `.default()` (e.g. `rememberMe: z.boolean().default(false)`):

1. **Do not** set `defaultValues` in `useForm` for those keys — the schema already supplies the default.
2. **Do not** combine `useForm<z.infer<typeof schema>>()` with that pattern unless you also align input vs output types (e.g. `z.input`). Prefer **`useForm({ resolver: zodResolver(schema) })` without an explicit generic** so `react-hook-form` infers from the resolver, and keep a separate `z.infer<typeof schema>` alias for the submit handler (see `app/(auth)/login/page.tsx`).

Duplicating defaults in `useForm` or forcing `z.infer` as the form generic while the resolver’s input type still treats optional keys can produce a TypeScript mismatch (`boolean | undefined` vs `boolean`).

## String IDs in Zod

- **Postgres UUIDs** (e.g. `patientId`, appointment `id`): validate with `z.string().uuid()` where the value is always a UUID.
- **Better-Auth user ids** (e.g. appointment `doctorId`): validate with `z.string().min(1)` only — Better-Auth `user.id` is not guaranteed to be UUID-shaped.
- **Document `assignedToId`:** validate with `z.string().min(1)` — it is a patient row UUID when `assignedToType` is `patient`, or a Better-Auth user id when `assignedToType` is `user` (see `lib/validators/document.ts`).

## Documents (S3 presigned flow)

| Action | Purpose |
|--------|---------|
| `getUploadPresignedUrl` | Validates file meta; returns `{ uploadUrl, fileKey }` — no DB write. Object key uses `session.user.clinicSubdomain` and `assignedToType` / `assignedToId`. Schema: `getUploadPresignedUrlSchema` in `lib/validators/document.ts`. |
| `confirmDocumentUpload` | After client PUT to storage; inserts `documents` row with `assignedToType: 'patient'`. Calls `revalidatePath` for patient and (if set) appointment detail routes. Schema: `confirmDocumentUploadSchema`. |
| `getViewPresignedUrl` | Returns `{ url }` presigned GET for opening in a new tab. |
| `deleteDocument` | Deletes S3 object then DB row (doctor/admin only). |

See `docs/09-File-Upload-Flow.md` for the browser sequence and Minio env vars.

## Global search

| Action | Purpose |
|--------|---------|
| `searchGlobal` | Accepts a trimmed query string (min 2 characters). Runs four parallel scoped reads (`LIMIT 5` each): patients (name/email/phone/chart id match; each hit includes `phone` for UI), active appointments (title / patient / doctor name), active medicines (name / brand match; each hit includes `category` and `brand` for UI), documents (title / file name / description; includes `mimeType` for list icons) with optional patient join for display name. Returns `GroupedSearchResults` (`types/search.ts`). Schema: `searchGlobalQuerySchema` in `lib/validators/search.ts`. Client: `UniversalSearch` in `components/common/UniversalSearch.tsx` (TopNav, ⌘/Ctrl+K). |
