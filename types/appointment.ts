/**
 * types/appointment.ts
 *
 * Canonical appointment types for UI and server-action payloads.
 * Calendar category styling lives in `lib/appointment-calendar-styles.ts`.
 *
 * `AppointmentStatus` and DB enums are derived from `lib/constants/appointment.ts`
 * (no Zod) so client bundles stay lean and values stay aligned with validators + DB.
 */

import type {
  AppointmentCategory,
  AppointmentVisitType,
  AppointmentStatus,
} from "@/lib/constants/appointment";
import type { PatientDocument } from "@/types/patient";

export type { AppointmentStatus, AppointmentCategory, AppointmentVisitType };

/** The shape passed as props to MonthView / TimeGridView. */
export interface AppointmentEvent {
  id:               string;
  patientName:      string;
  /** `patients.first_name` from the calendar query — use for compact month chips. */
  patientFirstName: string;
  doctorName:       string;
  category:         AppointmentCategory;
  visitType:        AppointmentVisitType;
  /** Optional user-facing title; primary label uses `formatAppointmentHeading`. */
  title:            string | null;
  status:           AppointmentStatus;
  /** ISO date-time string, e.g. "2025-02-22T09:00:00" */
  start:            string;
  /** ISO date-time string */
  end:              string;
  notes?:           string;
}

// ─── Detail record (single appointment view/edit panel) ───────────────────────

/** Label/value pair for patient/doctor selects in `AppointmentDetailPanel`. */
export type AppointmentSelectOption = { label: string; value: string };

export interface AppointmentActivityEntry {
  id:        string;
  action:    string;
  detail?:   string;
  actor:     string;
  timestamp: string;
  color:     "green" | "blue" | "amber" | "red" | "muted";
}

export interface AppointmentDetail {
  id:                 string;
  patientId:           string;
  patientName:        string;
  patientInitials:    string;
  doctorId:           string;
  doctorName:         string;
  title:              string | null;
  category:           AppointmentCategory;
  visitType:          AppointmentVisitType;
  status:             AppointmentStatus;
  /** Scheduled date for the form date picker (YYYY-MM-DD). */
  scheduledDate:      string;
  /** Scheduled time for the form time picker (HH:mm). */
  scheduledTime:      string;
  /** Duration in minutes */
  duration:           number;
  /** Actual check-in time for the form time picker only (HH:mm). */
  actualCheckIn:      string;
  description?:       string;
  notes:              string;
  activityLog:        AppointmentActivityEntry[];
  /** Documents linked via `appointment_id` (appointment detail panel). */
  documents:          PatientDocument[];
}
