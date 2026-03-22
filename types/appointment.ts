/**
 * types/appointment.ts
 *
 * Canonical appointment types for UI and server-action payloads.
 * Calendar type styling lives in `lib/appointment-calendar-styles.ts`.
 *
 * `AppointmentStatus` and DB appointment types are derived from `lib/constants/appointment.ts`
 * (no Zod) so client bundles stay lean and values stay aligned with validators + DB.
 */

import type { AppointmentDbType, AppointmentStatus } from "@/lib/constants/appointment";

export type { AppointmentStatus };

/** Extra calendar-only type labels (not in DB `appointment_type` enum). */
export type AppointmentCalendarExtra =
  | "vaccination"
  | "checkup"
  | "dental"
  | "surgery"
  | "lab-test"
  | "therapy";

/** Display superset for calendar chips — DB types + calendar-only labels. */
export type AppointmentType = AppointmentDbType | AppointmentCalendarExtra;

/** The shape passed as props to MonthView / TimeGridView. */
export interface AppointmentEvent {
  id:          string;
  patientName: string;
  doctorName:  string;
  type:        AppointmentType;
  status:      AppointmentStatus;
  /** ISO date-time string, e.g. "2025-02-22T09:00:00" */
  start:       string;
  /** ISO date-time string */
  end:         string;
  notes?:      string;
}

// ─── Detail record (single appointment view/edit panel) ───────────────────────

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
  title:              string;
  type:               AppointmentType;
  status:             AppointmentStatus;
  /** ISO date string "YYYY-MM-DD" */
  date:               string;
  /** Duration in minutes */
  duration:           number;
  scheduledStartTime: string;
  actualCheckIn:      string;
  description?:       string;
  notes:              string;
  activityLog:        AppointmentActivityEntry[];
}
