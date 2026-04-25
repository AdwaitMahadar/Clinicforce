"use server";

/**
 * Structured prescription server actions (draft / publish, line items, notes).
 * Anatomy: getSession → requireRole(["admin","doctor"]) → safeParse → DB scoped by clinicId.
 * Returns { success: true, data } | { success: false, error } — never throws.
 * Business rules: `docs/08-Business-Rules.md` §6.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, asc, count, desc, eq, inArray, isNotNull, max, ne } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { requireRole, ForbiddenError } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import {
  appointments,
  medicines,
  prescriptionItems,
  prescriptions,
  users,
} from "@/lib/db/schema";
import {
  addPrescriptionItemSchema,
  updatePrescriptionItemSchema,
  reorderPrescriptionItemsSchema,
  removePrescriptionItemSchema,
  clearPrescriptionItemsSchema,
  updatePrescriptionNotesSchema,
  publishPrescriptionSchema,
} from "@/lib/validators/prescription";
import type {
  PrescriptionItemPayload,
  PrescriptionWithItemsPayload,
  PrescriptionItemForAppointmentTab,
} from "@/types/prescription";

const appointmentIdParamSchema = z.object({
  appointmentId: z.string().uuid("Invalid appointment"),
});

const patientIdParamSchema = z.object({
  patientId: z.string().uuid("Invalid patient"),
});

/** Same random uniqueness pattern as patient chart IDs — scoped to `prescriptions` per clinic. */
async function generatePrescriptionChartId(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  clinicId: string
): Promise<number> {
  const MAX_ATTEMPTS = 10;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const candidate = Math.floor(Math.random() * 90000) + 10000;
    const existing = await tx
      .select({ id: prescriptions.id })
      .from(prescriptions)
      .where(and(eq(prescriptions.clinicId, clinicId), eq(prescriptions.chartId, candidate)))
      .limit(1);
    if (existing.length === 0) return candidate;
  }
  throw new Error(
    `Failed to generate a unique prescription chartId for clinic ${clinicId} after ${MAX_ATTEMPTS} attempts.`
  );
}

function doctorDisplayName(first: string | null, last: string | null): string {
  const s = `${first ?? ""} ${last ?? ""}`.trim();
  return s.length > 0 ? s : "—";
}

function revalidatePrescriptionPaths(appointmentId: string, patientId: string) {
  revalidatePath("/appointments/dashboard");
  revalidatePath("/patients/dashboard");
  revalidatePath(`/appointments/view/${appointmentId}`);
  revalidatePath(`/patients/view/${patientId}`);
}

function mapItemRow(
  row: typeof prescriptionItems.$inferSelect,
  catalogName: string | null
): PrescriptionItemPayload {
  const displayMedicineName =
    row.medicineName?.trim() ||
    catalogName?.trim() ||
    "Unknown medicine";
  return {
    id: row.id,
    medicineId: row.medicineId,
    medicineName: row.medicineName,
    displayMedicineName,
    morningEnabled: row.morningEnabled,
    morningQuantity: row.morningQuantity,
    morningTiming: row.morningTiming,
    afternoonEnabled: row.afternoonEnabled,
    afternoonQuantity: row.afternoonQuantity,
    afternoonTiming: row.afternoonTiming,
    nightEnabled: row.nightEnabled,
    nightQuantity: row.nightQuantity,
    nightTiming: row.nightTiming,
    duration: row.duration,
    remarks: row.remarks,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function buildPrescriptionPayload(
  clinicId: string,
  prescriptionRow: typeof prescriptions.$inferSelect
): Promise<PrescriptionWithItemsPayload> {
  const itemRows = await db
    .select({
      item: prescriptionItems,
      catalogName: medicines.name,
    })
    .from(prescriptionItems)
    .innerJoin(medicines, eq(prescriptionItems.medicineId, medicines.id))
    .where(
      and(
        eq(prescriptionItems.prescriptionId, prescriptionRow.id),
        eq(prescriptionItems.isActive, true),
        eq(medicines.clinicId, clinicId)
      )
    )
    .orderBy(asc(prescriptionItems.sortOrder));

  const items = itemRows.map((r) => mapItemRow(r.item, r.catalogName));

  return {
    id: prescriptionRow.id,
    appointmentId: prescriptionRow.appointmentId,
    patientId: prescriptionRow.patientId,
    doctorId: prescriptionRow.doctorId,
    chartId: prescriptionRow.chartId,
    notes: prescriptionRow.notes,
    publishedAt: prescriptionRow.publishedAt,
    isActive: prescriptionRow.isActive,
    createdBy: prescriptionRow.createdBy,
    createdAt: prescriptionRow.createdAt,
    updatedAt: prescriptionRow.updatedAt,
    items,
  };
}

// ─── addPrescriptionItem ───────────────────────────────────────────────────────

export async function addPrescriptionItem(input: unknown) {
  try {
    const session = await getSession();
    requireRole(session, ["admin", "doctor"]);

    const parsed = addPrescriptionItemSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false as const,
        error: parsed.error.issues[0]?.message ?? "Invalid input.",
      };
    }

    const { clinicId } = session.user;
    const data = parsed.data;
    const now = new Date();

    const [appt] = await db
      .select({
        id: appointments.id,
        patientId: appointments.patientId,
        doctorId: appointments.doctorId,
        isActive: appointments.isActive,
      })
      .from(appointments)
      .where(
        and(eq(appointments.id, data.appointmentId), eq(appointments.clinicId, clinicId))
      )
      .limit(1);

    if (!appt) {
      return { success: false as const, error: "Appointment not found." };
    }
    if (!appt.isActive) {
      return { success: false as const, error: "Cannot add to a cancelled appointment." };
    }

    const [med] = await db
      .select({ id: medicines.id })
      .from(medicines)
      .where(
        and(
          eq(medicines.id, data.medicineId),
          eq(medicines.clinicId, clinicId),
          eq(medicines.isActive, true)
        )
      )
      .limit(1);

    if (!med) {
      return { success: false as const, error: "Medicine not found or inactive." };
    }

    const result = await db.transaction(async (tx) => {
      let [rx] = await tx
        .select()
        .from(prescriptions)
        .where(
          and(
            eq(prescriptions.clinicId, clinicId),
            eq(prescriptions.appointmentId, data.appointmentId)
          )
        )
        .limit(1);

      if (rx && rx.publishedAt !== null) {
        throw new Error("PUBLISHED");
      }

      if (!rx) {
        const chartId = await generatePrescriptionChartId(tx, clinicId);
        const [inserted] = await tx
          .insert(prescriptions)
          .values({
            clinicId,
            appointmentId: data.appointmentId,
            patientId: appt.patientId,
            doctorId: appt.doctorId,
            chartId,
            notes: null,
            publishedAt: null,
            isActive: true,
            createdBy: session.user.id,
            createdAt: now,
            updatedAt: now,
          })
          .returning();
        rx = inserted!;
      }

      if (!rx.isActive) {
        throw new Error("INACTIVE_RX");
      }

      const [activeDup] = await tx
        .select({ id: prescriptionItems.id })
        .from(prescriptionItems)
        .where(
          and(
            eq(prescriptionItems.prescriptionId, rx.id),
            eq(prescriptionItems.medicineId, data.medicineId),
            eq(prescriptionItems.isActive, true)
          )
        )
        .limit(1);

      if (activeDup) {
        throw new Error("DUPLICATE_MEDICINE");
      }

      const [inactiveDup] = await tx
        .select()
        .from(prescriptionItems)
        .where(
          and(
            eq(prescriptionItems.prescriptionId, rx.id),
            eq(prescriptionItems.medicineId, data.medicineId),
            eq(prescriptionItems.isActive, false)
          )
        )
        .limit(1);

      const [maxRow] = await tx
        .select({ m: max(prescriptionItems.sortOrder) })
        .from(prescriptionItems)
        .where(
          and(
            eq(prescriptionItems.prescriptionId, rx.id),
            eq(prescriptionItems.isActive, true)
          )
        );

      const nextSort = (maxRow?.m != null ? Number(maxRow.m) : -1) + 1;

      if (inactiveDup) {
        await tx
          .update(prescriptionItems)
          .set({
            isActive: true,
            medicineName: null,
            morningEnabled: data.morningEnabled,
            morningQuantity: data.morningQuantity,
            morningTiming: data.morningTiming,
            afternoonEnabled: data.afternoonEnabled,
            afternoonQuantity: data.afternoonQuantity,
            afternoonTiming: data.afternoonTiming,
            nightEnabled: data.nightEnabled,
            nightQuantity: data.nightQuantity,
            nightTiming: data.nightTiming,
            duration: data.duration ?? null,
            remarks: data.remarks ?? null,
            sortOrder: nextSort,
            updatedAt: now,
          })
          .where(eq(prescriptionItems.id, inactiveDup.id));

        await tx
          .update(prescriptions)
          .set({ updatedAt: now })
          .where(eq(prescriptions.id, rx.id));
      } else {
        await tx.insert(prescriptionItems).values({
          prescriptionId: rx.id,
          medicineId: data.medicineId,
          medicineName: null,
          morningEnabled: data.morningEnabled,
          morningQuantity: data.morningQuantity,
          morningTiming: data.morningTiming,
          afternoonEnabled: data.afternoonEnabled,
          afternoonQuantity: data.afternoonQuantity,
          afternoonTiming: data.afternoonTiming,
          nightEnabled: data.nightEnabled,
          nightQuantity: data.nightQuantity,
          nightTiming: data.nightTiming,
          duration: data.duration ?? null,
          remarks: data.remarks ?? null,
          isActive: true,
          sortOrder: nextSort,
          createdAt: now,
          updatedAt: now,
        });

        await tx
          .update(prescriptions)
          .set({ updatedAt: now })
          .where(eq(prescriptions.id, rx.id));
      }

      const [updatedRx] = await tx
        .select()
        .from(prescriptions)
        .where(eq(prescriptions.id, rx.id))
        .limit(1);

      return updatedRx!;
    });

    const payload = await buildPrescriptionPayload(clinicId, result);
    revalidatePrescriptionPaths(payload.appointmentId, payload.patientId);
    return { success: true as const, data: payload };
  } catch (err) {
    if (err instanceof ForbiddenError) return { success: false as const, error: "FORBIDDEN" };
    if (err instanceof Error) {
      if (err.message === "PUBLISHED") {
        return { success: false as const, error: "This prescription is published and cannot be edited." };
      }
      if (err.message === "INACTIVE_RX") {
        return { success: false as const, error: "This prescription is inactive." };
      }
      if (err.message === "DUPLICATE_MEDICINE") {
        return { success: false as const, error: "This medicine is already on the prescription." };
      }
    }
    console.error("[addPrescriptionItem]", err);
    return { success: false as const, error: "Failed to add prescription item." };
  }
}

// ─── updatePrescriptionItem ────────────────────────────────────────────────────

export async function updatePrescriptionItem(input: unknown) {
  try {
    const session = await getSession();
    requireRole(session, ["admin", "doctor"]);

    const parsed = updatePrescriptionItemSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false as const,
        error: parsed.error.issues[0]?.message ?? "Invalid input.",
      };
    }

    const { clinicId } = session.user;
    const data = parsed.data;
    const now = new Date();

    const [row] = await db
      .select({ item: prescriptionItems, rx: prescriptions })
      .from(prescriptionItems)
      .innerJoin(prescriptions, eq(prescriptionItems.prescriptionId, prescriptions.id))
      .where(
        and(
          eq(prescriptionItems.id, data.id),
          eq(prescriptions.clinicId, clinicId)
        )
      )
      .limit(1);

    if (!row || !row.item.isActive) {
      return { success: false as const, error: "Item not found." };
    }

    if (row.rx.publishedAt !== null) {
      return { success: false as const, error: "This prescription is published and cannot be edited." };
    }
    if (!row.rx.isActive) {
      return { success: false as const, error: "This prescription is inactive." };
    }

    if (data.medicineId !== undefined && data.medicineId !== row.item.medicineId) {
      const [med] = await db
        .select({ id: medicines.id })
        .from(medicines)
        .where(
          and(
            eq(medicines.id, data.medicineId),
            eq(medicines.clinicId, clinicId),
            eq(medicines.isActive, true)
          )
        )
        .limit(1);

      if (!med) {
        return { success: false as const, error: "Medicine not found or inactive." };
      }

      const [other] = await db
        .select({ id: prescriptionItems.id })
        .from(prescriptionItems)
        .where(
          and(
            eq(prescriptionItems.prescriptionId, row.rx.id),
            eq(prescriptionItems.medicineId, data.medicineId),
            ne(prescriptionItems.id, data.id)
          )
        )
        .limit(1);

      if (other) {
        return {
          success: false as const,
          error:
            "This medicine is already listed on the prescription (including removed lines). Remove the other line or add from the catalog.",
        };
      }
    }

    const set: Partial<typeof prescriptionItems.$inferInsert> = { updatedAt: now };
    if (data.medicineId !== undefined) set.medicineId = data.medicineId;
    if (data.morningEnabled !== undefined) set.morningEnabled = data.morningEnabled;
    if (data.morningQuantity !== undefined) set.morningQuantity = data.morningQuantity;
    if (data.morningTiming !== undefined) set.morningTiming = data.morningTiming;
    if (data.afternoonEnabled !== undefined) set.afternoonEnabled = data.afternoonEnabled;
    if (data.afternoonQuantity !== undefined) set.afternoonQuantity = data.afternoonQuantity;
    if (data.afternoonTiming !== undefined) set.afternoonTiming = data.afternoonTiming;
    if (data.nightEnabled !== undefined) set.nightEnabled = data.nightEnabled;
    if (data.nightQuantity !== undefined) set.nightQuantity = data.nightQuantity;
    if (data.nightTiming !== undefined) set.nightTiming = data.nightTiming;
    if (data.duration !== undefined) set.duration = data.duration;
    if (data.remarks !== undefined) set.remarks = data.remarks;

    const keys = Object.keys(set).filter((k) => k !== "updatedAt");
    if (keys.length === 0) {
      const payload = await buildPrescriptionPayload(clinicId, row.rx);
      return { success: true as const, data: payload };
    }

    if (data.medicineId !== undefined && data.medicineId !== row.item.medicineId) {
      set.medicineName = null;
    }

    await db
      .update(prescriptionItems)
      .set(set)
      .where(eq(prescriptionItems.id, data.id));

    await db
      .update(prescriptions)
      .set({ updatedAt: now })
      .where(eq(prescriptions.id, row.rx.id));

    const [fresh] = await db
      .select()
      .from(prescriptions)
      .where(eq(prescriptions.id, row.rx.id))
      .limit(1);

    const payload = await buildPrescriptionPayload(clinicId, fresh!);
    revalidatePrescriptionPaths(payload.appointmentId, payload.patientId);
    return { success: true as const, data: payload };
  } catch (err) {
    if (err instanceof ForbiddenError) return { success: false as const, error: "FORBIDDEN" };
    console.error("[updatePrescriptionItem]", err);
    return { success: false as const, error: "Failed to update prescription item." };
  }
}

// ─── reorderPrescriptionItems ───────────────────────────────────────────────────

export async function reorderPrescriptionItems(input: unknown) {
  try {
    const session = await getSession();
    requireRole(session, ["admin", "doctor"]);

    const parsed = reorderPrescriptionItemsSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false as const,
        error: parsed.error.issues[0]?.message ?? "Invalid input.",
      };
    }

    const { clinicId } = session.user;
    const { prescriptionId, items } = parsed.data;
    const now = new Date();

    const [rx] = await db
      .select()
      .from(prescriptions)
      .where(and(eq(prescriptions.id, prescriptionId), eq(prescriptions.clinicId, clinicId)))
      .limit(1);

    if (!rx) {
      return { success: false as const, error: "Prescription not found." };
    }
    if (rx.publishedAt !== null) {
      return { success: false as const, error: "This prescription is published and cannot be edited." };
    }
    if (!rx.isActive) {
      return { success: false as const, error: "This prescription is inactive." };
    }

    const ids = items.map((i) => i.id);
    const existing = await db
      .select({ id: prescriptionItems.id })
      .from(prescriptionItems)
      .where(
        and(
          inArray(prescriptionItems.id, ids),
          eq(prescriptionItems.prescriptionId, prescriptionId),
          eq(prescriptionItems.isActive, true)
        )
      );

    if (existing.length !== ids.length) {
      return { success: false as const, error: "One or more items are invalid for this prescription." };
    }

    await db.transaction(async (tx) => {
      for (const { id, sortOrder } of items) {
        await tx
          .update(prescriptionItems)
          .set({ sortOrder, updatedAt: now })
          .where(
            and(
              eq(prescriptionItems.id, id),
              eq(prescriptionItems.prescriptionId, prescriptionId),
              eq(prescriptionItems.isActive, true)
            )
          );
      }
      await tx
        .update(prescriptions)
        .set({ updatedAt: now })
        .where(eq(prescriptions.id, prescriptionId));
    });

    const [fresh] = await db
      .select()
      .from(prescriptions)
      .where(eq(prescriptions.id, prescriptionId))
      .limit(1);

    const payload = await buildPrescriptionPayload(clinicId, fresh!);
    revalidatePrescriptionPaths(payload.appointmentId, payload.patientId);
    return { success: true as const, data: payload };
  } catch (err) {
    if (err instanceof ForbiddenError) return { success: false as const, error: "FORBIDDEN" };
    console.error("[reorderPrescriptionItems]", err);
    return { success: false as const, error: "Failed to reorder items." };
  }
}

// ─── removePrescriptionItem ─────────────────────────────────────────────────────

export async function removePrescriptionItem(input: unknown) {
  try {
    const session = await getSession();
    requireRole(session, ["admin", "doctor"]);

    const parsed = removePrescriptionItemSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false as const,
        error: parsed.error.issues[0]?.message ?? "Invalid input.",
      };
    }

    const { clinicId } = session.user;
    const now = new Date();

    const [row] = await db
      .select({ item: prescriptionItems, rx: prescriptions })
      .from(prescriptionItems)
      .innerJoin(prescriptions, eq(prescriptionItems.prescriptionId, prescriptions.id))
      .where(
        and(
          eq(prescriptionItems.id, parsed.data.id),
          eq(prescriptions.clinicId, clinicId)
        )
      )
      .limit(1);

    if (!row || !row.item.isActive) {
      return { success: false as const, error: "Item not found." };
    }
    if (row.rx.publishedAt !== null) {
      return { success: false as const, error: "This prescription is published and cannot be edited." };
    }

    await db
      .update(prescriptionItems)
      .set({ isActive: false, updatedAt: now })
      .where(eq(prescriptionItems.id, parsed.data.id));

    await db
      .update(prescriptions)
      .set({ updatedAt: now })
      .where(eq(prescriptions.id, row.rx.id));

    const [fresh] = await db
      .select()
      .from(prescriptions)
      .where(eq(prescriptions.id, row.rx.id))
      .limit(1);

    const payload = await buildPrescriptionPayload(clinicId, fresh!);
    revalidatePrescriptionPaths(payload.appointmentId, payload.patientId);
    return { success: true as const, data: payload };
  } catch (err) {
    if (err instanceof ForbiddenError) return { success: false as const, error: "FORBIDDEN" };
    console.error("[removePrescriptionItem]", err);
    return { success: false as const, error: "Failed to remove item." };
  }
}

// ─── clearPrescriptionItems ─────────────────────────────────────────────────────

export async function clearPrescriptionItems(input: unknown) {
  try {
    const session = await getSession();
    requireRole(session, ["admin", "doctor"]);

    const parsed = clearPrescriptionItemsSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false as const,
        error: parsed.error.issues[0]?.message ?? "Invalid input.",
      };
    }

    const { clinicId } = session.user;
    const now = new Date();

    const [rx] = await db
      .select()
      .from(prescriptions)
      .where(
        and(
          eq(prescriptions.id, parsed.data.prescriptionId),
          eq(prescriptions.clinicId, clinicId)
        )
      )
      .limit(1);

    if (!rx) {
      return { success: false as const, error: "Prescription not found." };
    }
    if (rx.publishedAt !== null) {
      return { success: false as const, error: "This prescription is published and cannot be edited." };
    }

    await db
      .update(prescriptionItems)
      .set({ isActive: false, updatedAt: now })
      .where(
        and(
          eq(prescriptionItems.prescriptionId, rx.id),
          eq(prescriptionItems.isActive, true)
        )
      );

    await db
      .update(prescriptions)
      .set({ updatedAt: now })
      .where(eq(prescriptions.id, rx.id));

    const [fresh] = await db
      .select()
      .from(prescriptions)
      .where(eq(prescriptions.id, rx.id))
      .limit(1);

    const payload = await buildPrescriptionPayload(clinicId, fresh!);
    revalidatePrescriptionPaths(payload.appointmentId, payload.patientId);
    return { success: true as const, data: payload };
  } catch (err) {
    if (err instanceof ForbiddenError) return { success: false as const, error: "FORBIDDEN" };
    console.error("[clearPrescriptionItems]", err);
    return { success: false as const, error: "Failed to clear medicines." };
  }
}

// ─── updatePrescriptionNotes ─────────────────────────────────────────────────────

export async function updatePrescriptionNotes(input: unknown) {
  try {
    const session = await getSession();
    requireRole(session, ["admin", "doctor"]);

    const parsed = updatePrescriptionNotesSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false as const,
        error: parsed.error.issues[0]?.message ?? "Invalid input.",
      };
    }

    const { clinicId } = session.user;
    const { prescriptionId, notes } = parsed.data;
    const now = new Date();

    const [rx] = await db
      .select()
      .from(prescriptions)
      .where(and(eq(prescriptions.id, prescriptionId), eq(prescriptions.clinicId, clinicId)))
      .limit(1);

    if (!rx) {
      return { success: false as const, error: "Prescription not found." };
    }
    if (rx.publishedAt !== null) {
      return { success: false as const, error: "This prescription is published and cannot be edited." };
    }

    await db
      .update(prescriptions)
      .set({ notes, updatedAt: now })
      .where(eq(prescriptions.id, prescriptionId));

    const [fresh] = await db
      .select()
      .from(prescriptions)
      .where(eq(prescriptions.id, prescriptionId))
      .limit(1);

    const payload = await buildPrescriptionPayload(clinicId, fresh!);
    revalidatePrescriptionPaths(payload.appointmentId, payload.patientId);
    return { success: true as const, data: payload };
  } catch (err) {
    if (err instanceof ForbiddenError) return { success: false as const, error: "FORBIDDEN" };
    console.error("[updatePrescriptionNotes]", err);
    return { success: false as const, error: "Failed to update notes." };
  }
}

// ─── publishPrescription ───────────────────────────────────────────────────────

export async function publishPrescription(input: unknown) {
  try {
    const session = await getSession();
    requireRole(session, ["admin", "doctor"]);

    const parsed = publishPrescriptionSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false as const,
        error: parsed.error.issues[0]?.message ?? "Invalid input.",
      };
    }

    const { clinicId } = session.user;
    const { prescriptionId } = parsed.data;
    const now = new Date();

    const published = await db.transaction(async (tx) => {
      const [rx] = await tx
        .select()
        .from(prescriptions)
        .where(and(eq(prescriptions.id, prescriptionId), eq(prescriptions.clinicId, clinicId)))
        .limit(1);

      if (!rx) {
        throw new Error("NOT_FOUND");
      }
      if (rx.publishedAt !== null) {
        throw new Error("ALREADY_PUBLISHED");
      }
      if (!rx.isActive) {
        throw new Error("INACTIVE_RX");
      }

      const activeItems = await tx
        .select({
          item: prescriptionItems,
          medName: medicines.name,
        })
        .from(prescriptionItems)
        .innerJoin(medicines, eq(prescriptionItems.medicineId, medicines.id))
        .where(
          and(
            eq(prescriptionItems.prescriptionId, prescriptionId),
            eq(prescriptionItems.isActive, true),
            eq(medicines.clinicId, clinicId)
          )
        );

      if (activeItems.length === 0) {
        throw new Error("NO_ITEMS");
      }

      for (const { item, medName } of activeItems) {
        const name = medName?.trim() || "Unknown medicine";
        await tx
          .update(prescriptionItems)
          .set({ medicineName: name, updatedAt: now })
          .where(eq(prescriptionItems.id, item.id));
      }

      const distinctMedicineIds = [...new Set(activeItems.map((r) => r.item.medicineId))];
      for (const mid of distinctMedicineIds) {
        await tx
          .update(medicines)
          .set({ lastPrescribedDate: now, updatedAt: now })
          .where(and(eq(medicines.id, mid), eq(medicines.clinicId, clinicId)));
      }

      await tx
        .update(prescriptions)
        .set({ publishedAt: now, updatedAt: now })
        .where(eq(prescriptions.id, prescriptionId));

      const [fresh] = await tx
        .select()
        .from(prescriptions)
        .where(eq(prescriptions.id, prescriptionId))
        .limit(1);

      return fresh!;
    });

    const payload = await buildPrescriptionPayload(clinicId, published);
    revalidatePrescriptionPaths(payload.appointmentId, payload.patientId);
    return { success: true as const, data: payload };
  } catch (err) {
    if (err instanceof ForbiddenError) return { success: false as const, error: "FORBIDDEN" };
    if (err instanceof Error) {
      if (err.message === "NOT_FOUND") {
        return { success: false as const, error: "Prescription not found." };
      }
      if (err.message === "ALREADY_PUBLISHED") {
        return { success: false as const, error: "This prescription is already published." };
      }
      if (err.message === "INACTIVE_RX") {
        return { success: false as const, error: "This prescription is inactive." };
      }
      if (err.message === "NO_ITEMS") {
        return {
          success: false as const,
          error: "Add at least one medicine before publishing.",
        };
      }
    }
    console.error("[publishPrescription]", err);
    return { success: false as const, error: "Failed to publish prescription." };
  }
}

// ─── getPrescriptionByAppointment ────────────────────────────────────────────────

export async function getPrescriptionByAppointment(input: unknown) {
  try {
    const session = await getSession();
    requireRole(session, ["admin", "doctor"]);

    const parsed = appointmentIdParamSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false as const,
        error: parsed.error.issues[0]?.message ?? "Invalid input.",
      };
    }

    const { clinicId } = session.user;
    const { appointmentId } = parsed.data;

    const [rx] = await db
      .select()
      .from(prescriptions)
      .where(
        and(
          eq(prescriptions.appointmentId, appointmentId),
          eq(prescriptions.clinicId, clinicId),
          eq(prescriptions.isActive, true)
        )
      )
      .limit(1);

    if (!rx) {
      return { success: true as const, data: null };
    }

    const payload = await buildPrescriptionPayload(clinicId, rx);
    return { success: true as const, data: payload };
  } catch (err) {
    if (err instanceof ForbiddenError) return { success: false as const, error: "FORBIDDEN" };
    console.error("[getPrescriptionByAppointment]", err);
    return { success: false as const, error: "Failed to load prescription." };
  }
}

// ─── getPrescriptionsByPatient ───────────────────────────────────────────────────

export type PatientPrescriptionSummary = {
  id: string;
  chartId: number;
  appointmentId: string;
  scheduledAt: Date;
  doctorName: string;
  activeItemCount: number;
  publishedAt: Date | null;
  /** Full active items in JSON-safe shape for the inline accordion view. */
  items: PrescriptionItemForAppointmentTab[];
};

export async function getPrescriptionsByPatient(input: unknown) {
  try {
    const session = await getSession();
    requireRole(session, ["admin", "doctor"]);

    const parsed = patientIdParamSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false as const,
        error: parsed.error.issues[0]?.message ?? "Invalid input.",
      };
    }

    const { clinicId } = session.user;
    const { patientId } = parsed.data;

    const list = await db
      .select({
        rx: prescriptions,
        scheduledAt: appointments.scheduledAt,
        docFirst: users.firstName,
        docLast: users.lastName,
      })
      .from(prescriptions)
      .innerJoin(appointments, eq(prescriptions.appointmentId, appointments.id))
      .innerJoin(users, eq(prescriptions.doctorId, users.id))
      .where(
        and(
          eq(prescriptions.clinicId, clinicId),
          eq(prescriptions.patientId, patientId),
          eq(prescriptions.isActive, true),
          isNotNull(prescriptions.publishedAt)
        )
      )
      .orderBy(desc(appointments.scheduledAt));

    if (list.length === 0) {
      return { success: true as const, data: [] as PatientPrescriptionSummary[] };
    }

    const ids = list.map((r) => r.rx.id);
    const countRows = await db
      .select({
        prescriptionId: prescriptionItems.prescriptionId,
        n: count(prescriptionItems.id).as("n"),
      })
      .from(prescriptionItems)
      .where(
        and(
          inArray(prescriptionItems.prescriptionId, ids),
          eq(prescriptionItems.isActive, true)
        )
      )
      .groupBy(prescriptionItems.prescriptionId);

    const countMap = new Map(countRows.map((c) => [c.prescriptionId, Number(c.n)]));

    // Fetch full items for the inline document view (patient accordion)
    const itemRows = await db
      .select({ item: prescriptionItems, catalogName: medicines.name })
      .from(prescriptionItems)
      .innerJoin(medicines, eq(prescriptionItems.medicineId, medicines.id))
      .where(
        and(
          inArray(prescriptionItems.prescriptionId, ids),
          eq(prescriptionItems.isActive, true)
        )
      )
      .orderBy(asc(prescriptionItems.sortOrder));

    const itemsMap = new Map<string, PrescriptionItemForAppointmentTab[]>();
    for (const r of itemRows) {
      const pid = r.item.prescriptionId;
      if (!itemsMap.has(pid)) itemsMap.set(pid, []);
      const raw = mapItemRow(r.item, r.catalogName);
      itemsMap.get(pid)!.push({
        ...raw,
        createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : String(raw.createdAt),
        updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt.toISOString() : String(raw.updatedAt),
      });
    }

    const data: PatientPrescriptionSummary[] = list.map((r) => ({
      id: r.rx.id,
      chartId: r.rx.chartId,
      appointmentId: r.rx.appointmentId,
      scheduledAt: r.scheduledAt,
      doctorName: doctorDisplayName(r.docFirst, r.docLast),
      activeItemCount: countMap.get(r.rx.id) ?? 0,
      publishedAt: r.rx.publishedAt,
      items: itemsMap.get(r.rx.id) ?? [],
    }));

    return { success: true as const, data };
  } catch (err) {
    if (err instanceof ForbiddenError) return { success: false as const, error: "FORBIDDEN" };
    console.error("[getPrescriptionsByPatient]", err);
    return { success: false as const, error: "Failed to load prescriptions." };
  }
}
