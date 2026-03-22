# 04 — API Specification

Server actions and route handlers: session-scoped `clinicId`, RBAC via `requireRole`, Zod validation from `lib/validators/`. Full error-handling pattern: `docs/09` / `skills/api-and-validation/SKILL.md`.

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
| `searchGlobal` | Accepts a trimmed query string (min 2 characters). Runs four parallel scoped reads (`LIMIT 5` each): patients (name/email/phone/chart id match; each hit includes `phone` for UI), active appointments (title / patient / doctor name), active medicines (name / brand match; each hit includes `category` and `brand` for UI), documents (title / file name / description) with optional patient join for display name. Returns `GroupedSearchResults` (`types/search.ts`). Schema: `searchGlobalQuerySchema` in `lib/validators/search.ts`. Client: `UniversalSearch` in `components/common/UniversalSearch.tsx` (TopNav, ⌘/Ctrl+K). |
