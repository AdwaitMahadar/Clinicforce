/**
 * lib/validators/appointment.ts
 *
 * Zod schema for the appointment form (create + update).
 * Single source of truth for validation — used by:
 *   - <AppointmentDetailPanel> component (client-side React Hook Form)
 *   - Server actions: createAppointment, updateAppointment
 *
 * Scheduled start is sent as separate date (YYYY-MM-DD) and time (HH:mm) fields;
 * the server action combines them into `scheduled_at`. Actual check-in is time-only;
 * the server combines it with today's date (`new Date()` on the server).
 *
 * Rule: Never define validation inline in a component. Always import from here.
 * Rule: Never include clinicId, createdBy, createdAt, updatedAt, or id in create schemas.
 *
 * Enum string lists live in `lib/constants/appointment.ts` (shared with DB + types).
 */

import { z } from "zod";
import {
  APPOINTMENT_CATEGORIES,
  APPOINTMENT_VISIT_TYPES,
  APPOINTMENT_STATUSES,
  APPOINTMENT_CATEGORY_LABELS,
  APPOINTMENT_VISIT_TYPE_LABELS,
  APPOINTMENT_STATUS_LABELS,
} from "@/lib/constants/appointment";

// Re-export for call sites that import enums from validators (forms, panels).
export {
  APPOINTMENT_CATEGORIES,
  APPOINTMENT_VISIT_TYPES,
  APPOINTMENT_STATUSES,
  APPOINTMENT_CATEGORY_LABELS,
  APPOINTMENT_VISIT_TYPE_LABELS,
  APPOINTMENT_STATUS_LABELS,
};

/** Common duration presets for the UI dropdown (numeric values — for use with createAppointmentSchema). */
export const APPOINTMENT_DURATION_PRESETS = [
  { label: "15 min",  value: 15  },
  { label: "30 min",  value: 30  },
  { label: "45 min",  value: 45  },
  { label: "60 min",  value: 60  },
  { label: "90 min",  value: 90  },
  { label: "120 min", value: 120 },
] as const;

/**
 * String values for select dropdowns (DetailForm SelectOption requires string values).
 * createAppointmentSchema uses z.coerce.number() so these are coerced to numbers on submit.
 */
export const APPOINTMENT_DURATIONS = [
  { label: "15 min",  value: "15"  },
  { label: "30 min",  value: "30"  },
  { label: "45 min",  value: "45"  },
  { label: "60 min",  value: "60"  },
  { label: "90 min",  value: "90"  },
  { label: "120 min", value: "120" },
] as const;

// ─── Create Schema ────────────────────────────────────────────────────────────

export const createAppointmentSchema = z.object({
  title: z
    .string()
    .max(255, "Title must be under 255 characters")
    .optional()
    .default(""),

  patientId: z.string().min(1, "Please select a patient").uuid("Please select a valid patient"),

  doctorId: z.string().min(1, "Please select a doctor"),

  category: z.enum(APPOINTMENT_CATEGORIES, {
    error: "Please select a category",
  }),

  visitType: z.enum(APPOINTMENT_VISIT_TYPES, {
    error: "Please select a visit type",
  }),

  status: z.enum(APPOINTMENT_STATUSES, {
    error: "Please select a status",
  }),

  /** Calendar date for scheduled start (YYYY-MM-DD). Combined with `scheduledTime` on the server. */
  scheduledDate: z.string().min(1, "Date is required"),

  /** Time of day for scheduled start (HH:mm). */
  scheduledTime: z.string().min(1, "Time is required"),

  /**
   * Actual check-in time of day only (HH:mm). Server stores full timestamp using today's date.
   */
  actualCheckIn: z.string().optional().default(""),

  /**
   * Duration in minutes. Must be between 15 and 480 (8 hours).
   * Uses z.coerce to accept string from select dropdown.
   */
  duration: z
    .coerce
    .number({ error: "Duration must be a number" })
    .int("Duration must be a whole number")
    .min(15, "Duration must be at least 15 minutes")
    .max(480, "Duration cannot exceed 480 minutes (8 hours)"),

  description: z.string().optional().default(""),
  notes:       z.string().optional().default(""),
});

// ─── Update Schema ────────────────────────────────────────────────────────────

export const updateAppointmentSchema = z.object({
  id: z.string().uuid("Invalid appointment ID"),

  title: z.string().max(255, "Title must be under 255 characters").optional(),

  /** Ignored by `updateAppointment` — patient cannot be reassigned after creation. Kept optional for shared form typing. */
  patientId: z.string().uuid("Please select a valid patient").optional(),

  doctorId: z.string().min(1, "Please select a valid doctor").optional(),

  category: z
    .enum(APPOINTMENT_CATEGORIES, {
      error: "Please select a category",
    })
    .optional(),

  visitType: z
    .enum(APPOINTMENT_VISIT_TYPES, {
      error: "Please select a visit type",
    })
    .optional(),

  status: z
    .enum(APPOINTMENT_STATUSES, {
      error: "Please select a status",
    })
    .optional(),

  scheduledDate: z.string().optional(),
  scheduledTime: z.string().optional(),

  /** Time-only; server merges with server `new Date()` calendar day. */
  actualCheckIn: z.string().optional(),

  duration: z
    .coerce
    .number({ error: "Duration must be a number" })
    .int("Duration must be a whole number")
    .min(15, "Duration must be at least 15 minutes")
    .max(480, "Duration cannot exceed 480 minutes (8 hours)")
    .optional(),

  description: z.string().optional(),
  notes:       z.string().optional(),
});

// ─── Inferred TypeScript Types ────────────────────────────────────────────────

/** Import this type for the create appointment form values. */
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

/** Import this type for the update appointment form values. */
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
