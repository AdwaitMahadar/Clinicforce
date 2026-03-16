/**
 * lib/validators/patient.ts
 *
 * Zod schema for the patient form (create + update).
 * Single source of truth for validation — used by:
 *   - <PatientDetailPanel> component (client-side React Hook Form)
 *   - Server actions: createPatient, updatePatient (Phase 3 — server-side enforcement)
 *
 * Rule: Never define validation inline in a component. Always import from here.
 * Rule: Never include clinicId, createdBy, createdAt, updatedAt, or id in create schemas.
 */

import { z } from "zod";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const PATIENT_GENDERS = ["male", "female", "other"] as const;

export const PATIENT_BLOOD_GROUPS = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
] as const;

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
      .max(20, "Phone must be under 20 characters")
      .optional()
      .default(""),

    dateOfBirth: z.string().min(1, "Date of birth is required"),

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

    notes: z.string().optional().default(""),
  })
  .refine(
    (data) => {
      const hasEmail = !!data.email && data.email.trim().length > 0;
      const hasPhone = !!data.phone && data.phone.trim().length > 0;
      return hasEmail || hasPhone;
    },
    {
      message: "At least one of email or phone must be provided",
      path: ["email"], // surface the error on the email field
    }
  );

// ─── Update Schema ────────────────────────────────────────────────────────────
// Used for the Edit Patient form. All fields are optional except id.
// Applies the same email-or-phone refinement if either is provided.

export const updatePatientSchema = z
  .object({
    id: z.string().uuid("Invalid patient ID"),

    firstName: z
      .string()
      .min(1, "First name is required")
      .max(100, "First name must be under 100 characters")
      .optional(),

    lastName: z
      .string()
      .min(1, "Last name is required")
      .max(100, "Last name must be under 100 characters")
      .optional(),

    email: z
      .string()
      .max(255, "Email must be under 255 characters")
      .email("Please enter a valid email address")
      .or(z.literal(""))
      .optional(),

    phone: z
      .string()
      .max(20, "Phone must be under 20 characters")
      .optional(),

    dateOfBirth: z.string().optional(),

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

    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      // Only enforce email-or-phone if either field is explicitly provided in the update
      const emailProvided = data.email !== undefined;
      const phoneProvided = data.phone !== undefined;
      if (!emailProvided && !phoneProvided) return true; // not being touched — skip check
      const hasEmail = !!data.email && data.email.trim().length > 0;
      const hasPhone = !!data.phone && data.phone.trim().length > 0;
      return hasEmail || hasPhone;
    },
    {
      message: "At least one of email or phone must be provided",
      path: ["email"],
    }
  );

// ─── Inferred TypeScript Types ────────────────────────────────────────────────

/** Import this type for the create patient form values. */
export type CreatePatientInput = z.infer<typeof createPatientSchema>;

/** Import this type for the update patient form values. */
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
