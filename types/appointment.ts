/**
 * types/appointment.ts
 *
 * Canonical appointment types derived from the server action return shapes.
 * Replaces @/mock/appointments/dashboard and @/mock/appointments/detail.
 *
 * NOTE: TYPE_COLORS and TYPE_LABELS remain in @/mock/appointments/dashboard
 * because they are UI-only configuration (not data) and are shared with
 * components/common/. Moving them is out of scope for this task.
 */

// ─── Calendar event (list/calendar view) ──────────────────────────────────────

export type AppointmentType =
  | "general"
  | "follow-up"
  | "emergency"
  | "vaccination"
  | "checkup"
  | "dental"
  | "surgery"
  | "lab-test"
  | "therapy";

export type AppointmentStatus =
  | "scheduled"
  | "cancelled"
  | "completed"
  | "no-show";

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
  scheduledEndTime:   string;
  actualCheckIn:      string;
  actualCheckOut:     string;
  description?:       string;
  notes:              string;
  activityLog:        AppointmentActivityEntry[];
}
