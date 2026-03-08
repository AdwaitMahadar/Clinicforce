/**
 * lib/validators/medicine.ts
 *
 * Zod v4 schema for the medicine edit form.
 * Single source of truth for validation — used by:
 *   - <DetailForm> component (client-side React Hook Form)
 *   - Future server actions (Phase 3 — server-side enforcement)
 *
 * Rule: Never define validation inline in a component. Always import from here.
 */

import { z } from "zod";

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

export const medicineSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(255, "Name must be under 255 characters"),

  category: z.enum(MEDICINE_CATEGORIES),

  brand: z
    .string()
    .min(1, "Brand is required")
    .max(255, "Brand must be under 255 characters"),

  form: z.enum(MEDICINE_FORMS),

  lastPrescribedDate: z.string().optional().default(""),

  description: z.string().optional().default(""),
});

/** Inferred TypeScript type — import this instead of defining manually. */
export type MedicineFormValues = z.infer<typeof medicineSchema>;
