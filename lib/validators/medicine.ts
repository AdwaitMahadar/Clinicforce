/**
 * lib/validators/medicine.ts
 *
 * Zod schema for the medicine form (create + update).
 * Single source of truth for validation — used by:
 *   - <MedicineDetailPanel> component (client-side React Hook Form)
 *   - Server actions: createMedicine, updateMedicine (Phase 3)
 *
 * Rule: Never define validation inline in a component. Always import from here.
 * Rule: Never include clinicId, createdBy, createdAt, updatedAt, or id in create schemas.
 */

import { z } from "zod";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const MEDICINE_CATEGORIES = [
  "Antibiotics",
  "Painkillers",
  "Diabetes Care",
  "Antihistamines",
  "Vitamins",
  "Cardiovascular",
  "Antifungals",
  "Antivirals",
] as const;

export const MEDICINE_FORMS = [
  "Tablet",
  "Syrup",
  "Capsule",
  "Injection",
  "Cream",
  "Drops",
  "Powder",
] as const;

// ─── Create Schema ────────────────────────────────────────────────────────────
// Used for the New Medicine form. Excludes all system-managed fields.

export const createMedicineSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(255, "Name must be under 255 characters"),

  category: z.enum(MEDICINE_CATEGORIES, {
    error: "Please select a category",
  }),

  brand: z
    .string()
    .min(1, "Brand is required")
    .max(255, "Brand must be under 255 characters"),

  form: z.enum(MEDICINE_FORMS, {
    error: "Please select a form",
  }),

  lastPrescribedDate: z.string().optional().default(""),

  description: z.string().optional().default(""),
});

// ─── Update Schema ────────────────────────────────────────────────────────────
// Used for the Edit Medicine form. All fields optional except id.

export const updateMedicineSchema = z.object({
  id: z.string().uuid("Invalid medicine ID"),

  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(255, "Name must be under 255 characters")
    .optional(),

  category: z
    .enum(MEDICINE_CATEGORIES, {
      error: "Please select a category",
    })
    .optional(),

  brand: z
    .string()
    .min(1, "Brand is required")
    .max(255, "Brand must be under 255 characters")
    .optional(),

  form: z
    .enum(MEDICINE_FORMS, {
      error: "Please select a form",
    })
    .optional(),

  lastPrescribedDate: z.string().optional(),

  description: z.string().optional(),
});

// ─── Inferred TypeScript Types ────────────────────────────────────────────────

/** Import this type for the create medicine form values. */
export type CreateMedicineInput = z.infer<typeof createMedicineSchema>;

/** Import this type for the update medicine form values. */
export type UpdateMedicineInput = z.infer<typeof updateMedicineSchema>;

// ─── Legacy alias (for backward compatibility with existing form usages) ──────
// TODO: Migrate all usages of `medicineSchema` / `MedicineFormValues` to the
// create/update schemas above in Phase 3 when wiring UI to server actions.

/** @deprecated Use createMedicineSchema or updateMedicineSchema instead. */
export const medicineSchema = createMedicineSchema;

/** @deprecated Use CreateMedicineInput or UpdateMedicineInput instead. */
export type MedicineFormValues = CreateMedicineInput;
