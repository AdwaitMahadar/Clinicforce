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
