/**
 * Shared mapping from DB / server-action tab shapes to UI types used by
 * DocumentsTab, AppointmentListTab, and prescription tab components.
 * Used by detail-tab RSC loaders and by `buildAppointmentDetail` / `buildPatientDetail`.
 */

import { format } from "date-fns";
import type { DocumentSummary } from "@/lib/db/queries/documents";
import type { PatientPrescriptionSummary as ServerPatientPrescriptionSummary } from "@/lib/actions/prescriptions";
import type { AppointmentStatus } from "@/types/appointment";
import { formatAppointmentHeading } from "@/lib/utils/format-appointment-heading";
import type { PatientAppointment, PatientDocument, PatientPrescriptionSummary } from "@/types/patient";

export function mapDocumentSummariesToPatientDocuments(
  docs: DocumentSummary[]
): PatientDocument[] {
  return docs.map((d) => ({
    id: d.id,
    title: d.title,
    fileName: d.fileName,
    mimeType: d.mimeType,
    fileSize: d.fileSize,
    type: d.type,
    uploadedAt:
      d.uploadedAt instanceof Date ? d.uploadedAt.toISOString() : String(d.uploadedAt),
  }));
}

/** Rows match `getPatientAppointmentSummaries` / tab actions after optional title redaction. */
export function mapAppointmentSummaryRowsToPatientAppointments(
  rows: Array<{
    id: string;
    title: string | null;
    category: string;
    visitType: string;
    doctor: string;
    scheduledAt: Date | string;
    status: string;
  }>
): PatientAppointment[] {
  return rows.map((a) => ({
    id: a.id,
    title: a.title,
    category: a.category,
    visitType: a.visitType,
    heading: formatAppointmentHeading({
      category: a.category,
      visitType: a.visitType,
      title: a.title,
    }),
    doctor: a.doctor ?? "",
    date: a.scheduledAt ? format(new Date(a.scheduledAt), "MMM d, yyyy") : "",
    time: a.scheduledAt ? format(new Date(a.scheduledAt), "hh:mm a") : "",
    status: a.status as AppointmentStatus,
  }));
}

export function mapServerPrescriptionSummariesToPatientUi(
  rows: ServerPatientPrescriptionSummary[]
): PatientPrescriptionSummary[] {
  return rows.map((p) => ({
    id: p.id,
    chartId: p.chartId,
    appointmentId: p.appointmentId,
    scheduledAt:
      p.scheduledAt instanceof Date ? p.scheduledAt.toISOString() : String(p.scheduledAt),
    doctorName: p.doctorName,
    activeItemCount: p.activeItemCount,
    publishedAt:
      p.publishedAt == null
        ? ""
        : p.publishedAt instanceof Date
          ? p.publishedAt.toISOString()
          : String(p.publishedAt),
    items: p.items ?? [],
  }));
}
