"use server";

/**
 * lib/actions/appointments.ts
 *
 * Server actions for the appointments entity.
 * Anatomy: getSession → requireRole → safeParse → DB.
 * Always return { success: true, data } or { success: false, error }.
 * Never throw.
 *
 * RBAC (docs/08-Business-Rules.md §4, §8):
 *   Create / Edit : all roles
 *   Soft-delete   : doctor, admin
 */

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { requireRole, ForbiddenError } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { appointments, patients, users } from "@/lib/db/schema";
import {
  getAppointments as queryGetAppointments,
  getAppointmentById,
  getActiveDoctors as queryGetActiveDoctors,
} from "@/lib/db/queries/appointments";
import { getActivePatients as queryGetActivePatients } from "@/lib/db/queries/patients";
import {
  createAppointmentSchema,
  updateAppointmentSchema,
} from "@/lib/validators/appointment";

// ─── Input schemas ─────────────────────────────────────────────────────────────

const getAppointmentsInputSchema = z.object({
  rangeStart: z.string().min(1, "rangeStart is required"),
  rangeEnd:   z.string().min(1, "rangeEnd is required"),
});

const idSchema = z.string().uuid("Invalid ID");

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Treat empty/blank strings as null for nullable timestamp DB columns. */
const dateOrNull = (v?: string | null): Date | null =>
  v && v.trim() ? new Date(v.trim()) : null;

/** Treat empty/blank strings as null for nullable string DB columns. */
const n = (v?: string | null): string | null =>
  v && v.trim() ? v.trim() : null;

// ─── getAppointments ───────────────────────────────────────────────────────────

export async function getAppointments(input: unknown) {
  try {
    const session = await getSession();
    requireRole(session, ["admin", "doctor", "staff"]);

    const parsed = getAppointmentsInputSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: "Invalid date range parameters." };
    }

    const { clinicId } = session.user;
    const rangeStart = new Date(parsed.data.rangeStart);
    const rangeEnd   = new Date(parsed.data.rangeEnd);

    if (isNaN(rangeStart.getTime()) || isNaN(rangeEnd.getTime())) {
      return { success: false as const, error: "Invalid date range values." };
    }

    const data = await queryGetAppointments(clinicId, { rangeStart, rangeEnd });
    return { success: true as const, data };
  } catch (err) {
    if (err instanceof ForbiddenError) return { success: false as const, error: "FORBIDDEN" };
    console.error("[getAppointments]", err);
    return { success: false as const, error: "Failed to fetch appointments." };
  }
}

// ─── getAppointmentDetail ──────────────────────────────────────────────────────

export async function getAppointmentDetail(id: unknown) {
  try {
    const session = await getSession();
    requireRole(session, ["admin", "doctor", "staff"]);

    const parsed = idSchema.safeParse(id);
    if (!parsed.success) {
      return { success: false as const, error: "Invalid appointment ID." };
    }

    const { clinicId } = session.user;
    const appointment = await getAppointmentById(clinicId, parsed.data);

    if (!appointment) {
      return { success: false as const, error: "Appointment not found." };
    }

    return {
      success: true as const,
      data: {
        ...appointment,
        // TODO: Implement when audit_log table is built.
        activityLog: [] as never[],
      },
    };
  } catch (err) {
    if (err instanceof ForbiddenError) return { success: false as const, error: "FORBIDDEN" };
    console.error("[getAppointmentDetail]", err);
    return { success: false as const, error: "Failed to fetch appointment." };
  }
}

// ─── createAppointment ─────────────────────────────────────────────────────────

export async function createAppointment(input: unknown) {
  try {
    const session = await getSession();
    requireRole(session, ["admin", "doctor", "staff"]);

    const parsed = createAppointmentSchema.safeParse(input);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid input.";
      return { success: false as const, error: message };
    }

    const { clinicId, id: userId } = session.user;
    const v = parsed.data;

    // Business rule: patient must be active (docs/08-Business-Rules §4)
    const [patient] = await db
      .select({ id: patients.id, isActive: patients.isActive })
      .from(patients)
      .where(and(eq(patients.clinicId, clinicId), eq(patients.id, v.patientId)))
      .limit(1);

    if (!patient) {
      return { success: false as const, error: "Patient not found." };
    }
    if (!patient.isActive) {
      return {
        success: false as const,
        error: "Cannot schedule an appointment for an inactive patient.",
      };
    }

    // Business rule: doctor must be an active user with type = 'doctor'
    const [doctor] = await db
      .select({ id: users.id, isActive: users.isActive, type: users.type })
      .from(users)
      .where(and(eq(users.clinicId, clinicId), eq(users.id, v.doctorId)))
      .limit(1);

    if (!doctor) {
      return { success: false as const, error: "Doctor not found." };
    }
    if (!doctor.isActive) {
      return { success: false as const, error: "Cannot assign an inactive doctor." };
    }
    if (doctor.type !== "doctor") {
      return { success: false as const, error: "The selected user is not a doctor." };
    }

    const [created] = await db
      .insert(appointments)
      .values({
        clinicId,
        patientId:          v.patientId,
        doctorId:           v.doctorId,
        title:              v.title.trim(),
        description:        n(v.description),
        type:               v.type,
        status:             v.status ?? "scheduled",
        date:               new Date(v.date),
        duration:           v.duration,
        scheduledStartTime: dateOrNull(v.scheduledStartTime),
        scheduledEndTime:   dateOrNull(v.scheduledEndTime),
        actualCheckIn:      dateOrNull(v.actualCheckIn),
        actualCheckOut:     dateOrNull(v.actualCheckOut),
        notes:              n(v.notes),
        isActive:           true,
        createdBy:          userId,
      })
      .returning({ id: appointments.id });

    return { success: true as const, data: { id: created.id } };
  } catch (err) {
    if (err instanceof ForbiddenError) return { success: false as const, error: "FORBIDDEN" };
    console.error("[createAppointment]", err);
    return { success: false as const, error: "Failed to create appointment." };
  }
}

// ─── updateAppointment ─────────────────────────────────────────────────────────

export async function updateAppointment(input: unknown) {
  try {
    const session = await getSession();
    requireRole(session, ["admin", "doctor", "staff"]);

    const parsed = updateAppointmentSchema.safeParse(input);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid input.";
      return { success: false as const, error: message };
    }

    const { clinicId } = session.user;
    const { id, ...fields } = parsed.data;

    // Verify ownership
    const existing = await getAppointmentById(clinicId, id);
    if (!existing) {
      return { success: false as const, error: "Appointment not found." };
    }

    // If patientId is changing, verify new patient is active
    if (fields.patientId !== undefined) {
      const [patient] = await db
        .select({ isActive: patients.isActive })
        .from(patients)
        .where(and(eq(patients.clinicId, clinicId), eq(patients.id, fields.patientId)))
        .limit(1);

      if (!patient) {
        return { success: false as const, error: "Patient not found." };
      }
      if (!patient.isActive) {
        return {
          success: false as const,
          error: "Cannot assign an inactive patient.",
        };
      }
    }

    // If doctorId is changing, verify new doctor is active doctor
    if (fields.doctorId !== undefined) {
      const [doctor] = await db
        .select({ isActive: users.isActive, type: users.type })
        .from(users)
        .where(and(eq(users.clinicId, clinicId), eq(users.id, fields.doctorId)))
        .limit(1);

      if (!doctor) {
        return { success: false as const, error: "Doctor not found." };
      }
      if (!doctor.isActive || doctor.type !== "doctor") {
        return {
          success: false as const,
          error: "Invalid doctor selection.",
        };
      }
    }

    await db
      .update(appointments)
      .set({
        ...(fields.title       !== undefined && { title:       fields.title.trim()        }),
        ...(fields.description !== undefined && { description: n(fields.description)      }),
        ...(fields.patientId   !== undefined && { patientId:   fields.patientId           }),
        ...(fields.doctorId    !== undefined && { doctorId:    fields.doctorId            }),
        ...(fields.type        !== undefined && { type:        fields.type                }),
        ...(fields.status      !== undefined && { status:      fields.status              }),
        ...(fields.date        !== undefined && { date:        new Date(fields.date)      }),
        ...(fields.duration    !== undefined && { duration:    fields.duration            }),
        ...(fields.scheduledStartTime !== undefined && { scheduledStartTime: dateOrNull(fields.scheduledStartTime) }),
        ...(fields.scheduledEndTime   !== undefined && { scheduledEndTime:   dateOrNull(fields.scheduledEndTime)   }),
        ...(fields.actualCheckIn      !== undefined && { actualCheckIn:      dateOrNull(fields.actualCheckIn)      }),
        ...(fields.actualCheckOut     !== undefined && { actualCheckOut:     dateOrNull(fields.actualCheckOut)     }),
        ...(fields.notes       !== undefined && { notes:       n(fields.notes)            }),
        updatedAt: new Date(),
      })
      .where(and(eq(appointments.clinicId, clinicId), eq(appointments.id, id)));

    return { success: true as const, data: { id } };
  } catch (err) {
    if (err instanceof ForbiddenError) return { success: false as const, error: "FORBIDDEN" };
    console.error("[updateAppointment]", err);
    return { success: false as const, error: "Failed to update appointment." };
  }
}

// ─── deleteAppointment (soft) ──────────────────────────────────────────────────

export async function deleteAppointment(id: unknown) {
  try {
    const session = await getSession();
    requireRole(session, ["admin", "doctor", "staff"]);

    const parsed = idSchema.safeParse(id);
    if (!parsed.success) {
      return { success: false as const, error: "Invalid appointment ID." };
    }

    const { clinicId } = session.user;

    const existing = await getAppointmentById(clinicId, parsed.data);
    if (!existing) {
      return { success: false as const, error: "Appointment not found." };
    }

    await db
      .update(appointments)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(appointments.clinicId, clinicId),
          eq(appointments.id, parsed.data)
        )
      );

    return { success: true as const, data: { id: parsed.data } };
  } catch (err) {
    if (err instanceof ForbiddenError) return { success: false as const, error: "FORBIDDEN" };
    console.error("[deleteAppointment]", err);
    return { success: false as const, error: "Failed to cancel appointment." };
  }
}

// ─── getActiveDoctors ──────────────────────────────────────────────────────────

/** Returns active doctors for the appointment form doctor picker. */
export async function getActiveDoctors() {
  try {
    const session = await getSession();
    requireRole(session, ["admin", "doctor", "staff"]);

    const { clinicId } = session.user;
    const data = await queryGetActiveDoctors(clinicId);
    return { success: true as const, data };
  } catch (err) {
    if (err instanceof ForbiddenError) return { success: false as const, error: "FORBIDDEN" };
    console.error("[getActiveDoctors]", err);
    return { success: false as const, error: "Failed to fetch active doctors." };
  }
}

// ─── getActivePatients ─────────────────────────────────────────────────────────

/** Returns active patients for the appointment form patient picker. */
export async function getActivePatients() {
  try {
    const session = await getSession();
    requireRole(session, ["admin", "doctor", "staff"]);

    const { clinicId } = session.user;
    const data = await queryGetActivePatients(clinicId);
    return { success: true as const, data };
  } catch (err) {
    if (err instanceof ForbiddenError) return { success: false as const, error: "FORBIDDEN" };
    console.error("[getActivePatients]", err);
    return { success: false as const, error: "Failed to fetch active patients." };
  }
}
