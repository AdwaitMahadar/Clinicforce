"use server";

/**
 * lib/actions/documents.ts
 *
 * Server actions for the S3 document upload/view/delete flow.
 * Anatomy: getSession → requireRole → safeParse → S3 operation + DB.
 * Always return { success: true, data } or { success: false, error }.
 * Never throw.
 *
 * Upload flow (docs/08-Business-Rules §5):
 *   1. Client calls getUploadPresignedUrl() → server returns { uploadUrl, fileKey }
 *   2. Client uploads file directly to S3 via PUT to uploadUrl (no server transit)
 *   3. On upload success, client calls confirmDocumentUpload() → server writes DB record
 *
 * View flow:
 *   - Client calls getViewPresignedUrl(documentId) → server returns { url } (valid 60 min)
 *
 * Delete:
 *   - Server MUST delete S3 object first; only then deletes DB row.
 *   - If S3 fails, DB row is not deleted.
 *
 * RBAC (docs/08-Business-Rules §5, §8):
 *   View / Upload : all roles
 *   Delete        : doctor, admin
 *
 * Allowed mime types: application/pdf, image/jpeg, image/png, image/webp
 * Max file size    : 10 MB
 * Upload URL TTL   : 15 minutes
 * View URL TTL     : 60 minutes
 */

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getSession } from "@/lib/auth/session";
import { requireRole, ForbiddenError } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { getDocumentById } from "@/lib/db/queries/documents";
import { s3Client, S3_BUCKET_NAME } from "@/lib/storage/s3-client";
import { buildDocumentObjectKey } from "@/lib/storage/document-object-key";
import {
  getUploadPresignedUrlSchema,
  confirmDocumentUploadSchema,
  documentIdSchema,
  DOCUMENT_ALLOWED_MIME_TYPES,
} from "@/lib/validators/document";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// ─── getUploadPresignedUrl ────────────────────────────────────────────────────

/**
 * Step 1 of the upload flow.
 * Validates file constraints, generates a clinic-scoped S3 key,
 * and returns a presigned PUT URL (valid 15 min) and the fileKey.
 */
export async function getUploadPresignedUrl(input: unknown) {
  try {
    const session = await getSession();
    requireRole(session, ["admin", "doctor", "staff"]);

    const parsed = getUploadPresignedUrlSchema.safeParse(input);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid input.";
      return { success: false as const, error: message };
    }

    const { mimeType, fileSize, fileName, assignedToId, assignedToType } =
      parsed.data;
    const { clinicSubdomain } = session.user;

    if (!DOCUMENT_ALLOWED_MIME_TYPES.has(mimeType)) {
      return {
        success: false as const,
        error: `File type not allowed. Accepted types: PDF, JPEG, PNG, WEBP.`,
      };
    }

    if (fileSize > MAX_FILE_SIZE_BYTES) {
      return {
        success: false as const,
        error: "File size exceeds the 10 MB limit.",
      };
    }

    const fileKey = buildDocumentObjectKey({
      clinicSubdomain,
      assignedToType,
      assignedToId,
      originalFileName: fileName,
    });

    const command = new PutObjectCommand({
      Bucket:        S3_BUCKET_NAME,
      Key:           fileKey,
      ContentType:   mimeType,
      ContentLength: fileSize,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 15 * 60 });

    return { success: true as const, data: { uploadUrl, fileKey } };
  } catch (err) {
    if (err instanceof ForbiddenError) return { success: false as const, error: "FORBIDDEN" };
    console.error("[getUploadPresignedUrl]", err);
    return {
      success: false as const,
      error: "Failed to generate upload URL.",
    };
  }
}

// ─── confirmDocumentUpload ─────────────────────────────────────────────────────

/**
 * Step 3 of the upload flow.
 * Called by the client after a successful S3 PUT.
 * Persists the document metadata to the database.
 */
export async function confirmDocumentUpload(input: unknown) {
  try {
    const session = await getSession();
    requireRole(session, ["admin", "doctor", "staff"]);

    const parsed = confirmDocumentUploadSchema.safeParse(input);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid input.";
      return { success: false as const, error: message };
    }

    const { clinicId, id: userId } = session.user;
    const v = parsed.data;

    const title = (v.title?.trim()) || v.fileName;

    const [created] = await db
      .insert(documents)
      .values({
        clinicId,
        title,
        description:    v.description?.trim() ?? null,
        type:           v.type,
        assignedToId:   v.assignedToId,
        assignedToType: "patient",
        appointmentId:  v.appointmentId ?? null,
        fileKey:        v.fileKey,
        fileName:       v.fileName,
        fileSize:       v.fileSize,
        mimeType:       v.mimeType,
        uploadedBy:     userId,
      })
      .returning({ id: documents.id });

    revalidatePath("/patients", "layout");
    revalidatePath(`/patients/view/${v.assignedToId}`);
    revalidatePath("/appointments", "layout");
    if (v.appointmentId) {
      revalidatePath(`/appointments/view/${v.appointmentId}`);
    }

    return { success: true as const, data: { id: created.id } };
  } catch (err) {
    if (err instanceof ForbiddenError) return { success: false as const, error: "FORBIDDEN" };
    console.error("[confirmDocumentUpload]", err);
    return {
      success: false as const,
      error: "Failed to save document record.",
    };
  }
}

// ─── getViewPresignedUrl ───────────────────────────────────────────────────────

/**
 * Returns a presigned GET URL valid for 60 minutes.
 * Verifies clinic ownership before generating the URL.
 */
export async function getViewPresignedUrl(documentId: unknown) {
  try {
    const session = await getSession();
    requireRole(session, ["admin", "doctor", "staff"]);

    const parsed = documentIdSchema.safeParse(documentId);
    if (!parsed.success) {
      return { success: false as const, error: "Invalid document ID." };
    }

    const { clinicId } = session.user;
    const doc = await getDocumentById(clinicId, parsed.data);

    if (!doc) {
      return { success: false as const, error: "Document not found." };
    }

    const command = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key:    doc.fileKey,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 60 * 60 });

    return { success: true as const, data: { url } };
  } catch (err) {
    if (err instanceof ForbiddenError) return { success: false as const, error: "FORBIDDEN" };
    console.error("[getViewPresignedUrl]", err);
    return {
      success: false as const,
      error: "Failed to generate view URL.",
    };
  }
}

// ─── deleteDocument ────────────────────────────────────────────────────────────

/**
 * Hard-deletes a document: S3 object first, then DB row.
 * If the S3 deletion fails, the DB row is NOT deleted.
 * (docs/08-Business-Rules §5: "both succeed or neither does")
 */
export async function deleteDocument(documentId: unknown) {
  try {
    const session = await getSession();
    requireRole(session, ["admin", "doctor"]);

    const parsed = documentIdSchema.safeParse(documentId);
    if (!parsed.success) {
      return { success: false as const, error: "Invalid document ID." };
    }

    const { clinicId } = session.user;
    const doc = await getDocumentById(clinicId, parsed.data);

    if (!doc) {
      return { success: false as const, error: "Document not found." };
    }

    try {
      await s3Client.send(
        new DeleteObjectCommand({ Bucket: S3_BUCKET_NAME, Key: doc.fileKey })
      );
    } catch (s3Err) {
      console.error("[deleteDocument] S3 deletion failed:", s3Err);
      return {
        success: false as const,
        error: "Failed to delete file from storage. Database record retained.",
      };
    }

    await db
      .delete(documents)
      .where(
        and(eq(documents.clinicId, clinicId), eq(documents.id, parsed.data))
      );

    return { success: true as const, data: { id: parsed.data } };
  } catch (err) {
    if (err instanceof ForbiddenError) return { success: false as const, error: "FORBIDDEN" };
    console.error("[deleteDocument]", err);
    return { success: false as const, error: "Failed to delete document." };
  }
}
