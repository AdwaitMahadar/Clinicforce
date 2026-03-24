/**
 * Global search result rows — minimal fields for display and navigation.
 */

import type { AppointmentDbType, AppointmentStatus } from "@/lib/constants/appointment";

export interface PatientSearchHit {
  id: string;
  chartId: string;
  firstName: string;
  lastName: string;
  /** Email or phone snippet for disambiguation */
  subtitle: string | null;
  phone: string | null;
}

export interface AppointmentSearchHit {
  id: string;
  title: string;
  patientName: string;
  /** ISO string from `appointments.scheduled_at` */
  date: string;
  status: AppointmentStatus;
  type: AppointmentDbType;
}

export interface MedicineSearchHit {
  id: string;
  name: string;
  category: string | null;
  brand: string | null;
}

export interface DocumentSearchHit {
  id: string;
  title: string;
  fileName: string;
  /** Stored MIME type — drives icon in list/search */
  mimeType: string;
  /** DB `document_type` */
  type: string;
  assignedToType: "patient" | "user";
  /** When assigned to a patient (join). */
  patientName: string | null;
  /** For `/patients/view/[id]` when `assignedToType === "patient"`. */
  patientId: string | null;
}

export interface GroupedSearchResults {
  patients: PatientSearchHit[];
  appointments: AppointmentSearchHit[];
  medicines: MedicineSearchHit[];
  documents: DocumentSearchHit[];
}
