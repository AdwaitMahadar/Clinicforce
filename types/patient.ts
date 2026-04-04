/**
 * types/patient.ts
 *
 * Canonical patient types derived from server action return shapes (UI layer).
 */

import type { LogEvent } from "@/components/common";
import type { AppointmentStatus } from "@/types/appointment";

// ─── Dashboard row (list view) ────────────────────────────────────────────────

export type PatientStatus = "active" | "inactive";

export interface PatientRow {
  id:             string;
  /** Raw integer from the server; formatted with `formatPatientChartId` at render time. */
  chartId:        number;
  firstName:      string;
  lastName:       string;
  email:          string;
  phone:          string;
  lastVisit:      string;         // display string e.g. "Nov 5, 2024" or "No visits"
  assignedDoctor: string;
  status:         PatientStatus;
}

// ─── Detail record (single patient view panel) ────────────────────────────────

export type PatientGender = "Male" | "Female" | "Other" | "Prefer not to say";
export type { AppointmentStatus };

export interface PatientAppointment {
  id:     string;
  title:  string;
  doctor: string;
  date:   string;
  time:   string;
  status: AppointmentStatus;
}

/** Document list item for patient / appointment detail (matches DB + `DocumentCard`). */
export interface PatientDocument {
  id: string;
  title: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  /** DB `document_type` enum value */
  type: string;
  /** ISO timestamp */
  uploadedAt: string;
}

export interface PatientDetail {
  id:                   string;
  /** Display string from `formatPatientChartId` (e.g. `#PT-1001`). */
  chartId:              string;
  firstName:            string;
  lastName:             string;
  email:                string;
  phone:                string;
  dateOfBirth:          string;   // Display string e.g. "Jun 14, 1985 (38 yrs)"
  /** ISO `YYYY-MM-DD` from DB — set by detail routes for edit forms */
  dateOfBirthIso?: string;
  gender:               PatientGender;
  address:              string;
  bloodGroup:           string;
  allergies:            string | null;
  emergencyContactName: string;
  emergencyContactPhone:string;
  /** Patient past history from DB (`past_history_notes`). */
  pastHistoryNotes?: string;
  assignedDoctor:       string;
  status:               PatientStatus;
  appointments:         PatientAppointment[];
  documents:            PatientDocument[];
  activityLog:          LogEvent[];
}
