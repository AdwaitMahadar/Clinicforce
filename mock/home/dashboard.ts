/**
 * Mock data for /home/dashboard
 *
 * Phase 3: Replace these arrays with real server-fetched data.
 * Types here mirror the shapes expected by the dashboard page components.
 * Keep this file co-located with the page's data contract — when the API
 * is ready, delete this file and import from a server action / API route instead.
 */

import { CalendarDays, Users, ClipboardList, TrendingUp } from "lucide-react";
import type { AppStatus } from "@/components/common";
import type { LogEvent } from "@/components/common";

// ─── Shared types (page-local, not shared across the app) ─────────────────────

export interface AppointmentRow {
  time: string;
  patientName: string;
  visitType: string;
  status: AppStatus;
}

// ─── Stat cards ───────────────────────────────────────────────────────────────

export const MOCK_STAT_CARDS = [
  { label: "Total Patients",  value: "1,284", delta: "+12%", positive: true,  icon: Users        },
  { label: "Appointments",    value: "24",    delta: "+5%",  positive: true,  icon: CalendarDays },
  { label: "Pending Reports", value: "12",    delta: "-2%",  positive: false, icon: ClipboardList},
  { label: "Growth",          value: "+8.2%", delta: "+8%",  positive: true,  icon: TrendingUp   },
] as const;

// ─── Today's schedule ─────────────────────────────────────────────────────────

export const MOCK_APPOINTMENTS: AppointmentRow[] = [
  { time: "09:00 AM", patientName: "John Doe",     visitType: "General Checkup", status: "confirmed" },
  { time: "10:30 AM", patientName: "Jane Smith",   visitType: "Follow-up",       status: "pending"   },
  { time: "01:00 PM", patientName: "Robert Brown", visitType: "Consultation",    status: "confirmed" },
  { time: "02:30 PM", patientName: "Alice Wong",   visitType: "Blood Work",      status: "cancelled" },
];

// ─── Recent activity / event log ──────────────────────────────────────────────

export const MOCK_ACTIVITY: LogEvent[] = [
  { title: "Lab results uploaded", body: "Patient Michael Ross's hematology reports are ready.", time: "12 min ago", unread: true },
  { title: "New patient",          body: "Emma Watson added to database.",                        time: "1 hr ago"               },
  { title: "Billing updated",      body: "Invoice #INV-8821 paid.",                               time: "3 hrs ago"              },
  { title: "System backup",        body: "Automated cloud backup completed successfully.",         time: "Yesterday"              },
];
