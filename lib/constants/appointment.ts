/**
 * Shared appointment enums (no Zod) — single source for DB pgEnum, Zod `z.enum`,
 * and `types/appointment` so values cannot drift.
 */

export const APPOINTMENT_STATUSES = [
  "scheduled",
  "completed",
  "cancelled",
  "no-show",
] as const;

export const APPOINTMENT_TYPES = ["general", "follow-up", "emergency"] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];
export type AppointmentDbType = (typeof APPOINTMENT_TYPES)[number];

export const APPOINTMENT_TYPE_LABELS: Record<AppointmentDbType, string> = {
  general:   "General",
  "follow-up": "Follow-up",
  emergency: "Emergency",
};

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
  "no-show": "No Show",
};

/** Default appointment length in minutes — used in DB schema default and form initial state. */
export const DEFAULT_APPOINTMENT_DURATION_MINUTES = 30;
