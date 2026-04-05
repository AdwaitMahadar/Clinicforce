/**
 * Calendar / time-grid UI styling by appointment **category**
 * (general, orthopedic, physiotherapy) — matches DB `appointment_category`.
 */

import type { AppointmentCategory } from "@/lib/constants/appointment";
import { APPOINTMENT_CATEGORY_LABELS } from "@/lib/constants/appointment";

export type { AppointmentCategory };

/** Solid colour for FullCalendar event colour (CSS variable → resolves to theme hex). */
export const CATEGORY_COLORS: Record<
  AppointmentCategory,
  { bg: string; text: string; border: string; solid: string }
> = {
  general: {
    bg:     "var(--color-blue-bg-strong)",
    text:   "var(--color-blue)",
    border: "var(--color-blue-border-emphasis)",
    solid:  "var(--color-blue)",
  },
  orthopedic: {
    bg:     "var(--color-amber-bg)",
    text:   "var(--color-amber)",
    border: "var(--color-amber-border)",
    solid:  "var(--color-amber)",
  },
  physiotherapy: {
    bg:     "var(--color-green-bg)",
    text:   "var(--color-green)",
    border: "var(--color-green-border)",
    solid:  "var(--color-green)",
  },
};

export const CATEGORY_LABELS: Record<AppointmentCategory, string> = {
  ...APPOINTMENT_CATEGORY_LABELS,
};

/** Set of DB category keys — coerce unknown strings to `general` for calendar styling. */
export const VALID_APPOINTMENT_CATEGORIES = new Set<string>(
  Object.keys(CATEGORY_COLORS)
);
