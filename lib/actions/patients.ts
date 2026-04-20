"use server";

/**
 * lib/actions/patients.ts
 *
 * Server actions for the patients entity.
 * Anatomy: getSession → requireRole → safeParse → DB.
 * Always return { success: true, data } or { success: false, error }.
 * Never throw.
 *
 * RBAC (docs/08-Business-Rules.md §3, §9):
 *   View / Create / Edit / Deactivate / Reactivate (updatePatient + isActive): all roles
 */

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { requireRole, ForbiddenError } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema";
import {
  getPatients as queryGetPatients,
  getPatientById,
  getActivePatients as queryGetActivePatients,
  searchActivePatientsForPicker as querySearchActivePatientsForPicker,
} from "@/lib/db/queries/patients";
import {
  createPatientSchema,
  updatePatientSchema,
} from "@/lib/validators/patient";
import { idSchema, n } from "@/lib/validators/common";
import { hasPermission } from "@/lib/permissions";
import { appendActivityLog } from "@/lib/activity-log";
import { getEntityActivity } from "@/lib/actions/activity-log";
import { getPrescriptionsByPatient } from "@/lib/actions/prescriptions";

/** Resolve persisted DOB: trim input, or Jan 1 from age when DOB empty. */
function resolveSaveDateOfBirth(
  dateOfBirth: string | undefined,
  age: number | undefined
): string | null {
  const t = dateOfBirth?.trim() ?? "";
  if (t.length > 0) return t;
  if (age !== undefined && Number.isFinite(age) && age >= 0) {
    return `${new Date().getFullYear() - age}-01-01`;
  }
  return null;
}

// ─── Input schemas for list/filter params ─────────────────────────────────────

const searchPatientsForPickerInputSchema = z.object({
  query: z.string().max(200).optional().default(""),
});

// ─── searchPatientsForPicker ─────────────────────────────────────────────────

/**
 * Debounced combobox search for appointment (and future) patient pickers.
 * Returns a minimal shape — not `getPatientDetail` / list row aggregates.
 */
export async function searchPatientsForPicker(input: unknown) {
  try {
    const session = await getSession();
    requireRole(session, ["admin", "doctor", "staff"]);

    const parsed = searchPatientsForPickerInputSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: "Invalid search." };
    }

    const { clinicId } = session.user;
    const data = await querySearchActivePatientsForPicker(clinicId, parsed.data.query ?? "");
    return { success: true as const, data };
  } catch (err) {
    if (err instanceof ForbiddenError) return { success: false as const, error: "FORBIDDEN" };
    console.error("[searchPatientsForPicker]", err);
    return { success: false as const, error: "Failed to search patients." };
  }
}

const getPatientsInputSchema = z.object({
  search:   z.string().optional(),
  status:   z.enum(["active", "inactive"]).optional(),
  doctorId: z.string().uuid().optional(),
  page:     z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(10),
  sortBy:   z.enum(["lastName", "lastVisit"]).optional().default("lastName"),
  sortDir:  z.enum(["asc", "desc"]).optional().default("asc"),
});

/**
 * Generates a unique patient chartId in the 10000–99999 range for the clinic.
 * Algorithm (docs/08-Business-Rules.md §1):
 *   1. Pick a random integer in range.
 *   2. Check uniqueness within the clinic.
 *   3. Retry up to 10 times on collision.
 *   4. After 10 failures, throw (caught by caller → returns { success: false }).
 */
async function generatePatientChartId(clinicId: string): Promise<number> {
  const MAX_ATTEMPTS = 10;

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    // 10000–99999 inclusive
    const candidate = Math.floor(Math.random() * 90000) + 10000;

    const existing = await db
      .select({ id: patients.id })
      .from(patients)
      .where(
        and(
          eq(patients.clinicId, clinicId),
          eq(patients.chartId, candidate)
        )
      )
      .limit(1);

    if (existing.length === 0) return candidate;
  }

  throw new Error(
    `Failed to generate a unique patient chartId for clinic ${clinicId} after ${MAX_ATTEMPTS} attempts.`
  );
}

// ─── getPatients ──────────────────────────────────────────────────────────────

export async function getPatients(input: unknown) {
  try {
    const session = await getSession();
    requireRole(session, ["admin", "doctor", "staff"]);

    const parsed = getPatientsInputSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: "Invalid filter parameters." };
    }

    const { clinicId } = session.user;
    const result = await queryGetPatients(clinicId, parsed.data);
    return { success: true as const, data: result };
  } catch (err) {
    if (err instanceof ForbiddenError) return { success: false as const, error: "FORBIDDEN" };
    console.error("[getPatients]", err);
    return { success: false as const, error: "Failed to fetch patients." };
  }
}

// ─── getPatientDetail ─────────────────────────────────────────────────────────

export async function getPatientDetail(id: unknown) {
  try {
    const session = await getSession();
    requireRole(session, ["admin", "doctor", "staff"]);

    const parsed = idSchema.safeParse(id);
    if (!parsed.success) {
      return { success: false as const, error: "Invalid patient ID." };
    }

    const { clinicId } = session.user;
    const patient = await getPatientById(clinicId, parsed.data);

    if (!patient) {
      return { success: false as const, error: "Patient not found." };
    }

    const canNotes = hasPermission(session.user.type, "viewClinicalNotes");
    const canTitle = hasPermission(session.user.type, "viewAppointmentTitle");
    const canDocuments = hasPermission(session.user.type, "viewDocuments");
    const canPrescriptions = hasPermission(session.user.type, "viewPrescriptions");
    const isStaff = session.user.type === "staff";

    let prescriptionsPayload: import("@/lib/actions/prescriptions").PatientPrescriptionSummary[] =
      [];
    if (canPrescriptions) {
      const rxResult = await getPrescriptionsByPatient({ patientId: parsed.data });
      if (rxResult.success) {
        prescriptionsPayload = rxResult.data;
      }
    }

    // Staff never see the activity sidebar — skip the query entirely
    let activityLogEntries: import("@/types/activity-log").ActivityLogEntry[] = [];
    let activityLogHasMore = false;
    if (!isStaff) {
      const activityResult = await getEntityActivity({
        entityType: "patient",
        entityId: parsed.data,
      });
      if (activityResult.success) {
        activityLogEntries = activityResult.data.entries;
        activityLogHasMore = activityResult.data.hasMore;
      }
    }

    return {
      success: true as const,
      data: {
        ...patient,
        pastHistoryNotes: canNotes ? patient.pastHistoryNotes : null,
        documents: canDocuments ? patient.documents : [],
        appointments: patient.appointments.map((a) => ({
          ...a,
          title: canTitle ? a.title : null,
        })),
        prescriptions: prescriptionsPayload,
        activityLog: activityLogEntries,
        activityLogHasMore,
      },
    };
  } catch (err) {
    if (err instanceof ForbiddenError) return { success: false as const, error: "FORBIDDEN" };
    console.error("[getPatientDetail]", err);
    return { success: false as const, error: "Failed to fetch patient." };
  }
}

// ─── createPatient ────────────────────────────────────────────────────────────

export async function createPatient(input: unknown) {
  try {
    const session = await getSession();
    requireRole(session, ["admin", "doctor", "staff"]);

    const parsed = createPatientSchema.safeParse(input);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid input.";
      return { success: false as const, error: message };
    }

    const { clinicId, id: userId } = session.user;

    // Generate a unique chartId using the docs/08-Business-Rules §1 algorithm
    let chartId: number;
    try {
      chartId = await generatePatientChartId(clinicId);
    } catch {
      return {
        success: false as const,
        error: "Failed to generate chart ID. Please try again.",
      };
    }

    const v = parsed.data;
    const dobResolved = resolveSaveDateOfBirth(v.dateOfBirth, v.age);
    if (!dobResolved) {
      return { success: false as const, error: "Enter date of birth or age." };
    }

    const canNotes = hasPermission(session.user.type, "viewClinicalNotes");

    const [created] = await db
      .insert(patients)
      .values({
        clinicId,
        chartId,
        firstName: v.firstName.trim(),
        lastName:  v.lastName.trim(),
        email:     n(v.email),
        phone:     n(v.phone),
        dateOfBirth: dobResolved,
        gender:    v.gender,
        address:   n(v.address),
        bloodGroup: v.bloodGroup ?? null,
        allergies: n(v.allergies),
        emergencyContactName:  n(v.emergencyContactName),
        emergencyContactPhone: n(v.emergencyContactPhone),
        pastHistoryNotes: canNotes ? n(v.pastHistoryNotes) : null,
        isActive:  true,
        createdBy: userId,
      })
      .returning({ id: patients.id });

    const patientName = `${v.firstName.trim()} ${v.lastName.trim()}`.trim();
    const entityDescriptor = `${patientName} (#PT-${chartId}) added`;

    await appendActivityLog({
      session,
      entityType: "patient",
      entityId: created.id,
      action: "created",
      metadata: { entityDescriptor },
    });

    revalidatePath("/patients/dashboard");

    return { success: true as const, data: { id: created.id } };
  } catch (err) {
    if (err instanceof ForbiddenError) return { success: false as const, error: "FORBIDDEN" };
    console.error("[createPatient]", err);
    return { success: false as const, error: "Failed to create patient." };
  }
}

// ─── updatePatient ────────────────────────────────────────────────────────────

export async function updatePatient(input: unknown) {
  try {
    const session = await getSession();
    requireRole(session, ["admin", "doctor", "staff"]);

    const parsed = updatePatientSchema.safeParse(input);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid input.";
      return { success: false as const, error: message };
    }

    const { clinicId } = session.user;
    const { id, age: _age, isActive, ...fields } = parsed.data;

    // Verify ownership — reuse this fetch for old-value diffing (no extra query)
    const existing = await getPatientById(clinicId, id);
    if (!existing) {
      return { success: false as const, error: "Patient not found." };
    }

    const canNotes = hasPermission(session.user.type, "viewClinicalNotes");

    const dobResolved = resolveSaveDateOfBirth(fields.dateOfBirth, _age);
    if (!dobResolved) {
      return { success: false as const, error: "Enter date of birth or age." };
    }

    await db
      .update(patients)
      .set({
        ...(fields.firstName !== undefined && { firstName: fields.firstName.trim() }),
        ...(fields.lastName  !== undefined && { lastName:  fields.lastName.trim()  }),
        ...(fields.email     !== undefined && { email:     n(fields.email)         }),
        ...(fields.phone     !== undefined && { phone:     n(fields.phone)         }),
        dateOfBirth: dobResolved,
        ...(fields.gender    !== undefined && { gender:    fields.gender            }),
        ...(fields.address   !== undefined && { address:   n(fields.address)        }),
        ...(fields.bloodGroup !== undefined && { bloodGroup: fields.bloodGroup ?? null }),
        ...(fields.allergies !== undefined && { allergies: n(fields.allergies)      }),
        ...(fields.emergencyContactName  !== undefined && { emergencyContactName:  n(fields.emergencyContactName)  }),
        ...(fields.emergencyContactPhone !== undefined && { emergencyContactPhone: n(fields.emergencyContactPhone) }),
        ...(canNotes && fields.pastHistoryNotes !== undefined && {
          pastHistoryNotes: n(fields.pastHistoryNotes),
        }),
        ...(isActive === true && { isActive: true }),
        updatedAt: new Date(),
      })
      .where(and(eq(patients.clinicId, clinicId), eq(patients.id, id)));

    // ── Activity log ───────────────────────────────────────────────────────────
    const isReactivation = isActive === true;
    const patientName = `${existing.firstName} ${existing.lastName}`.trim();
    const chartIdStr = `#PT-${existing.chartId}`;
    const action = isReactivation ? "reactivated" : "updated";
    const entityDescriptor = `${patientName} (${chartIdStr}) ${action}`;

    // Build changedFields diff — only for updated/reactivated, exclude isActive itself
    type ChangedField = { field: string; label: string; oldValue: string; newValue: string };
    const changedFields: ChangedField[] = [];

    if (!isReactivation) {
      const fieldMap: Array<{
        key: keyof typeof fields;
        label: string;
        oldVal: string | null | undefined;
        newVal: string | null | undefined;
      }> = [
        { key: "firstName",             label: "first name",             oldVal: existing.firstName,             newVal: fields.firstName?.trim() },
        { key: "lastName",              label: "last name",              oldVal: existing.lastName,              newVal: fields.lastName?.trim() },
        { key: "email",                 label: "email",                  oldVal: existing.email,                 newVal: n(fields.email) },
        { key: "phone",                 label: "phone",                  oldVal: existing.phone,                 newVal: n(fields.phone) },
        { key: "dateOfBirth",           label: "date of birth",          oldVal: existing.dateOfBirth,           newVal: dobResolved },
        { key: "gender",                label: "gender",                 oldVal: existing.gender,                newVal: fields.gender },
        { key: "address",               label: "address",                oldVal: existing.address,               newVal: n(fields.address) },
        { key: "bloodGroup",            label: "blood group",            oldVal: existing.bloodGroup,            newVal: fields.bloodGroup ?? null },
        { key: "allergies",             label: "allergies",              oldVal: existing.allergies,             newVal: n(fields.allergies) },
        { key: "emergencyContactName",  label: "emergency contact name", oldVal: existing.emergencyContactName,  newVal: n(fields.emergencyContactName) },
        { key: "emergencyContactPhone", label: "emergency contact phone",oldVal: existing.emergencyContactPhone, newVal: n(fields.emergencyContactPhone) },
        { key: "pastHistoryNotes",      label: "past history notes",     oldVal: existing.pastHistoryNotes,      newVal: canNotes ? n(fields.pastHistoryNotes) : undefined },
      ];

      for (const { key, label, oldVal, newVal } of fieldMap) {
        // Only diff fields that were present in the parsed input
        if (!(key in fields) && key !== "dateOfBirth") continue;
        const oldStr = oldVal ?? "";
        const newStr = newVal ?? "";
        if (oldStr !== newStr) {
          changedFields.push({ field: key, label, oldValue: oldStr, newValue: newStr });
        }
      }
    }

    await appendActivityLog({
      session,
      entityType: "patient",
      entityId: id,
      action,
      metadata: {
        entityDescriptor,
        ...(changedFields.length > 0 && { changedFields }),
      },
    });

    revalidatePath("/patients/dashboard");
    return { success: true as const, data: { id } };
  } catch (err) {
    if (err instanceof ForbiddenError) return { success: false as const, error: "FORBIDDEN" };
    console.error("[updatePatient]", err);
    return { success: false as const, error: "Failed to update patient." };
  }
}

// ─── deactivatePatient ──────────────────────────────────────────────────────────

export async function deactivatePatient(id: unknown) {
  try {
    const session = await getSession();
    requireRole(session, ["admin", "doctor", "staff"]);

    const parsed = idSchema.safeParse(id);
    if (!parsed.success) {
      return { success: false as const, error: "Invalid patient ID." };
    }

    const { clinicId } = session.user;

    const existing = await getPatientById(clinicId, parsed.data);
    if (!existing) {
      return { success: false as const, error: "Patient not found." };
    }

    await db
      .update(patients)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(patients.clinicId, clinicId), eq(patients.id, parsed.data)));

    const patientName = `${existing.firstName} ${existing.lastName}`.trim();
    await appendActivityLog({
      session,
      entityType: "patient",
      entityId: parsed.data,
      action: "deactivated",
      metadata: {
        entityDescriptor: `${patientName} (#PT-${existing.chartId}) deactivated`,
      },
    });

    revalidatePath("/patients/dashboard");
    return { success: true as const, data: { id: parsed.data } };
  } catch (err) {
    if (err instanceof ForbiddenError) return { success: false as const, error: "FORBIDDEN" };
    console.error("[deactivatePatient]", err);
    return { success: false as const, error: "Failed to deactivate patient." };
  }
}

// ─── getActivePatients ────────────────────────────────────────────────────────

/**
 * Active patients for select pickers (`is_active = true`).
 * Appointment routes import this from here alongside `getActiveDoctors` from `lib/actions/appointments.ts` (Next.js `"use server"` files cannot reliably re-export actions from another module).
 */
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
