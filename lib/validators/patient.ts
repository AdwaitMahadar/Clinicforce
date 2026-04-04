/**
 * lib/validators/patient.ts
 *
 * Zod schema for the patient form (create + update).
 * Single source of truth for validation — used by:
 *   - <PatientDetailPanel> component (client-side React Hook Form)
 *   - Server actions: createPatient, updatePatient (`lib/actions/patients.ts`)
 *
 * `age` is UI-only (not persisted). Server resolves `dateOfBirth` from `age` when DOB is empty.
 *
 * Rule: Never define validation inline in a component. Always import from here.
 * Rule: Never include clinicId, createdBy, createdAt, updatedAt, or id in create schemas.
 */

import { z } from "zod";
import { PATIENT_GENDERS, PATIENT_BLOOD_GROUPS } from "@/lib/constants/patient";

// Re-export for call sites that import enums from validators (forms, panels).
export { PATIENT_GENDERS, PATIENT_BLOOD_GROUPS };

/** Coerce RHF empty string / number input into an optional integer age. */
function preprocessAge(val: unknown): number | undefined {
  if (val === "" || val === null || val === undefined) return undefined;
  const n = typeof val === "number" ? val : Number(String(val).trim());
  if (!Number.isFinite(n)) return undefined;
  return Math.trunc(n);
}

const optionalAgeSchema = z.preprocess(
  preprocessAge,
  z.number().int().min(0, "Age must be at least 0").max(130, "Age must be at most 130").optional()
);

function hasDobOrAge(data: { dateOfBirth?: string; age?: number }): boolean {
  const dob = data.dateOfBirth?.trim() ?? "";
  if (dob.length > 0) return true;
  return data.age !== undefined && data.age >= 0;
}

// ─── Create Schema ────────────────────────────────────────────────────────────
// Used for the New Patient form. Excludes all system-managed fields.

export const createPatientSchema = z
  .object({
    firstName: z
      .string()
      .min(1, "First name is required")
      .max(100, "First name must be under 100 characters"),

    lastName: z
      .string()
      .min(1, "Last name is required")
      .max(100, "Last name must be under 100 characters"),

    email: z
      .string()
      .max(255, "Email must be under 255 characters")
      .email("Please enter a valid email address")
      .or(z.literal(""))
      .optional()
      .default(""),

    phone: z
      .string()
      .min(1, "Phone is required")
      .max(20, "Phone must be under 20 characters"),

    dateOfBirth: z.string().optional().default(""),

    /** UI-only — not stored; used when DOB is empty. */
    age: optionalAgeSchema,

    gender: z.enum(PATIENT_GENDERS, {
      error: "Please select a gender",
    }),

    address: z.string().optional().default(""),

    bloodGroup: z
      .enum(PATIENT_BLOOD_GROUPS)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v === "" ? undefined : v))
      .optional(),

    allergies: z.string().optional().default(""),

    emergencyContactName: z
      .string()
      .max(255, "Emergency contact name must be under 255 characters")
      .optional()
      .default(""),

    emergencyContactPhone: z
      .string()
      .max(20, "Emergency contact phone must be under 20 characters")
      .optional()
      .default(""),

    pastHistoryNotes: z.string().optional().default(""),
  })
  .refine(hasDobOrAge, {
    message: "Enter date of birth or age",
    path: ["dateOfBirth"],
  });

// ─── Update Schema ────────────────────────────────────────────────────────────
// Used for the Edit Patient form. `id` is required; other fields match the full form payload.

export const updatePatientSchema = z
  .object({
    id: z.string().uuid("Invalid patient ID"),

    firstName: z
      .string()
      .min(1, "First name is required")
      .max(100, "First name must be under 100 characters"),

    lastName: z
      .string()
      .min(1, "Last name is required")
      .max(100, "Last name must be under 100 characters"),

    email: z
      .string()
      .max(255, "Email must be under 255 characters")
      .email("Please enter a valid email address")
      .or(z.literal(""))
      .optional(),

    phone: z.string().min(1, "Phone is required").max(20, "Phone must be under 20 characters"),

    dateOfBirth: z.string().optional(),

    age: optionalAgeSchema,

    gender: z
      .enum(PATIENT_GENDERS, {
        error: "Please select a gender",
      })
      .optional(),

    address: z.string().optional(),

    bloodGroup: z
      .enum(PATIENT_BLOOD_GROUPS)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v === "" ? undefined : v))
      .optional(),

    allergies: z.string().optional(),

    emergencyContactName: z
      .string()
      .max(255, "Emergency contact name must be under 255 characters")
      .optional(),

    emergencyContactPhone: z
      .string()
      .max(20, "Emergency contact phone must be under 20 characters")
      .optional(),

    pastHistoryNotes: z.string().optional(),
  })
  .refine(hasDobOrAge, {
    message: "Enter date of birth or age",
    path: ["dateOfBirth"],
  });

// ─── Inferred TypeScript Types ────────────────────────────────────────────────

/** Import this type for the create patient form values. */
export type CreatePatientInput = z.infer<typeof createPatientSchema>;

/** Import this type for the update patient form values. */
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
