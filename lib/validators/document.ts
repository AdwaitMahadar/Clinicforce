/**
 * Zod schemas for document upload server actions and the upload dialog form.
 * Enum values mirror `lib/constants/document.ts` and the DB `document_type` pgEnum.
 */

import { z } from "zod";
import { DOCUMENT_TYPES } from "@/lib/constants/document";

export const documentTypeEnum = z.enum(DOCUMENT_TYPES);

const assignedToTypeEnum = z.enum(["patient", "user"]);

/** Step 1 — presigned PUT URL (no DB write). */
export const getUploadPresignedUrlSchema = z.object({
  fileName:        z.string().min(1, "File name is required"),
  mimeType:        z.string().min(1, "MIME type is required"),
  fileSize:        z.number().int().min(1, "File size must be positive"),
  assignedToType:  assignedToTypeEnum,
  assignedToId:    z.string().min(1, "Invalid assignment ID"),
  appointmentId:   z.string().uuid().optional(),
});

/** Step 2 — persist metadata after successful PUT to storage. */
export const confirmDocumentUploadSchema = z.object({
  fileKey:        z.string().min(1, "fileKey is required"),
  fileName:       z.string().min(1, "File name is required"),
  fileSize:       z.number().int().min(1),
  mimeType:       z.string().min(1),
  title:          z.string().max(255).optional(),
  type:           documentTypeEnum.default("other"),
  assignedToId:   z.string().min(1, "Invalid patient or user ID"),
  assignedToType: assignedToTypeEnum,
  appointmentId:  z.string().uuid().optional(),
  description:    z.string().optional(),
});

export const documentIdSchema = z.string().uuid("Invalid ID");

export type GetUploadPresignedUrlInput = z.infer<typeof getUploadPresignedUrlSchema>;
export type ConfirmDocumentUploadInput = z.infer<typeof confirmDocumentUploadSchema>;

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Same set used by `getUploadPresignedUrl` server-side checks. */
export const DOCUMENT_ALLOWED_MIME_TYPES: ReadonlySet<string> = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

/** Client-side upload dialog — file + fields (used with React Hook Form). */
export const uploadDocumentDialogSchema = z
  .object({
    file:        z.custom<File | undefined>((v) => v === undefined || v instanceof File),
    type:        documentTypeEnum,
    title:       z.string().max(255).optional(),
    description: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!(data.file instanceof File) || data.file.size === 0) {
      ctx.addIssue({ code: "custom", path: ["file"], message: "Choose a file" });
      return;
    }
    if (data.file.size > MAX_UPLOAD_BYTES) {
      ctx.addIssue({ code: "custom", path: ["file"], message: "File must be 10 MB or smaller" });
    }
    if (!DOCUMENT_ALLOWED_MIME_TYPES.has(data.file.type)) {
      ctx.addIssue({
        code: "custom",
        path: ["file"],
        message: "Allowed types: PDF, JPEG, PNG, WEBP",
      });
    }
  });

export type UploadDocumentDialogValues = z.infer<typeof uploadDocumentDialogSchema>;
