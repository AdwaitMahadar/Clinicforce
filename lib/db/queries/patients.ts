/**
 * lib/db/queries/patients.ts
 *
 * All DB reads for the patients entity.
 * Every function receives clinicId as its first argument and always
 * scopes the query with WHERE clinic_id = clinicId.
 *
 * Used by server actions only — never import from client components.
 */

import { and, asc, desc, eq, ilike, lt, or, sql, max } from "drizzle-orm";
import { db } from "@/lib/db";
import { patients, appointments, users } from "@/lib/db/schema";
import type { DocumentSummary } from "./documents";
import { getDocumentsByAssignment } from "./documents";

// ─── Return Types ─────────────────────────────────────────────────────────────

/**
 * Raw DB row returned by `getPatients` — chartId is a number, dates are Date objects.
 * Intentionally distinct from `@/types/patient` `PatientRow` which is the UI view-model
 * (chartId: string, dates formatted to display strings).
 */
export interface DbPatientRow {
  id: string;
  chartId: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  /** ISO timestamp of most recent completed past visit, or null if none. */
  lastVisit: Date | null;
  /** Display name of the doctor from that same visit, or null. */
  assignedDoctor: string | null;
  /** `appointment_category` from that same visit, or null if no qualifying appointment. */
  lastVisitCategory: string | null;
  /** `doctor_id` from that same visit, or null if no qualifying appointment. */
  lastVisitDoctorId: string | null;
  status: "active" | "inactive";
}

export interface PatientAppointmentSummary {
  id: string;
  title: string | null;
  category: string;
  visitType: string;
  doctor: string;
  scheduledAt: Date;
  status: string;
}

export interface PatientDetail {
  id: string;
  chartId: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  gender: "male" | "female" | "other" | null;
  address: string | null;
  bloodGroup: string | null;
  allergies: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  pastHistoryNotes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  appointments: PatientAppointmentSummary[];
  documents: DocumentSummary[];
}

// ─── Query Params ─────────────────────────────────────────────────────────────

export interface GetPatientsParams {
  search?: string;
  status?: "active" | "inactive";
  /** Filter by the doctor ID from the patient's last appointment. */
  doctorId?: string;
  page: number;
  pageSize: number;
  sortBy?: "lastName" | "lastVisit";
  sortDir?: "asc" | "desc";
}

// ─── getPatients ──────────────────────────────────────────────────────────────

/**
 * Returns a paginated, filtered, sorted patient list for a clinic.
 *
 * `lastVisit` is MAX(appointments.scheduled_at) per patient over **completed**
 * appointments with `scheduled_at < now()` (DB clock). `assignedDoctor`,
 * `lastVisitCategory`, and `lastVisitDoctorId` come from that same row (second
 * subquery joined on the same timestamp).
 *
 * Always scoped to `clinicId`.
 */
export async function getPatients(
  clinicId: string,
  params: GetPatientsParams
): Promise<{ rows: DbPatientRow[]; total: number }> {
  const {
    search,
    status,
    doctorId,
    page,
    pageSize,
    sortBy = "lastName",
    sortDir = "asc",
  } = params;

  const lastVisitAppointmentWhere = and(
    eq(appointments.clinicId, clinicId),
    eq(appointments.isActive, true),
    eq(appointments.status, "completed"),
    lt(appointments.scheduledAt, sql`now()`)
  );

  // ── Subquery: last visit date per patient ─────────────────────────────────
  const lastVisitSq = db
    .select({
      patientId: appointments.patientId,
      lastVisitDate: max(appointments.scheduledAt).as("last_visit_date"),
    })
    .from(appointments)
    .where(lastVisitAppointmentWhere)
    .groupBy(appointments.patientId)
    .as("last_visit_sq");

  // ── Subquery: appointment rows (to join on max date → get doctorId) ───────
  const lastApptSq = db
    .select({
      patientId: appointments.patientId,
      doctorId: appointments.doctorId,
      category: appointments.category,
      apptDate: appointments.scheduledAt,
    })
    .from(appointments)
    .where(lastVisitAppointmentWhere)
    .as("last_appt_sq");

  // ── Build WHERE for the patients table ────────────────────────────────────
  const conditions = [eq(patients.clinicId, clinicId)];

  if (status === "active") {
    conditions.push(eq(patients.isActive, true));
  } else if (status === "inactive") {
    conditions.push(eq(patients.isActive, false));
  }

  if (search) {
    conditions.push(
      or(
        ilike(patients.firstName, `%${search}%`),
        ilike(patients.lastName, `%${search}%`),
        ilike(patients.email, `%${search}%`),
        ilike(patients.phone, `%${search}%`),
        sql`${patients.chartId}::text ILIKE ${"%" + search + "%"}`
      )!
    );
  }

  // doctorId filter: inline SQL comparing the doctor column of the last
  // appointment subquery — applied together with the main where clause.
  if (doctorId) {
    conditions.push(sql`${lastApptSq.doctorId} = ${doctorId}`);
  }

  const where = and(...conditions);

  // ── Sort expression ───────────────────────────────────────────────────────
  const orderExpr =
    sortBy === "lastVisit"
      ? sortDir === "desc"
        ? desc(lastVisitSq.lastVisitDate)
        : asc(lastVisitSq.lastVisitDate)
      : sortDir === "desc"
        ? desc(patients.lastName)
        : asc(patients.lastName);

  const offset = (page - 1) * pageSize;

  // ── CTE: doctor display names ─────────────────────────────────────────────
  const doctorUser = db.$with("doctor_users").as(
    db
      .select({
        id: users.id,
        doctorName: sql<string>`COALESCE(
          NULLIF(TRIM(${users.firstName} || ' ' || ${users.lastName}), ''),
          ${users.name}
        )`.as("doctor_name"),
      })
      .from(users)
  );

  // ── Execute data + count in parallel ─────────────────────────────────────
  const [rows, countResult] = await Promise.all([
    db
      .with(doctorUser)
      .select({
        id: patients.id,
        chartId: patients.chartId,
        firstName: patients.firstName,
        lastName: patients.lastName,
        email: patients.email,
        phone: patients.phone,
        isActive: patients.isActive,
        lastVisit: lastVisitSq.lastVisitDate,
        assignedDoctor: doctorUser.doctorName,
        lastVisitCategory: lastApptSq.category,
        lastVisitDoctorId: lastApptSq.doctorId,
      })
      .from(patients)
      .leftJoin(lastVisitSq, eq(patients.id, lastVisitSq.patientId))
      .leftJoin(
        lastApptSq,
        and(
          eq(patients.id, lastApptSq.patientId),
          eq(lastApptSq.apptDate, lastVisitSq.lastVisitDate)
        )
      )
      .leftJoin(doctorUser, eq(lastApptSq.doctorId, doctorUser.id))
      .where(where)
      .orderBy(orderExpr)
      .limit(pageSize)
      .offset(offset),

    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(patients)
      .leftJoin(lastVisitSq, eq(patients.id, lastVisitSq.patientId))
      .leftJoin(
        lastApptSq,
        and(
          eq(patients.id, lastApptSq.patientId),
          eq(lastApptSq.apptDate, lastVisitSq.lastVisitDate)
        )
      )
      .where(where),
  ]);

  return {
    rows: rows.map((r) => ({
      id: r.id,
      chartId: r.chartId,
      firstName: r.firstName,
      lastName: r.lastName,
      email: r.email,
      phone: r.phone,
      lastVisit: r.lastVisit ?? null,
      assignedDoctor: r.assignedDoctor ?? null,
      lastVisitCategory: r.lastVisitCategory ?? null,
      lastVisitDoctorId: r.lastVisitDoctorId ?? null,
      status: r.isActive ? "active" : "inactive",
    })),
    total: countResult[0]?.count ?? 0,
  };
}

// ─── getPatientAppointmentSummaries ────────────────────────────────────────────

/**
 * Active appointments for a patient, most recent `scheduled_at` first.
 * Shared by `getPatientById` and `getAppointmentById`.
 */
export async function getPatientAppointmentSummaries(
  clinicId: string,
  patientId: string
): Promise<PatientAppointmentSummary[]> {
  const apptRows = await db
    .select({
      id: appointments.id,
      title: appointments.title,
      category: appointments.category,
      visitType: appointments.visitType,
      scheduledAt: appointments.scheduledAt,
      status: appointments.status,
      doctorName: sql<string>`COALESCE(
        NULLIF(TRIM(${users.firstName} || ' ' || ${users.lastName}), ''),
        ${users.name}
      )`,
    })
    .from(appointments)
    .leftJoin(users, eq(appointments.doctorId, users.id))
    .where(
      and(
        eq(appointments.clinicId, clinicId),
        eq(appointments.patientId, patientId),
        eq(appointments.isActive, true)
      )
    )
    .orderBy(desc(appointments.scheduledAt));

  return apptRows.map((a) => ({
    id: a.id,
    title: a.title,
    category: a.category,
    visitType: a.visitType,
    doctor: a.doctorName ?? "",
    scheduledAt: a.scheduledAt,
    status: a.status,
  }));
}

// ─── getPatientById ───────────────────────────────────────────────────────────

/**
 * Returns full patient detail for a clinic.
 * Includes joined appointments (most recent first) and documents.
 * Returns null if the patient doesn't exist or belongs to a different clinic.
 */
export async function getPatientById(
  clinicId: string,
  id: string
): Promise<PatientDetail | null> {
  const patientRows = await db
    .select({
      id: patients.id,
      chartId: patients.chartId,
      firstName: patients.firstName,
      lastName: patients.lastName,
      email: patients.email,
      phone: patients.phone,
      dateOfBirth: patients.dateOfBirth,
      gender: patients.gender,
      address: patients.address,
      bloodGroup: patients.bloodGroup,
      allergies: patients.allergies,
      emergencyContactName: patients.emergencyContactName,
      emergencyContactPhone: patients.emergencyContactPhone,
      pastHistoryNotes: patients.pastHistoryNotes,
      isActive: patients.isActive,
      createdAt: patients.createdAt,
      updatedAt: patients.updatedAt,
      createdBy: patients.createdBy,
    })
    .from(patients)
    .where(and(eq(patients.clinicId, clinicId), eq(patients.id, id)))
    .limit(1);

  const patient = patientRows[0];
  if (!patient) return null;

  const [apptSummaries, docs] = await Promise.all([
    getPatientAppointmentSummaries(clinicId, id),
    getDocumentsByAssignment(clinicId, id, "patient"),
  ]);

  return {
    ...patient,
    appointments: apptSummaries,
    documents: docs,
  };
}

// ─── getActivePatients ────────────────────────────────────────────────────────

/**
 * Returns a lightweight list of active patients — used to populate the
 * patient picker dropdown in the appointment create/edit form.
 */
export async function getActivePatients(
  clinicId: string
): Promise<{ id: string; firstName: string; lastName: string; chartId: number }[]> {
  return db
    .select({
      id: patients.id,
      firstName: patients.firstName,
      lastName: patients.lastName,
      chartId: patients.chartId,
    })
    .from(patients)
    .where(and(eq(patients.clinicId, clinicId), eq(patients.isActive, true)))
    .orderBy(asc(patients.lastName), asc(patients.firstName));
}

/** Max rows returned by `searchActivePatientsForPicker` (combobox list + scroll). */
export const PATIENT_PICKER_SEARCH_LIMIT = 8;

/**
 * Active patients for async combobox pickers. Search predicate matches `getPatients`
 * directory filtering (first/last name, email, phone, numeric chart id).
 * Empty `search` returns the first `PATIENT_PICKER_SEARCH_LIMIT` rows ordered by name.
 */
export async function searchActivePatientsForPicker(
  clinicId: string,
  search: string
): Promise<{ id: string; firstName: string; lastName: string; chartId: number }[]> {
  const q = search.trim();
  const conditions = [
    eq(patients.clinicId, clinicId),
    eq(patients.isActive, true),
  ];

  if (q.length > 0) {
    conditions.push(
      or(
        ilike(patients.firstName, `%${q}%`),
        ilike(patients.lastName, `%${q}%`),
        ilike(patients.email, `%${q}%`),
        ilike(patients.phone, `%${q}%`),
        sql`${patients.chartId}::text ILIKE ${"%" + q + "%"}`
      )!
    );
  }

  return db
    .select({
      id: patients.id,
      firstName: patients.firstName,
      lastName: patients.lastName,
      chartId: patients.chartId,
    })
    .from(patients)
    .where(and(...conditions))
    .orderBy(asc(patients.lastName), asc(patients.firstName))
    .limit(PATIENT_PICKER_SEARCH_LIMIT);
}
