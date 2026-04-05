"use server";

/**
 * lib/actions/home.ts
 *
 * Server actions for the Home Dashboard page.
 * Anatomy: getSession → requireRole → DB.
 * Always return { success: true, data } or { success: false, error }.
 * Never throw.
 *
 * RBAC: all roles can view the home dashboard.
 */

import { z } from "zod";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { requireRole, ForbiddenError } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { appointments, patients, users } from "@/lib/db/schema";

const limitSchema = z.number().int().min(1).max(50).default(5);

// ─── getHomeStats ─────────────────────────────────────────────────────────────

export async function getHomeStats() {
  try {
    const session = await getSession();
    requireRole(session, ["admin", "doctor", "staff"]);
    const { clinicId } = session.user;

    const now = new Date();
    // Start of current calendar month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    // 30 days ago
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalPatientsResult,
      appointmentsTodayResult,
      appointmentsScheduledResult,
      appointmentsCompletedResult,
      newPatientsResult,
    ] = await Promise.all([
      // Total active patients
      db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(patients)
        .where(
          and(eq(patients.clinicId, clinicId), eq(patients.isActive, true))
        ),

      // Appointments scheduled for today
      db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(appointments)
        .where(
          and(
            eq(appointments.clinicId, clinicId),
            eq(appointments.isActive, true),
            sql`${appointments.scheduledAt}::date = CURRENT_DATE`
          )
        ),

      // Appointments with status = 'scheduled' (upcoming / not yet completed or cancelled)
      db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(appointments)
        .where(
          and(
            eq(appointments.clinicId, clinicId),
            eq(appointments.isActive, true),
            eq(appointments.status, "scheduled")
          )
        ),

      // Appointments completed in the last 30 days
      db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(appointments)
        .where(
          and(
            eq(appointments.clinicId, clinicId),
            eq(appointments.isActive, true),
            eq(appointments.status, "completed"),
            gte(appointments.scheduledAt, thirtyDaysAgo)
          )
        ),

      // New patients created this calendar month
      db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(patients)
        .where(
          and(
            eq(patients.clinicId, clinicId),
            gte(patients.createdAt, monthStart)
          )
        ),
    ]);

    return {
      success: true as const,
      data: {
        totalPatients:         totalPatientsResult[0]?.count ?? 0,
        appointmentsToday:     appointmentsTodayResult[0]?.count ?? 0,
        appointmentsScheduled: appointmentsScheduledResult[0]?.count ?? 0,
        appointmentsCompleted: appointmentsCompletedResult[0]?.count ?? 0,
        newPatientsThisMonth:  newPatientsResult[0]?.count ?? 0,
      },
    };
  } catch (err) {
    if (err instanceof ForbiddenError) return { success: false as const, error: "FORBIDDEN" };
    console.error("[getHomeStats]", err);
    return { success: false as const, error: "Failed to load home stats." };
  }
}

// ─── getRecentAppointments ────────────────────────────────────────────────────

export async function getRecentAppointments(limit: unknown = 5) {
  try {
    const session = await getSession();
    requireRole(session, ["admin", "doctor", "staff"]);

    const parsedLimit = limitSchema.safeParse(limit);
    if (!parsedLimit.success) {
      return { success: false as const, error: "Invalid limit parameter." };
    }

    const { clinicId } = session.user;

    const rows = await db
      .select({
        id:          appointments.id,
        title:       appointments.title,
        scheduledAt: appointments.scheduledAt,
        status:      appointments.status,
        category:    appointments.category,
        visitType:   appointments.visitType,
        patientFirstName: patients.firstName,
        patientLastName:  patients.lastName,
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
          eq(appointments.isActive, true)
        )
      )
      .orderBy(desc(appointments.scheduledAt))
      .limit(parsedLimit.data);

    return {
      success: true as const,
      data: rows.map((r) => ({
        id:          r.id,
        title:       r.title,
        patientName: `${r.patientFirstName} ${r.patientLastName}`.trim(),
        doctorName:  r.doctorName ?? "",
        scheduledAt: r.scheduledAt,
        status:      r.status,
        category:    r.category,
        visitType:   r.visitType,
      })),
    };
  } catch (err) {
    if (err instanceof ForbiddenError) return { success: false as const, error: "FORBIDDEN" };
    console.error("[getRecentAppointments]", err);
    return {
      success: false as const,
      error: "Failed to load recent appointments.",
    };
  }
}

// ─── getRecentPatients ────────────────────────────────────────────────────────

export async function getRecentPatients(limit: unknown = 5) {
  try {
    const session = await getSession();
    requireRole(session, ["admin", "doctor", "staff"]);

    const parsedLimit = limitSchema.safeParse(limit);
    if (!parsedLimit.success) {
      return { success: false as const, error: "Invalid limit parameter." };
    }

    const { clinicId } = session.user;

    const rows = await db
      .select({
        id:        patients.id,
        chartId:   patients.chartId,
        firstName: patients.firstName,
        lastName:  patients.lastName,
        isActive:  patients.isActive,
        createdAt: patients.createdAt,
      })
      .from(patients)
      .where(eq(patients.clinicId, clinicId))
      .orderBy(desc(patients.createdAt))
      .limit(parsedLimit.data);

    return {
      success: true as const,
      data: rows.map((r) => ({
        id:        r.id,
        chartId:   r.chartId,
        firstName: r.firstName,
        lastName:  r.lastName,
        status:    r.isActive ? ("active" as const) : ("inactive" as const),
        createdAt: r.createdAt,
      })),
    };
  } catch (err) {
    if (err instanceof ForbiddenError) return { success: false as const, error: "FORBIDDEN" };
    console.error("[getRecentPatients]", err);
    return {
      success: false as const,
      error: "Failed to load recent patients.",
    };
  }
}
