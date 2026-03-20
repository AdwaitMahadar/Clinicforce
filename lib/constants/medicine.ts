/**
 * Shared medicine category/form lists (no Zod) — `medicines.category` / `form` are
 * varchar in DB; these lists drive Zod and form dropdowns.
 */

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

export type MedicineCategory = (typeof MEDICINE_CATEGORIES)[number];
export type MedicineForm = (typeof MEDICINE_FORMS)[number];
