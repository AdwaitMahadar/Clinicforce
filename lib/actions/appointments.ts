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
 *   Create / Edit / Deactivate : all roles
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { requireRole, ForbiddenError } from "@/lib/auth/rbac";
import { hasPermission } from "@/lib/permissions";
import { db } from "@/lib/db";
import { appointments, patients, users } from "@/lib/db/schema";
import {
  getAppointments as queryGetAppointments,
  getAppointmentById,
  getActiveDoctors as queryGetActiveDoctors,
} from "@/lib/db/queries/appointments";
import {
  createAppointmentSchema,
  updateAppointmentSchema,
} from "@/lib/validators/appointment";
import { idSchema, n } from "@/lib/validators/common";

// ─── Input schemas ─────────────────────────────────────────────────────────────

const getAppointmentsInputSchema = z.object({
  rangeStart: z.string().min(1, "rangeStart is required"),
  rangeEnd:   z.string().min(1, "rangeEnd is required"),
});

/**
 * Normalizes a time segment for ISO datetime strings. Never pass a bare "HH:mm"
 * to `new Date()` alone — always pair with a full calendar date first.
 */
function normalizeTimeForIso(raw: string): string {
  const t = raw.trim();
  if (!t) return "00:00:00";
  if (t.length === 5 && t[2] === ":") return `${t}:00`;
  return t;
}

function scheduledAtFromParts(scheduledDate: string, scheduledTime: string): Date {
  const combined = `${scheduledDate.trim()}T${normalizeTimeForIso(scheduledTime)}`;
  const d = new Date(combined);
  if (Number.isNaN(d.getTime())) {
    throw new Error("Invalid scheduled date/time");
  }
  return d;
}

/** Builds `actual_check_in` using the server's calendar day (`serverNow`) + user time. */
function actualCheckInFromTimeOnly(
  timePart: string | undefined,
  serverNow: Date
): Date | null {
  const t = timePart?.trim();
  if (!t) return null;
  const y = serverNow.getFullYear();
  const m = serverNow.getMonth() + 1;
  const day = serverNow.getDate();
  const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const combined = `${dateStr}T${normalizeTimeForIso(t)}`;
  const d = new Date(combined);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function localDateYmd(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

function localTimeHm(d: Date): string {
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${min}`;
}

/** Aligns `<input type="time" />` values (may be HH:mm:ss) with `localTimeHm` (HH:mm). */
function normalizeHmInput(raw: string): string {
  const t = raw.trim();
  if (t.length >= 8 && t[2] === ":" && t[5] === ":") return t.slice(0, 5);
  if (t.length >= 5 && t[2] === ":") return t.slice(0, 5);
  return t;
}

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

    const rows = await queryGetAppointments(clinicId, { rangeStart, rangeEnd });
    const canNotes = hasPermission(session.user.type, "viewClinicalNotes");
    const canTitle = hasPermission(session.user.type, "viewAppointmentTitle");
    const data = rows.map((row) => ({
      ...row,
      notes: canNotes ? row.notes : null,
      title: canTitle ? row.title : null,
    }));
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

    const canNotes = hasPermission(session.user.type, "viewClinicalNotes");
    const canTitle = hasPermission(session.user.type, "viewAppointmentTitle");
    const canDocuments = hasPermission(session.user.type, "viewDocuments");
    return {
      success: true as const,
      data: {
        ...appointment,
        notes: canNotes ? appointment.notes : null,
        title: canTitle ? appointment.title : null,
        patientDocuments: canDocuments ? appointment.patientDocuments : [],
        patientAppointments: appointment.patientAppointments.map((a) => ({
          ...a,
          title: canTitle ? a.title : null,
        })),
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
    const canNotes = hasPermission(session.user.type, "viewClinicalNotes");
    const canTitle = hasPermission(session.user.type, "viewAppointmentTitle");
    const serverNow = new Date();

    let scheduledAt: Date;
    try {
      scheduledAt = scheduledAtFromParts(v.scheduledDate, v.scheduledTime ?? "");
    } catch {
      return { success: false as const, error: "Invalid scheduled date or time." };
    }

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

    const titleTrimmed = canTitle ? (v.title?.trim() ?? "") : "";
    const [created] = await db
      .insert(appointments)
      .values({
        clinicId,
        patientId:          v.patientId,
        doctorId:           v.doctorId,
        title:              titleTrimmed ? titleTrimmed : null,
        description:        n(v.description),
        category:           v.category,
        visitType:          v.visitType,
        status:             v.status ?? "scheduled",
        scheduledAt,
        duration:           v.duration,
        fee:                v.fee ?? null,
        actualCheckIn:      actualCheckInFromTimeOnly(v.actualCheckIn, serverNow),
        notes:              canNotes ? n(v.notes) : null,
        isActive:           true,
        createdBy:          userId,
      })
      .returning({ id: appointments.id });

    revalidatePath("/appointments/dashboard");
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
    if (!hasPermission(session.user.type, "viewClinicalNotes")) {
      delete fields.notes;
    }
    if (!hasPermission(session.user.type, "viewAppointmentTitle")) {
      delete fields.title;
    }
    const serverNow = new Date();

    // Verify ownership
    const existing = await getAppointmentById(clinicId, id);
    if (!existing) {
      return { success: false as const, error: "Appointment not found." };
    }

    let scheduledAt: Date | undefined;
    if (fields.scheduledDate !== undefined || fields.scheduledTime !== undefined) {
      const base = existing.scheduledAt;
      const datePart =
        fields.scheduledDate !== undefined ? fields.scheduledDate : localDateYmd(base);
      const timePart =
        fields.scheduledTime !== undefined ? fields.scheduledTime : localTimeHm(base);
      try {
        scheduledAt = scheduledAtFromParts(datePart, timePart ?? "");
      } catch {
        return { success: false as const, error: "Invalid scheduled date or time." };
      }
    }

    let actualCheckIn: Date | null | undefined;
    if (fields.actualCheckIn !== undefined) {
      const trimmed = fields.actualCheckIn.trim();
      if (!trimmed) {
        actualCheckIn = null;
      } else if (
        existing.actualCheckIn &&
        localTimeHm(existing.actualCheckIn) === normalizeHmInput(trimmed)
      ) {
        actualCheckIn = existing.actualCheckIn;
      } else {
        actualCheckIn = actualCheckInFromTimeOnly(trimmed, serverNow);
      }
    }

    // Patient is immutable after creation (UI disables; reject tampered payloads)
    if (fields.patientId !== undefined && fields.patientId !== existing.patientId) {
      return {
        success: false as const,
        error: "Patient cannot be changed after the appointment is created.",
      };
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
        ...(fields.title !== undefined && {
          title: fields.title.trim() ? fields.title.trim() : null,
        }),
        ...(fields.description !== undefined && { description: n(fields.description)      }),
        ...(fields.doctorId    !== undefined && { doctorId:    fields.doctorId            }),
        ...(fields.category   !== undefined && { category:    fields.category            }),
        ...(fields.visitType  !== undefined && { visitType:   fields.visitType           }),
        ...(fields.status      !== undefined && { status:      fields.status              }),
        ...(scheduledAt !== undefined && { scheduledAt }),
        ...(fields.duration    !== undefined && { duration:    fields.duration            }),
        ...(fields.fee !== undefined && { fee: fields.fee }),
        ...(actualCheckIn !== undefined && { actualCheckIn }),
        ...(fields.notes       !== undefined && { notes:       n(fields.notes)            }),
        updatedAt: new Date(),
      })
      .where(and(eq(appointments.clinicId, clinicId), eq(appointments.id, id)));

    revalidatePath("/appointments/dashboard");
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

    revalidatePath("/appointments/dashboard");
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
