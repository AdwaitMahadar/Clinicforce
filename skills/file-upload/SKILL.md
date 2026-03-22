---
name: file-upload
description: S3/Minio presigned PUT/GET for patient documents. Use when changing upload actions, `lib/storage/s3-client`, validators, or document UI.
---

# File Upload Skill

- **Flow:** `getUploadPresignedUrl` → browser `PUT` to Minio/S3 → `confirmDocumentUpload`. View: `getViewPresignedUrl` on demand; never persist GET URLs.
- **Code:** Shared client in `lib/storage/s3-client.ts`; object keys via `lib/storage/document-object-key.ts` (`{clinicSubdomain}/{assignedToType}/{assignedToId}/…`). `clinicSubdomain` comes from `session.user` (see `lib/auth/session.ts`). Zod in `lib/validators/document.ts`.
- **UI:** `UploadDocumentDialog`, `DocumentCard` in `components/common/`.

## DO NOT

- Do not pass `clinicId` from the client for uploads.
- Do not skip `revalidatePath` / `router.refresh()` after metadata save.

## References

- `docs/09-File-Upload-Flow.md`
- `lib/actions/documents.ts`
