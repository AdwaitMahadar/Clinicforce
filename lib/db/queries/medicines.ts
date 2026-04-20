/**
 * lib/db/queries/medicines.ts
 *
 * All DB reads for the medicines entity.
 * Every function receives clinicId as its first argument and always
 * scopes the query with WHERE clinic_id = clinicId.
 *
 * Used by server actions only — never import from client components.
 */

import { and, asc, desc, eq, ilike, notInArray, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { medicines } from "@/lib/db/schema";

// ─── Return Types ─────────────────────────────────────────────────────────────

/**
 * Raw DB row returned by `getMedicines` — dates are Date objects, nullable fields are null.
 * Intentionally distinct from `@/types/medicine` `MedicineRow` which is the UI view-model
 * (lastUsed: string, status: "active"|"inactive", non-null display strings).
 */
export interface DbMedicineRow {
  id: string;
  name: string;
  category: string | null;
  form: string | null;
  brand: string | null;
  lastPrescribedDate: Date | null;
  isActive: boolean;
}

export interface MedicineDetail {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  brand: string | null;
  form: string | null;
  lastPrescribedDate: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
}

// ─── Query Params ─────────────────────────────────────────────────────────────

export interface GetMedicinesParams {
  search?: string;
  category?: string;
  form?: string;
  /** When set, restrict to that activation state; when omitted, include active and inactive rows. */
  isActive?: boolean;
  page: number;
  pageSize: number;
  sortBy?: "name" | "lastPrescribedDate";
  sortDir?: "asc" | "desc";
}

// ─── getMedicines ─────────────────────────────────────────────────────────────

/**
 * Returns a paginated, filtered, sorted list of medicines for a clinic.
 * Always scoped to `clinicId`.
 */
export async function getMedicines(
  clinicId: string,
  params: GetMedicinesParams
): Promise<{ rows: DbMedicineRow[]; total: number }> {
  const {
    search,
    category,
    form,
    isActive,
    page,
    pageSize,
    sortBy = "name",
    sortDir = "asc",
  } = params;

  // Build WHERE filters
  const filters = [eq(medicines.clinicId, clinicId)];
  if (typeof isActive === "boolean") {
    filters.push(eq(medicines.isActive, isActive));
  }

  if (search) {
    filters.push(
      or(
        ilike(medicines.name, `%${search}%`),
        ilike(medicines.brand, `%${search}%`)
      )!
    );
  }

  if (category) {
    filters.push(eq(medicines.category, category));
  }

  if (form) {
    filters.push(eq(medicines.form, form));
  }

  const where = and(...filters);

  // Order
  const orderExpr =
    sortBy === "lastPrescribedDate"
      ? sortDir === "desc"
        ? desc(medicines.lastPrescribedDate)
        : asc(medicines.lastPrescribedDate)
      : sortDir === "desc"
        ? desc(medicines.name)
        : asc(medicines.name);

  // Paginate
  const offset = (page - 1) * pageSize;

  const [rows, countResult] = await Promise.all([
    db
      .select({
        id: medicines.id,
        name: medicines.name,
        category: medicines.category,
        form: medicines.form,
        brand: medicines.brand,
        lastPrescribedDate: medicines.lastPrescribedDate,
        isActive: medicines.isActive,
      })
      .from(medicines)
      .where(where)
      .orderBy(orderExpr)
      .limit(pageSize)
      .offset(offset),

    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(medicines)
      .where(where),
  ]);

  return {
    rows,
    total: countResult[0]?.count ?? 0,
  };
}

// ─── getMedicineById ──────────────────────────────────────────────────────────

/**
 * Returns a single medicine record for a clinic, or null if not found /
 * belongs to a different clinic.
 */
export async function getMedicineById(
  clinicId: string,
  id: string
): Promise<MedicineDetail | null> {
  const rows = await db
    .select({
      id: medicines.id,
      name: medicines.name,
      description: medicines.description,
      category: medicines.category,
      brand: medicines.brand,
      form: medicines.form,
      lastPrescribedDate: medicines.lastPrescribedDate,
      isActive: medicines.isActive,
      createdAt: medicines.createdAt,
      updatedAt: medicines.updatedAt,
      createdBy: medicines.createdBy,
    })
    .from(medicines)
    .where(and(eq(medicines.clinicId, clinicId), eq(medicines.id, id)))
    .limit(1);

  return rows[0] ?? null;
}

/** Max rows returned by `searchActiveMedicinesForPicker` (combobox list + scroll). */
export const MEDICINE_PICKER_SEARCH_LIMIT = 8;

/**
 * Active medicines for async combobox pickers (e.g. prescription draft line items).
 * Search matches **name**, **brand**, or **category** (case-insensitive).
 * Empty `search` returns the first `MEDICINE_PICKER_SEARCH_LIMIT` rows ordered by **name**.
 * Optional `excludeIds` omits medicines already on the prescription from results.
 */
export async function searchActiveMedicinesForPicker(
  clinicId: string,
  search: string,
  excludeIds: string[] = []
): Promise<
  Pick<
    DbMedicineRow,
    "id" | "name" | "category" | "brand" | "form" | "lastPrescribedDate"
  >[]
> {
  const q = search.trim();
  const conditions = [eq(medicines.clinicId, clinicId), eq(medicines.isActive, true)];

  if (excludeIds.length > 0) {
    conditions.push(notInArray(medicines.id, excludeIds));
  }

  if (q.length > 0) {
    conditions.push(
      or(
        ilike(medicines.name, `%${q}%`),
        ilike(medicines.brand, `%${q}%`),
        ilike(medicines.category, `%${q}%`)
      )!
    );
  }

  return db
    .select({
      id: medicines.id,
      name: medicines.name,
      category: medicines.category,
      brand: medicines.brand,
      form: medicines.form,
      lastPrescribedDate: medicines.lastPrescribedDate,
    })
    .from(medicines)
    .where(and(...conditions))
    .orderBy(asc(medicines.name))
    .limit(MEDICINE_PICKER_SEARCH_LIMIT);
}
