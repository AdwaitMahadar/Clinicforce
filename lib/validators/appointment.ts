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
 * Enums MUST match the DB pgEnum values exactly:
 *   - appointmentTypeEnum:   general | follow-up | emergency
 *   - appointmentStatusEnum: scheduled | completed | cancelled | no-show
 */

import { z } from "zod";

// ─── Enums (must match DB pgEnum values in lib/db/schema/appointments.ts) ─────

export const APPOINTMENT_TYPES = [
  "general",
  "follow-up",
  "emergency",
] as const;

export const APPOINTMENT_TYPE_LABELS: Record<typeof APPOINTMENT_TYPES[number], string> = {
  "general":   "General",
  "follow-up": "Follow-up",
  "emergency": "Emergency",
};

export const APPOINTMENT_STATUSES = [
  "scheduled",
  "completed",
  "cancelled",
  "no-show",
] as const;

export const APPOINTMENT_STATUS_LABELS: Record<typeof APPOINTMENT_STATUSES[number], string> = {
  "scheduled": "Scheduled",
  "completed": "Completed",
  "cancelled": "Cancelled",
  "no-show":   "No Show",
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
 * @deprecated Use APPOINTMENT_DURATION_PRESETS instead.
 * String values kept for compatibility with DetailForm SelectOption (which requires string values)
 * and the legacy appointmentSchema. Migrate to numeric APPOINTMENT_DURATION_PRESETS in Step 6.
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

  patientId: z.string().uuid("Please select a valid patient"),

  doctorId: z.string().uuid("Please select a valid doctor"),

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
   */
  duration: z
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

// ─── Legacy aliases (for backward compatibility with existing form usages) ────
// TODO: Migrate AppointmentDetailPanel in Step 6 when UI is wired to server
// actions. At that point, patientName/doctorName become patientId/doctorId
// (UUIDs from picker selects), and duration becomes a number.

/**
 * @deprecated Legacy form schema used by AppointmentDetailPanel.
 * Uses string-based patientName/doctorName and string duration fields
 * to match current mock-data-backed UI. Will be replaced by
 * createAppointmentSchema / updateAppointmentSchema in Step 6.
 */
export const appointmentSchema = z.object({
  title:              z.string().min(2, "Title must be at least 2 characters").max(255),
  patientName:        z.string().min(2, "Patient name is required"),
  doctorName:         z.string().min(2, "Doctor name is required"),
  type:               z.enum(APPOINTMENT_TYPES, { error: "Please select an appointment type" }),
  status:             z.enum(APPOINTMENT_STATUSES, { error: "Please select a status" }),
  date:               z.string().min(1, "Date is required"),
  /** String-encoded duration for legacy select dropdown; validated 15–480 on the server. */
  duration:           z.string().min(1, "Duration is required"),
  scheduledStartTime: z.string().optional().default(""),
  scheduledEndTime:   z.string().optional().default(""),
  actualCheckIn:      z.string().optional().default(""),
  actualCheckOut:     z.string().optional().default(""),
  notes:              z.string().optional().default(""),
});

/** @deprecated Use CreateAppointmentInput or UpdateAppointmentInput instead. */
export type AppointmentFormValues = z.infer<typeof appointmentSchema>;
