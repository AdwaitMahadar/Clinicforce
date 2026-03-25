/**
 * Calendar / time-grid UI styling for appointment *types* (general, follow-up, …).
 * Wider than the DB `appointment_type` enum — unknown DB values map to "general"
 * in the dashboard page; these keys drive MonthView / TimeGridView / event cards.
 */

import type { AppointmentType } from "@/types/appointment";

export type { AppointmentType };

/** Solid colour for FullCalendar event colour (CSS variable → resolves to theme hex). */
export const TYPE_COLORS: Record<
  AppointmentType,
  { bg: string; text: string; border: string; solid: string }
> = {
  general:     { bg: "var(--color-blue-bg-strong)",       text: "var(--color-blue)",   border: "var(--color-blue-border-emphasis)", solid: "var(--color-blue)" },
  "follow-up": { bg: "var(--color-amber-bg)",               text: "var(--color-amber)",  border: "var(--color-amber-border)",         solid: "var(--color-amber)" },
  emergency:   { bg: "var(--color-red-bg)",                 text: "var(--color-red)",    border: "var(--color-red-border)",           solid: "var(--color-red)" },
  vaccination: { bg: "var(--color-amber-bg)",  text: "var(--color-amber)",  border: "var(--color-amber-border)",  solid: "var(--color-amber)" },
  checkup:     { bg: "var(--color-red-bg)",    text: "var(--color-red)",    border: "var(--color-red-border)",    solid: "var(--color-red)" },
  dental:      { bg: "var(--color-green-bg)",  text: "var(--color-green)",  border: "var(--color-green-border)",  solid: "var(--color-green)" },
  surgery:     { bg: "var(--color-red-bg)",    text: "var(--color-red)",    border: "var(--color-red-border)",    solid: "var(--color-red)" },
  "lab-test":  { bg: "var(--color-purple-bg)", text: "var(--color-purple)", border: "var(--color-purple-border)", solid: "var(--color-purple)" },
  therapy:     { bg: "var(--color-purple-bg)", text: "var(--color-purple)", border: "var(--color-purple-border)", solid: "var(--color-purple)" },
};

export const TYPE_LABELS: Record<AppointmentType, string> = {
  general:     "General",
  "follow-up": "Follow-up",
  emergency:   "Emergency",
  vaccination: "Vaccination",
  checkup:     "Checkup",
  dental:      "Dental",
  surgery:     "Surgery",
  "lab-test":  "Lab Test",
  therapy:     "Therapy",
};

/** Set of display keys — use when coercing DB `type` strings for the calendar. */
export const VALID_APPOINTMENT_DISPLAY_TYPES = new Set<string>(Object.keys(TYPE_COLORS));
