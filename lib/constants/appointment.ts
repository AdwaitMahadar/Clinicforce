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

/** Clinical / service category for an appointment (DB `appointment_category`). */
export const APPOINTMENT_CATEGORIES = [
  "general",
  "orthopedic",
  "physiotherapy",
] as const;

/** Visit classification (DB `appointment_visit_type`). */
export const APPOINTMENT_VISIT_TYPES = [
  "general",
  "first-visit",
  "follow-up-visit",
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];
export type AppointmentCategory = (typeof APPOINTMENT_CATEGORIES)[number];
export type AppointmentVisitType = (typeof APPOINTMENT_VISIT_TYPES)[number];

export const APPOINTMENT_CATEGORY_LABELS: Record<AppointmentCategory, string> = {
  general:       "General",
  orthopedic:    "Orthopedic",
  physiotherapy: "Physiotherapy",
};

export const APPOINTMENT_VISIT_TYPE_LABELS: Record<AppointmentVisitType, string> = {
  general:         "General",
  "first-visit":   "First Visit",
  "follow-up-visit": "Follow-up Visit",
};

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
  "no-show": "No Show",
};

/** Default appointment length in minutes — used in DB schema default and form initial state. */
export const DEFAULT_APPOINTMENT_DURATION_MINUTES = 15;
