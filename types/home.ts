/**
 * View-model types for the home dashboard (recent tables, etc.).
 */

import type { AppointmentStatus } from "@/types/appointment";

export interface HomeRecentAppointmentRow {
  id:          string;
  time:        string;
  patientName: string;
  visitType:   string;
  status:      AppointmentStatus;
}
