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
import type {
  PatientAppointment,
  PatientDocument,
  PatientGender,
  PatientPrescriptionSummary,
} from "@/types/patient";
import type { ActivityLogEntry } from "@/types/activity-log";
import type { PrescriptionForAppointmentTab } from "@/types/prescription";

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

/** Label/value pair for static selects in `AppointmentDetailPanel` (e.g. doctor). */
export type AppointmentSelectOption = { label: string; value: string };

/** Optional create-mode defaults for `AppointmentDetailPanel` and `/appointments/new` query prefill. */
export interface AppointmentCreateInitialValues {
  patientId?: string;
  /** Closed combobox label when `patientId` is prefilled (e.g. `Name (#PT-12345)`). */
  patientDisplayLabel?: string;
  doctorId?: string;
  category?: AppointmentCategory;
  visitType?: AppointmentVisitType;
}


/** Patient snapshot for appointment-detail sidebar (from `getAppointmentDetail`). */
export interface AppointmentDetailPatientSummary {
  fullName: string;
  ageYears: number | null;
  /** `null` when gender is unknown / unset — do not substitute a default label. */
  gender: PatientGender | null;
  bloodGroup: string | null;
  allergies: string | null;
  pastHistoryNotes: string | null;
}

export interface AppointmentDetail {
  id:                 string;
  patientId:           string;
  patientName:        string;
  /** Raw chart id for picker / labels — format with `formatPatientChartId` in UI. */
  patientChartId:     number;
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
  /** Optional visit fee (INR); display with `formatAppointmentFeeInr`. */
  fee:                number | null;
  /** Actual check-in time for the form time picker only (HH:mm). */
  actualCheckIn:      string;
  description?:       string;
  notes:              string;
  activityLog:        ActivityLogEntry[];
  /** Whether the server has more activity log pages beyond the initial SSR batch. */
  activityLogHasMore: boolean;
  /** All documents assigned to this patient (Documents tab). */
  patientDocuments:   PatientDocument[];
  /** Active appointments for this patient (Appointments tab). */
  patientAppointments: PatientAppointment[];
  /** Demographics + notes for the sidebar patient card (appointment detail only). */
  patientSummary:     AppointmentDetailPatientSummary;
  /** Admin/doctor only — `null` when absent or staff. */
  prescription:       PrescriptionForAppointmentTab | null;
  /**
   * Published prescriptions for this patient (`getPrescriptionsByPatient`), same shape as
   * `PatientDetail.prescriptions`. Staff: `[]`. UI may omit the open visit when also showing
   * `prescription` for the current appointment (dedupe by `appointmentId`).
   */
  prescriptionHistory: PatientPrescriptionSummary[];
}

/** Appointment detail UI without tab columns — Details + sidebar snapshot + activity. */
export type AppointmentDetailCore = Omit<
  AppointmentDetail,
  "patientDocuments" | "patientAppointments" | "prescription" | "prescriptionHistory"
>;
