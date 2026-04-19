---
name: file-upload
description: S3/Minio presigned PUT/GET for patient documents. Use when changing upload actions, `lib/storage/s3-client`, validators, or document UI.
---

# File Upload Skill

- **Flow:** `getUploadPresignedUrl` → browser `PUT` to Minio/S3 → `confirmDocumentUpload`. View: `getViewPresignedUrl` on demand; never persist GET URLs. **RBAC:** all three actions use `requireRole(session, ["admin", "doctor"])` — staff cannot call them.
- **`assignedToType`:** Both `getUploadPresignedUrl` and `confirmDocumentUpload` accept `assignedToType: "patient" | "user"`. The client must pass the same value in both calls. The server uses it to build the object key (step 1) and to perform the clinic-boundary check + DB insert (step 3). Do **not** hardcode `"patient"` on the server.
- **Clinic-boundary check (step 3):** Before the `documents` INSERT, `confirmDocumentUpload` verifies `assignedToId` exists within the session `clinicId` (`patients` table for `"patient"`, `users` table for `"user"`). Returns an error on mismatch — never skip this check.
- **Code:** Shared client in `lib/storage/s3-client.ts`; object keys via `lib/storage/document-object-key.ts` (`{clinicSubdomain}/docs/patients|users/{id}/…`). `clinicSubdomain` is on `session.user` — tenant pipeline in `docs/05-Authentication.md` §4. Zod in `lib/validators/document.ts` (`assignedToId` is non-empty string, not `.uuid()`, when the assignee can be a user with a non-UUID Better-Auth id).
- **UI:** `UploadDocumentDialog`, `DocumentCard` in `components/common/`. **`DocumentCard`:** main click → `getViewPresignedUrl`; **`uploadDocument`** → top-right inline delete (red trash icon→red **Delete?** pill, `deleteDocument`, Framer + `nav-motion` springs); staff see neither upload nor delete controls.

## DO NOT

- Do not pass `clinicId` from the client for uploads.
- Do not hardcode `assignedToType: "patient"` on the server — use the validated value from the client input.
- Do not skip the clinic-boundary check in `confirmDocumentUpload` — always verify `assignedToId` belongs to the clinic before inserting.
- Do not skip `revalidatePath` / `router.refresh()` after metadata save.

## References

- `docs/09-File-Upload-Flow.md`
- `docs/05-Authentication.md` — how `clinicSubdomain` relates to middleware
- `lib/actions/documents.ts`
