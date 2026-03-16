/**
 * lib/db/queries/documents.ts
 *
 * All DB reads for the documents entity.
 * Every function receives clinicId as its first argument and always
 * scopes the query with WHERE clinic_id = clinicId.
 *
 * Used by server actions only — never import from client components.
 */

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";

// ─── Return Types ─────────────────────────────────────────────────────────────

/**
 * Compact document summary — used in patient detail and appointment detail panels.
 * `size` is the raw byte count; formatting to "2.4 MB" is done in the server action layer.
 */
export interface DocumentSummary {
  id: string;
  title: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  type: string;
  uploadedAt: Date;
  appointmentId: string | null;
}

export interface DocumentDetail {
  id: string;
  clinicId: string;
  title: string;
  description: string | null;
  type: string;
  assignedToId: string;
  assignedToType: string;
  appointmentId: string | null;
  fileKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── getDocumentsByAssignment ─────────────────────────────────────────────────

/**
 * Returns all documents linked to a given patient or user within a clinic.
 * `assignedToType` must be "patient" | "user" — mirrors the DB enum.
 * Ordered by most recently uploaded first.
 */
export async function getDocumentsByAssignment(
  clinicId: string,
  assignedToId: string,
  assignedToType: "patient" | "user"
): Promise<DocumentSummary[]> {
  return db
    .select({
      id: documents.id,
      title: documents.title,
      fileName: documents.fileName,
      mimeType: documents.mimeType,
      fileSize: documents.fileSize,
      type: documents.type,
      uploadedAt: documents.createdAt,
      appointmentId: documents.appointmentId,
    })
    .from(documents)
    .where(
      and(
        eq(documents.clinicId, clinicId),
        eq(documents.assignedToId, assignedToId),
        eq(documents.assignedToType, assignedToType)
      )
    )
    .orderBy(desc(documents.createdAt));
}

// ─── getDocumentById ──────────────────────────────────────────────────────────

/**
 * Returns a single document record for a clinic, or null if not found /
 * belongs to a different clinic.
 * Used before generating presigned view URLs to verify ownership.
 */
export async function getDocumentById(
  clinicId: string,
  id: string
): Promise<DocumentDetail | null> {
  const rows = await db
    .select({
      id: documents.id,
      clinicId: documents.clinicId,
      title: documents.title,
      description: documents.description,
      type: documents.type,
      assignedToId: documents.assignedToId,
      assignedToType: documents.assignedToType,
      appointmentId: documents.appointmentId,
      fileKey: documents.fileKey,
      fileName: documents.fileName,
      fileSize: documents.fileSize,
      mimeType: documents.mimeType,
      uploadedBy: documents.uploadedBy,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
    })
    .from(documents)
    .where(and(eq(documents.clinicId, clinicId), eq(documents.id, id)))
    .limit(1);

  return rows[0] ?? null;
}
