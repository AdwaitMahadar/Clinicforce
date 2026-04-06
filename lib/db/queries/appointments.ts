/**
 * lib/db/queries/appointments.ts
 *
 * All DB reads for the appointments entity.
 * Every function receives clinicId as its first argument and always
 * scopes the query with WHERE clinic_id = clinicId.
 *
 * Used by server actions only — never import from client components.
 */

import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { appointments, documents, patients, users } from "@/lib/db/schema";
import type { DocumentSummary } from "./documents";

// ─── Return Types ─────────────────────────────────────────────────────────────

/**
 * Compact appointment row from `getAppointments` (DB layer).
 * Differs from `@/types/appointment` `AppointmentEvent` (UI: ISO start/end strings).
 * Matches the output contract in docs/07-Page-Specifications.md §3.
 */
export interface AppointmentCalendarRow {
  id: string;
  title: string | null;
  patientName: string;
  /** `patients.first_name` — exposed for month-view chips (full name remains in `patientName`). */
  patientFirstName: string;
  doctorName: string;
  /** Full Date of the scheduled start (`scheduled_at`). */
  scheduledAt: Date;
  /** Duration in minutes. */
  duration: number;
  status: string;
  category: string;
  visitType: string;
  notes: string | null;
}

/**
 * Full appointment record from `getAppointmentById` (DB layer).
 * Differs from `@/types/appointment` `AppointmentDetail` (UI strings, initials, activity).
 * Matches the output contract in docs/07-Page-Specifications.md §4.
 */
export interface AppointmentDetailRecord {
  id: string;
  title: string | null;
  description: string | null;
  patientId: string;
  patientName: string;
  patientChartId: number;
  doctorId: string;
  doctorName: string;
  category: string;
  visitType: string;
  status: string;
  scheduledAt: Date;
  duration: number;
  fee: number | null;
  actualCheckIn: Date | null;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  documents: DocumentSummary[];
}

// ─── getAppointments ──────────────────────────────────────────────────────────

/**
 * Returns all active appointments within a date range for a clinic,
 * with joined patient name and doctor name.
 *
 * Used by the calendar Month / Week / Day views.
 * `rangeStart` and `rangeEnd` are inclusive.
 *
 * Always scoped to `clinicId`.
 */
export async function getAppointments(
  clinicId: string,
  { rangeStart, rangeEnd }: { rangeStart: Date; rangeEnd: Date }
): Promise<AppointmentCalendarRow[]> {
  const rows = await db
    .select({
      id: appointments.id,
      title: appointments.title,
      scheduledAt: appointments.scheduledAt,
      duration: appointments.duration,
      status: appointments.status,
      category: appointments.category,
      visitType: appointments.visitType,
      notes: appointments.notes,
      patientFirstName: patients.firstName,
      patientLastName: patients.lastName,
      doctorName: sql<string>`COALESCE(
        NULLIF(TRIM(${users.firstName} || ' ' || ${users.lastName}), ''),
        ${users.name}
      )`,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .leftJoin(users, eq(appointments.doctorId, users.id))
    .where(
      and(
        eq(appointments.clinicId, clinicId),
        eq(appointments.isActive, true),
        gte(appointments.scheduledAt, rangeStart),
        lte(appointments.scheduledAt, rangeEnd)
      )
    )
    .orderBy(asc(appointments.scheduledAt));

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    patientName: `${r.patientFirstName} ${r.patientLastName}`.trim(),
    patientFirstName: r.patientFirstName,
    doctorName: r.doctorName ?? "",
    scheduledAt: r.scheduledAt,
    duration: r.duration,
    status: r.status,
    category: r.category,
    visitType: r.visitType,
    notes: r.notes,
  }));
}

// ─── getAppointmentById ───────────────────────────────────────────────────────

/**
 * Returns full appointment detail for a clinic.
 * Includes joined patient name, doctor name, and documents linked to
 * this appointment (via appointment_id FK on the documents table).
 *
 * Returns null if the appointment doesn't exist or belongs to a different clinic.
 */
export async function getAppointmentById(
  clinicId: string,
  id: string
): Promise<AppointmentDetailRecord | null> {
  const rows = await db
    .select({
      id: appointments.id,
      title: appointments.title,
      description: appointments.description,
      patientId: appointments.patientId,
      patientFirstName: patients.firstName,
      patientLastName: patients.lastName,
      patientChartId: patients.chartId,
      doctorId: appointments.doctorId,
      doctorName: sql<string>`COALESCE(
        NULLIF(TRIM(${users.firstName} || ' ' || ${users.lastName}), ''),
        ${users.name}
      )`,
      category: appointments.category,
      visitType: appointments.visitType,
      status: appointments.status,
      scheduledAt: appointments.scheduledAt,
      duration: appointments.duration,
      fee: appointments.fee,
      actualCheckIn: appointments.actualCheckIn,
      notes: appointments.notes,
      isActive: appointments.isActive,
      createdAt: appointments.createdAt,
      updatedAt: appointments.updatedAt,
      createdBy: appointments.createdBy,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .leftJoin(users, eq(appointments.doctorId, users.id))
    .where(
      and(eq(appointments.clinicId, clinicId), eq(appointments.id, id))
    )
    .limit(1);

  const appt = rows[0];
  if (!appt) return null;

  // Fetch documents attached to this specific appointment
  const docs = await db
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
        eq(documents.appointmentId, id)
      )
    )
    .orderBy(desc(documents.createdAt));

  return {
    id: appt.id,
    title: appt.title,
    description: appt.description,
    patientId: appt.patientId,
    patientName: `${appt.patientFirstName} ${appt.patientLastName}`.trim(),
    patientChartId: appt.patientChartId,
    doctorId: appt.doctorId,
    doctorName: appt.doctorName ?? "",
    category: appt.category,
    visitType: appt.visitType,
    status: appt.status,
    scheduledAt: appt.scheduledAt,
    duration: appt.duration,
    fee: appt.fee ?? null,
    actualCheckIn: appt.actualCheckIn,
    notes: appt.notes,
    isActive: appt.isActive,
    createdAt: appt.createdAt,
    updatedAt: appt.updatedAt,
    createdBy: appt.createdBy,
    documents: docs,
  };
}

// ─── getActiveDoctors ─────────────────────────────────────────────────────────

/**
 * Returns a lightweight list of active doctors in a clinic — used to populate
 * the doctor picker dropdown in the appointment create/edit form.
 *
 * Filters: `is_active = true` AND `type = 'doctor'` AND `clinic_id = clinicId`.
 */
export async function getActiveDoctors(
  clinicId: string
): Promise<{ id: string; firstName: string | null; lastName: string | null; name: string }[]> {
  return db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      name: users.name,
    })
    .from(users)
    .where(
      and(
        eq(users.clinicId, clinicId),
        eq(users.isActive, true),
        eq(users.type, "doctor")
      )
    )
    .orderBy(asc(users.lastName), asc(users.firstName));
}
