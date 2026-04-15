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
import { appendActivityLog } from "@/lib/activity-log";
import { getEntityActivity } from "@/lib/actions/activity-log";

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

    const activityResult = await getEntityActivity({
      entityType: "medicine",
      entityId: parsed.data,
    });
    const activityLogEntries = activityResult.success ? activityResult.data.entries : [];
    const activityLogHasMore = activityResult.success ? activityResult.data.hasMore : false;

    return {
      success: true as const,
      data: {
        ...medicine,
        activityLog: activityLogEntries,
        activityLogHasMore,
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

    const formStr = form?.trim() ? ` (${form.trim()})` : "";
    const entityDescriptor = `${name.trim()}${formStr} added`;

    await appendActivityLog({
      session,
      entityType: "medicine",
      entityId: created.id,
      action: "created",
      metadata: { entityDescriptor },
    });

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

    // Verify ownership — reuse this fetch for old-value diffing (no extra query)
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

    // ── Activity log ───────────────────────────────────────────────────────────
    const isReactivation = isActive === true;
    const effectiveName = (name?.trim() ?? existing.name).trim();
    const effectiveForm = form !== undefined ? n(form) : existing.form;
    const formStr = effectiveForm ? ` (${effectiveForm})` : "";
    const action = isReactivation ? "reactivated" : "updated";
    const entityDescriptor = `${effectiveName}${formStr} ${action}`;

    type ChangedField = { field: string; label: string; oldValue: string; newValue: string };
    const changedFields: ChangedField[] = [];

    if (!isReactivation) {
      const diffs: Array<{
        key: string;
        label: string;
        oldVal: string | null | undefined;
        newVal: string | null | undefined;
        inPayload: boolean;
      }> = [
        { key: "name",               label: "name",               oldVal: existing.name,               newVal: name?.trim(),          inPayload: name !== undefined },
        { key: "category",           label: "category",           oldVal: existing.category,           newVal: n(category),           inPayload: category !== undefined },
        { key: "brand",              label: "brand",              oldVal: existing.brand,              newVal: n(brand),              inPayload: brand !== undefined },
        { key: "form",               label: "form",               oldVal: existing.form,               newVal: n(form),               inPayload: form !== undefined },
        { key: "description",        label: "description",        oldVal: existing.description,        newVal: n(description),        inPayload: description !== undefined },
        {
          key: "lastPrescribedDate",
          label: "last prescribed date",
          oldVal: existing.lastPrescribedDate?.toISOString() ?? "",
          newVal: lastPrescribedDate !== undefined ? (lastPrescribedDate ? new Date(lastPrescribedDate).toISOString() : "") : undefined,
          inPayload: lastPrescribedDate !== undefined,
        },
      ];

      for (const { key, label, oldVal, newVal, inPayload } of diffs) {
        if (!inPayload) continue;
        const oldStr = oldVal ?? "";
        const newStr = newVal ?? "";
        if (oldStr !== newStr) {
          changedFields.push({ field: key, label, oldValue: oldStr, newValue: newStr });
        }
      }
    }

    await appendActivityLog({
      session,
      entityType: "medicine",
      entityId: id,
      action,
      metadata: {
        entityDescriptor,
        ...(changedFields.length > 0 && { changedFields }),
      },
    });

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

    const formStr = existing.form ? ` (${existing.form})` : "";
    await appendActivityLog({
      session,
      entityType: "medicine",
      entityId: parsed.data,
      action: "deactivated",
      metadata: {
        entityDescriptor: `${existing.name}${formStr} deactivated`,
      },
    });

    revalidatePath("/medicines/dashboard");
    return { success: true as const, data: { id: parsed.data } };
  } catch (err) {
    if (err instanceof ForbiddenError) return { success: false as const, error: "FORBIDDEN" };
    console.error("[deactivateMedicine]", err);
    return { success: false as const, error: "Failed to deactivate medicine." };
  }
}
