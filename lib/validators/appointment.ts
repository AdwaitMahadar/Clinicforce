/**
 * lib/validators/appointment.ts
 *
 * Zod schema for the appointment form (create + update).
 * Single source of truth for validation — used by:
 *   - <AppointmentDetailPanel> component (client-side React Hook Form)
 *   - Server actions: createAppointment, updateAppointment (Phase 3)
 *
 * Rule: Never define validation inline in a component. Always import from here.
 * Rule: Never include clinicId, createdBy, createdAt, updatedAt, or id in create schemas.
 *
 * Enum string lists live in `lib/constants/appointment.ts` (shared with DB + types).
 */

import { z } from "zod";
import {
  APPOINTMENT_TYPES,
  APPOINTMENT_STATUSES,
  APPOINTMENT_TYPE_LABELS,
  APPOINTMENT_STATUS_LABELS,
} from "@/lib/constants/appointment";

// Re-export for call sites that import enums from validators (forms, panels).
export {
  APPOINTMENT_TYPES,
  APPOINTMENT_STATUSES,
  APPOINTMENT_TYPE_LABELS,
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
// Used for the New Appointment form. Excludes all system-managed fields.
// patientId and doctorId are UUIDs resolved server-side from pickers.

export const createAppointmentSchema = z.object({
  title: z
    .string()
    .min(2, "Title must be at least 2 characters")
    .max(255, "Title must be under 255 characters"),

  patientId: z.string().min(1, "Please select a patient").uuid("Please select a valid patient"),

  doctorId: z.string().min(1, "Please select a doctor").uuid("Please select a valid doctor"),

  type: z.enum(APPOINTMENT_TYPES, {
    error: "Please select an appointment type",
  }),

  status: z.enum(APPOINTMENT_STATUSES, {
    error: "Please select a status",
  }),

  /** ISO timestamp string for the appointment date/time. */
  date: z.string().min(1, "Date is required"),

  /**
   * Duration in minutes. Must be between 15 and 480 (8 hours).
   * Aligns with the DB integer column `duration`.
   * Uses z.coerce to accept string from select dropdown.
   */
  duration: z
    .coerce
    .number({ error: "Duration must be a number" })
    .int("Duration must be a whole number")
    .min(15, "Duration must be at least 15 minutes")
    .max(480, "Duration cannot exceed 480 minutes (8 hours)"),

  scheduledStartTime: z.string().optional().default(""),
  scheduledEndTime:   z.string().optional().default(""),
  actualCheckIn:      z.string().optional().default(""),
  actualCheckOut:     z.string().optional().default(""),

  description: z.string().optional().default(""),
  notes:       z.string().optional().default(""),
});

// ─── Update Schema ────────────────────────────────────────────────────────────
// Used for the Edit Appointment form. All fields optional except id.

export const updateAppointmentSchema = z.object({
  id: z.string().uuid("Invalid appointment ID"),

  title: z
    .string()
    .min(2, "Title must be at least 2 characters")
    .max(255, "Title must be under 255 characters")
    .optional(),

  patientId: z.string().uuid("Please select a valid patient").optional(),

  doctorId: z.string().uuid("Please select a valid doctor").optional(),

  type: z
    .enum(APPOINTMENT_TYPES, {
      error: "Please select an appointment type",
    })
    .optional(),

  status: z
    .enum(APPOINTMENT_STATUSES, {
      error: "Please select a status",
    })
    .optional(),

  date: z.string().optional(),

  duration: z
    .coerce
    .number({ error: "Duration must be a number" })
    .int("Duration must be a whole number")
    .min(15, "Duration must be at least 15 minutes")
    .max(480, "Duration cannot exceed 480 minutes (8 hours)")
    .optional(),

  scheduledStartTime: z.string().optional(),
  scheduledEndTime:   z.string().optional(),
  actualCheckIn:      z.string().optional(),
  actualCheckOut:     z.string().optional(),

  description: z.string().optional(),
  notes:       z.string().optional(),
});

// ─── Inferred TypeScript Types ────────────────────────────────────────────────

/** Import this type for the create appointment form values. */
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

/** Import this type for the update appointment form values. */
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;

// ─── Legacy schema (kept for reference; AppointmentDetailPanel now uses create/update schemas) ───
