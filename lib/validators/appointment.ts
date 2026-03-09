/**
 * lib/validators/appointment.ts
 *
 * Zod schema for the appointment form (edit + create).
 * Used by AppointmentDetailPanel → DetailForm.
 * Mirrors the appointments table in lib/db/schema/appointments.ts.
 */

import { z } from "zod";

// ─── Enums (match the DB enums) ───────────────────────────────────────────────

export const APPOINTMENT_TYPES = [
  "general",
  "follow-up",
  "emergency",
  "vaccination",
  "checkup",
  "dental",
  "surgery",
  "lab-test",
  "therapy",
] as const;

export const APPOINTMENT_TYPE_LABELS: Record<typeof APPOINTMENT_TYPES[number], string> = {
  "general":     "General",
  "follow-up":   "Follow-up",
  "emergency":   "Emergency",
  "vaccination": "Vaccination",
  "checkup":     "Checkup",
  "dental":      "Dental",
  "surgery":     "Surgery",
  "lab-test":    "Lab Test",
  "therapy":     "Therapy",
};

export const APPOINTMENT_STATUSES = [
  "confirmed",
  "pending",
  "cancelled",
  "completed",
  "no-show",
] as const;

export const APPOINTMENT_STATUS_LABELS: Record<typeof APPOINTMENT_STATUSES[number], string> = {
  "confirmed":  "Confirmed",
  "pending":    "Pending",
  "cancelled":  "Cancelled",
  "completed":  "Completed",
  "no-show":    "No Show",
};

export const APPOINTMENT_DURATIONS = [
  { label: "15 min", value: "15" },
  { label: "30 min", value: "30" },
  { label: "45 min", value: "45" },
  { label: "60 min", value: "60" },
  { label: "90 min", value: "90" },
  { label: "120 min", value: "120" },
];

// ─── Schema ───────────────────────────────────────────────────────────────────

export const appointmentSchema = z.object({
  title: z
    .string()
    .min(2, "Title must be at least 2 characters")
    .max(255, "Title must be under 255 characters"),
  patientName: z
    .string()
    .min(2, "Patient name is required"),
  doctorName: z
    .string()
    .min(2, "Doctor name is required"),
  type: z.enum(APPOINTMENT_TYPES, {
    error: "Please select an appointment type",
  }),
  status: z.enum(APPOINTMENT_STATUSES, {
    error: "Please select a status",
  }),
  date: z.string().min(1, "Date is required"),
  duration: z.string().min(1, "Duration is required"),
  scheduledStartTime: z.string().optional().default(""),
  scheduledEndTime: z.string().optional().default(""),
  actualCheckIn: z.string().optional().default(""),
  actualCheckOut: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

export type AppointmentFormValues = z.infer<typeof appointmentSchema>;
