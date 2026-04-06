"use server";

/**
 * Global search across patients, appointments, medicines, and documents.
 * Anatomy: getSession → requireRole → safeParse → parallel scoped queries.
 */

import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { requireRole, ForbiddenError } from "@/lib/auth/rbac";
import { hasPermission } from "@/lib/permissions";
import { db } from "@/lib/db";
import {
  appointments,
  documents,
  medicines,
  patients,
  users,
} from "@/lib/db/schema";
import type {
  AppointmentCategory,
  AppointmentStatus,
  AppointmentVisitType,
} from "@/lib/constants/appointment";
import { searchGlobalQuerySchema } from "@/lib/validators/search";
import type { GroupedSearchResults } from "@/types/search";

function patientSubtitle(email: string | null, phone: string | null): string | null {
  const e = email?.trim();
  const p = phone?.trim();
  if (e) return e;
  if (p) return p;
  return null;
}

export async function searchGlobal(query: unknown) {
  try {
    const session = await getSession();
    requireRole(session, ["admin", "doctor", "staff"]);

    const parsed = searchGlobalQuerySchema.safeParse(query);
    if (!parsed.success) {
      return {
        success: false as const,
        error: parsed.error.issues[0]?.message ?? "Invalid search query.",
      };
    }

    const q = parsed.data;
    const { clinicId } = session.user;
    const like = `%${q}%`;

    const [patientRows, appointmentRows, medicineRows, documentRows] = await Promise.all([
      db
        .select({
          id: patients.id,
          chartId: patients.chartId,
          firstName: patients.firstName,
          lastName: patients.lastName,
          email: patients.email,
          phone: patients.phone,
        })
        .from(patients)
        .where(
          and(
            eq(patients.clinicId, clinicId),
            or(
              ilike(patients.firstName, like),
              ilike(patients.lastName, like),
              ilike(patients.email, like),
              ilike(patients.phone, like),
              sql`${patients.chartId}::text ILIKE ${like}`
            )
          )
        )
        .orderBy(asc(patients.lastName), asc(patients.firstName))
        .limit(5),

      db
        .select({
          id: appointments.id,
          title: appointments.title,
          scheduledAt: appointments.scheduledAt,
          status: appointments.status,
          category: appointments.category,
          visitType: appointments.visitType,
          patientFirstName: patients.firstName,
          patientLastName: patients.lastName,
        })
        .from(appointments)
        .innerJoin(patients, eq(appointments.patientId, patients.id))
        .leftJoin(users, eq(appointments.doctorId, users.id))
        .where(
          and(
            eq(appointments.clinicId, clinicId),
            eq(appointments.isActive, true),
            or(
              ilike(appointments.title, like),
              ilike(patients.firstName, like),
              ilike(patients.lastName, like),
              sql`COALESCE(NULLIF(TRIM(${users.firstName} || ' ' || ${users.lastName}), ''), ${users.name}) ILIKE ${like}`
            )
          )
        )
        .orderBy(desc(appointments.scheduledAt))
        .limit(5),

      db
        .select({
          id: medicines.id,
          name: medicines.name,
          category: medicines.category,
          brand: medicines.brand,
        })
        .from(medicines)
        .where(
          and(
            eq(medicines.clinicId, clinicId),
            eq(medicines.isActive, true),
            or(ilike(medicines.name, like), ilike(medicines.brand, like))
          )
        )
        .orderBy(asc(medicines.name))
        .limit(5),

      db
        .select({
          id: documents.id,
          title: documents.title,
          fileName: documents.fileName,
          mimeType: documents.mimeType,
          type: documents.type,
          assignedToType: documents.assignedToType,
          patientFirstName: patients.firstName,
          patientLastName: patients.lastName,
          patientId: patients.id,
        })
        .from(documents)
        .leftJoin(
          patients,
          and(
            eq(documents.assignedToType, "patient"),
            sql`${documents.assignedToId} = ${patients.id}::text`,
            eq(patients.clinicId, clinicId)
          )
        )
        .where(
          and(
            eq(documents.clinicId, clinicId),
            or(
              ilike(documents.title, like),
              ilike(documents.fileName, like),
              sql`COALESCE(${documents.description}, '') ILIKE ${like}`
            )
          )
        )
        .orderBy(desc(documents.createdAt))
        .limit(5),
    ]);

    const canTitle = hasPermission(session.user.type, "viewAppointmentTitle");

    const data: GroupedSearchResults = {
      patients: patientRows.map((r) => ({
        id: r.id,
        chartId: String(r.chartId),
        firstName: r.firstName,
        lastName: r.lastName,
        subtitle: patientSubtitle(r.email, r.phone),
        phone: r.phone?.trim() ? r.phone.trim() : null,
      })),
      appointments: appointmentRows.map((r) => ({
        id: r.id,
        title: canTitle ? r.title : null,
        patientName: `${r.patientFirstName} ${r.patientLastName}`.trim(),
        date: r.scheduledAt.toISOString(),
        status: r.status as AppointmentStatus,
        category: r.category as AppointmentCategory,
        visitType: r.visitType as AppointmentVisitType,
      })),
      medicines: medicineRows.map((r) => ({
        id: r.id,
        name: r.name,
        category: r.category,
        brand: r.brand,
      })),
      documents: documentRows.map((r) => {
        const fn = r.patientFirstName?.trim() ?? "";
        const ln = r.patientLastName?.trim() ?? "";
        const patientName =
          fn || ln ? `${fn} ${ln}`.trim() : null;
        const assigned = r.assignedToType;
        return {
          id: r.id,
          title: r.title,
          fileName: r.fileName,
          mimeType: r.mimeType,
          type: r.type,
          assignedToType: assigned as "patient" | "user",
          patientName,
          patientId: r.patientId ?? null,
        };
      }),
    };

    return { success: true as const, data };
  } catch (err) {
    if (err instanceof ForbiddenError) return { success: false as const, error: "FORBIDDEN" };
    console.error("[searchGlobal]", err);
    return { success: false as const, error: "Search failed." };
  }
}
