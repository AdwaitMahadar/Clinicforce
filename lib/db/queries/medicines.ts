/**
 * lib/db/queries/medicines.ts
 *
 * All DB reads for the medicines entity.
 * Every function receives clinicId as its first argument and always
 * scopes the query with WHERE clinic_id = clinicId.
 *
 * Used by server actions only — never import from client components.
 */

import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { medicines } from "@/lib/db/schema";

// ─── Return Types ─────────────────────────────────────────────────────────────

export interface MedicineRow {
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
): Promise<{ rows: MedicineRow[]; total: number }> {
  const {
    search,
    category,
    form,
    isActive = true,
    page,
    pageSize,
    sortBy = "name",
    sortDir = "asc",
  } = params;

  // Build WHERE filters
  const filters = [
    eq(medicines.clinicId, clinicId),
    eq(medicines.isActive, isActive),
  ];

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
