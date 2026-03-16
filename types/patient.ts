/**
 * types/patient.ts
 *
 * Canonical patient types derived from the server action return shapes.
 * Replaces @/mock/patients/dashboard and @/mock/patients/detail.
 */

import type { LogEvent } from "@/components/common";

// ─── Dashboard row (list view) ────────────────────────────────────────────────

export type PatientStatus = "active" | "inactive";

export interface PatientRow {
  id:             string;
  chartId:        string;
  firstName:      string;
  lastName:       string;
  email:          string;
  phone:          string;
  lastVisit:      string;         // display string e.g. "Nov 5, 2024" or "No visits"
  assignedDoctor: string;
  status:         PatientStatus;
}

// ─── Detail record (single patient view panel) ────────────────────────────────

export type PatientGender    = "Male" | "Female" | "Other" | "Prefer not to say";
export type AppointmentStatus = "scheduled" | "completed" | "cancelled" | "no-show";

export interface PatientAppointment {
  id:     string;
  title:  string;
  doctor: string;
  date:   string;
  time:   string;
  status: AppointmentStatus;
}

export interface PatientDocument {
  id:         string;
  name:       string;
  type:       "pdf" | "doc" | "xls" | "img" | "other";
  size:       string;
  uploadedAt: string;
}

export interface PatientDetail {
  id:                   string;
  chartId:              string;
  firstName:            string;
  lastName:             string;
  email:                string;
  phone:                string;
  dateOfBirth:          string;   // Display string e.g. "Jun 14, 1985 (38 yrs)"
  gender:               PatientGender;
  address:              string;
  bloodGroup:           string;
  allergies:            string | null;
  emergencyContactName: string;
  emergencyContactPhone:string;
  assignedDoctor:       string;
  status:               PatientStatus;
  appointments:         PatientAppointment[];
  documents:            PatientDocument[];
  activityLog:          LogEvent[];
}
