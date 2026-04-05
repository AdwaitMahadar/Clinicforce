import {
  APPOINTMENT_CATEGORY_LABELS,
  APPOINTMENT_VISIT_TYPE_LABELS,
  type AppointmentCategory,
  type AppointmentVisitType,
} from "@/lib/constants/appointment";

export type AppointmentHeadingInput = {
  category: AppointmentCategory | string;
  visitType: AppointmentVisitType | string;
  title?: string | null;
};

/**
 * Standard appointment label: "Category - Visit Type" or "Category - Visit Type (Title)" when title is set.
 */
export function formatAppointmentHeading(a: AppointmentHeadingInput): string {
  const cat =
    APPOINTMENT_CATEGORY_LABELS[a.category as AppointmentCategory] ??
    String(a.category);
  const visit =
    APPOINTMENT_VISIT_TYPE_LABELS[a.visitType as AppointmentVisitType] ??
    String(a.visitType);
  const base = `${cat} - ${visit}`;
  const t = a.title?.trim();
  if (t) return `${base} (${t})`;
  return base;
}
