/**
 * Zod schemas for prescription server actions (add/update/reorder/clear/notes/publish).
 * Enum literals come from `lib/constants/prescription.ts` — never duplicate them here.
 */

import { z } from "zod";
import { MEAL_TIMINGS } from "@/lib/constants/prescription";

export { MEAL_TIMINGS };
export type { MealTiming } from "@/lib/constants/prescription";

const mealTimingSchema = z.enum(MEAL_TIMINGS, {
  error: "Select a valid meal timing",
});

const slotQuantitySchema = z
  .number()
  .int("Quantity must be a whole number")
  .min(1, "Quantity must be at least 1")
  .max(10, "Quantity cannot exceed 10");

/** Dosage slots + optional text fields shared by add and partial update. */
const prescriptionItemDosageFieldsSchema = z.object({
  morningEnabled: z.boolean().default(false),
  morningQuantity: slotQuantitySchema.default(1),
  morningTiming: mealTimingSchema.default("before_food"),
  afternoonEnabled: z.boolean().default(false),
  afternoonQuantity: slotQuantitySchema.default(1),
  afternoonTiming: mealTimingSchema.default("before_food"),
  nightEnabled: z.boolean().default(false),
  nightQuantity: slotQuantitySchema.default(1),
  nightTiming: mealTimingSchema.default("before_food"),
  duration: z.string().max(255).optional().nullable(),
  remarks: z.string().optional().nullable(),
});

export const addPrescriptionItemSchema = z
  .object({
    appointmentId: z.string().uuid("Invalid appointment"),
    medicineId: z.string().uuid("Invalid medicine"),
  })
  .merge(prescriptionItemDosageFieldsSchema);

export type AddPrescriptionItemInput = z.infer<typeof addPrescriptionItemSchema>;

const prescriptionItemUpdateFieldsSchema = z.object({
  /** Re-selectable while the Rx is still a draft; `medicine_name` is set server-side at publish only. */
  medicineId: z.string().uuid("Invalid medicine").optional(),
  morningEnabled: z.boolean().optional(),
  morningQuantity: slotQuantitySchema.optional(),
  morningTiming: mealTimingSchema.optional(),
  afternoonEnabled: z.boolean().optional(),
  afternoonQuantity: slotQuantitySchema.optional(),
  afternoonTiming: mealTimingSchema.optional(),
  nightEnabled: z.boolean().optional(),
  nightQuantity: slotQuantitySchema.optional(),
  nightTiming: mealTimingSchema.optional(),
  duration: z.union([z.string().max(255), z.null()]).optional(),
  remarks: z.union([z.string(), z.null()]).optional(),
});

export const updatePrescriptionItemSchema = z
  .object({
    id: z.string().uuid("Invalid item"),
  })
  .merge(prescriptionItemUpdateFieldsSchema);

export type UpdatePrescriptionItemInput = z.infer<typeof updatePrescriptionItemSchema>;

export const reorderPrescriptionItemsSchema = z.object({
  prescriptionId: z.string().uuid("Invalid prescription"),
  items: z
    .array(
      z.object({
        id: z.string().uuid("Invalid item"),
        sortOrder: z.number().int("Sort order must be a whole number"),
      })
    )
    .min(1, "At least one item is required"),
});

export type ReorderPrescriptionItemsInput = z.infer<typeof reorderPrescriptionItemsSchema>;

export const removePrescriptionItemSchema = z.object({
  id: z.string().uuid("Invalid item"),
});

export type RemovePrescriptionItemInput = z.infer<typeof removePrescriptionItemSchema>;

export const clearPrescriptionItemsSchema = z.object({
  prescriptionId: z.string().uuid("Invalid prescription"),
});

export type ClearPrescriptionItemsInput = z.infer<typeof clearPrescriptionItemsSchema>;

/** `null` or blank string clears `prescriptions.notes` in the action layer. */
export const updatePrescriptionNotesSchema = z.object({
  prescriptionId: z.string().uuid("Invalid prescription"),
  notes: z.union([z.string(), z.null()]).transform((v) => {
    if (v === null) return null;
    const t = v.trim();
    return t === "" ? null : t;
  }),
});

export type UpdatePrescriptionNotesInput = z.infer<typeof updatePrescriptionNotesSchema>;

export const publishPrescriptionSchema = z.object({
  prescriptionId: z.string().uuid("Invalid prescription"),
});

export type PublishPrescriptionInput = z.infer<typeof publishPrescriptionSchema>;
