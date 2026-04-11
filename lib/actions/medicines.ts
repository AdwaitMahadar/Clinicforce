"use server";

/**
 * lib/actions/medicines.ts
 *
 * Server actions for the medicines entity.
 * Anatomy of every action: getSession → requireRole → safeParse → DB.
 * Always return { success: true, data } or { success: false, error }.
 * Never throw.
 *
 * RBAC (docs/08-Business-Rules.md §6):
 *   All medicines actions: admin + doctor only (staff has no access)
 */

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { requireRole, ForbiddenError } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { medicines } from "@/lib/db/schema";
import {
  getMedicines as queryGetMedicines,
  getMedicineById,
} from "@/lib/db/queries/medicines";
import {
  createMedicineSchema,
  updateMedicineSchema,
} from "@/lib/validators/medicine";
import { idSchema, n } from "@/lib/validators/common";

// ─── Input schemas for list/filter params ─────────────────────────────────────
// These are query-parameter shapes, not entity schemas — defined here because
// they have no counterpart in the UI form validators.

const getMedicinesInputSchema = z.object({
  search:    z.string().optional(),
  category:  z.string().optional(),
  form:      z.string().optional(),
  isActive:  z.boolean().optional(),
  page:      z.number().int().min(1).default(1),
  pageSize:  z.number().int().min(1).max(100).default(10),
  sortBy:    z.enum(["name", "lastPrescribedDate"]).optional().default("name"),
  sortDir:   z.enum(["asc", "desc"]).optional().default("asc"),
});

// ─── getMedicines ─────────────────────────────────────────────────────────────

export async function getMedicines(input: unknown) {
  try {
    const session = await getSession();
    requireRole(session, ["admin", "doctor"]);

    const parsed = getMedicinesInputSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: "Invalid filter parameters." };
    }

    const { clinicId } = session.user;
    const result = await queryGetMedicines(clinicId, parsed.data);
    return { success: true as const, data: result };
  } catch (err) {
    if (err instanceof ForbiddenError) return { success: false as const, error: "FORBIDDEN" };
    console.error("[getMedicines]", err);
    return { success: false as const, error: "Failed to fetch medicines." };
  }
}

// ─── getMedicineDetail ────────────────────────────────────────────────────────

export async function getMedicineDetail(id: unknown) {
  try {
    const session = await getSession();
    requireRole(session, ["admin", "doctor"]);

    const parsed = idSchema.safeParse(id);
    if (!parsed.success) {
      return { success: false as const, error: "Invalid medicine ID." };
    }

    const { clinicId } = session.user;
    const medicine = await getMedicineById(clinicId, parsed.data);

    if (!medicine) {
      return { success: false as const, error: "Medicine not found." };
    }

    return {
      success: true as const,
      data: {
        ...medicine,
        // TODO: Implement when audit_log table is built.
        activityLog: [] as never[],
      },
    };
  } catch (err) {
    if (err instanceof ForbiddenError) return { success: false as const, error: "FORBIDDEN" };
    console.error("[getMedicineDetail]", err);
    return { success: false as const, error: "Failed to fetch medicine." };
  }
}

// ─── createMedicine ───────────────────────────────────────────────────────────

export async function createMedicine(input: unknown) {
  try {
    const session = await getSession();
    requireRole(session, ["admin", "doctor"]);

    const parsed = createMedicineSchema.safeParse(input);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid input.";
      return { success: false as const, error: message };
    }

    const { clinicId, id: userId } = session.user;
    const { name, category, brand, form, lastPrescribedDate, description } =
      parsed.data;

    const [created] = await db
      .insert(medicines)
      .values({
        clinicId,
        name: name.trim(),
        category: n(category),
        brand: n(brand),
        form: n(form),
        description: n(description),
        lastPrescribedDate: lastPrescribedDate
          ? new Date(lastPrescribedDate)
          : null,
        isActive: true,
        createdBy: userId,
      })
      .returning({ id: medicines.id });

    revalidatePath("/medicines/dashboard");
    return { success: true as const, data: { id: created.id } };
  } catch (err) {
    if (err instanceof ForbiddenError) return { success: false as const, error: "FORBIDDEN" };
    console.error("[createMedicine]", err);
    return { success: false as const, error: "Failed to create medicine." };
  }
}

// ─── updateMedicine ───────────────────────────────────────────────────────────

export async function updateMedicine(input: unknown) {
  try {
    const session = await getSession();
    requireRole(session, ["admin", "doctor"]);

    const parsed = updateMedicineSchema.safeParse(input);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid input.";
      return { success: false as const, error: message };
    }

    const { clinicId } = session.user;
    const {
      id,
      name,
      category,
      brand,
      form,
      lastPrescribedDate,
      description,
      isActive,
    } = parsed.data;

    // Verify ownership before update
    const existing = await getMedicineById(clinicId, id);
    if (!existing) {
      return { success: false as const, error: "Medicine not found." };
    }

    await db
      .update(medicines)
      .set({
        ...(name !== undefined         && { name: name.trim() }),
        ...(category !== undefined     && { category: n(category) }),
        ...(brand !== undefined        && { brand: n(brand) }),
        ...(form !== undefined         && { form: n(form) }),
        ...(description !== undefined  && { description: n(description) }),
        ...(lastPrescribedDate !== undefined && {
          lastPrescribedDate: lastPrescribedDate
            ? new Date(lastPrescribedDate)
            : null,
        }),
        ...(isActive === true && { isActive: true }),
        updatedAt: new Date(),
      })
      .where(
        and(eq(medicines.clinicId, clinicId), eq(medicines.id, id))
      );

    revalidatePath("/medicines/dashboard");
    return { success: true as const, data: { id } };
  } catch (err) {
    if (err instanceof ForbiddenError) return { success: false as const, error: "FORBIDDEN" };
    console.error("[updateMedicine]", err);
    return { success: false as const, error: "Failed to update medicine." };
  }
}

// ─── deactivateMedicine ───────────────────────────────────────────────────────

export async function deactivateMedicine(id: unknown) {
  try {
    const session = await getSession();
    requireRole(session, ["admin", "doctor"]);

    const parsed = idSchema.safeParse(id);
    if (!parsed.success) {
      return { success: false as const, error: "Invalid medicine ID." };
    }

    const { clinicId } = session.user;

    const existing = await getMedicineById(clinicId, parsed.data);
    if (!existing) {
      return { success: false as const, error: "Medicine not found." };
    }

    await db
      .update(medicines)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(eq(medicines.clinicId, clinicId), eq(medicines.id, parsed.data))
      );

    revalidatePath("/medicines/dashboard");
    return { success: true as const, data: { id: parsed.data } };
  } catch (err) {
    if (err instanceof ForbiddenError) return { success: false as const, error: "FORBIDDEN" };
    console.error("[deactivateMedicine]", err);
    return { success: false as const, error: "Failed to deactivate medicine." };
  }
}
