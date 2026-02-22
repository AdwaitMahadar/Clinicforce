/**
 * Mock data for /patients/dashboard
 *
 * Phase 3: Replace these arrays with real server-fetched data via a server action.
 * Types here mirror the shapes expected by the dashboard page components.
 * Keep this file co-located with the page's data contract.
 */

export type PatientStatus = "active" | "inactive" | "critical";

export interface PatientRow {
  id: string;
  chartId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  lastVisit: string;
  assignedDoctor: string;
  status: PatientStatus;
}

// ─── Patient rows ─────────────────────────────────────────────────────────────

export const MOCK_PATIENTS: PatientRow[] = [
  {
    id: "pt-1",
    chartId: "8821",
    firstName: "Michael",
    lastName: "Ross",
    email: "michael.ross@example.com",
    phone: "+1 (555) 012-3456",
    lastVisit: "Oct 24, 2023",
    assignedDoctor: "Dr. Sarah Jenkins",
    status: "active",
  },
  {
    id: "pt-2",
    chartId: "8822",
    firstName: "Emma",
    lastName: "Watson",
    email: "emma.watson@example.com",
    phone: "+1 (555) 234-5678",
    lastVisit: "Oct 22, 2023",
    assignedDoctor: "Dr. Alan Grant",
    status: "active",
  },
  {
    id: "pt-3",
    chartId: "8790",
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    phone: "+1 (555) 345-6789",
    lastVisit: "Sep 15, 2023",
    assignedDoctor: "Dr. Sarah Jenkins",
    status: "inactive",
  },
  {
    id: "pt-4",
    chartId: "8805",
    firstName: "Alice",
    lastName: "Wong",
    email: "alice.w@example.com",
    phone: "+1 (555) 456-7890",
    lastVisit: "Oct 05, 2023",
    assignedDoctor: "Dr. Emily Chen",
    status: "critical",
  },
  {
    id: "pt-5",
    chartId: "8810",
    firstName: "Robert",
    lastName: "Brown",
    email: "r.brown@example.com",
    phone: "+1 (555) 567-8901",
    lastVisit: "Oct 19, 2023",
    assignedDoctor: "Dr. Alan Grant",
    status: "active",
  },
  {
    id: "pt-6",
    chartId: "8834",
    firstName: "Priya",
    lastName: "Sharma",
    email: "priya.sharma@example.com",
    phone: "+1 (555) 678-9012",
    lastVisit: "Nov 01, 2023",
    assignedDoctor: "Dr. Emily Chen",
    status: "active",
  },
  {
    id: "pt-7",
    chartId: "8799",
    firstName: "James",
    lastName: "O'Connor",
    email: "j.oconnor@example.com",
    phone: "+1 (555) 789-0123",
    lastVisit: "Aug 30, 2023",
    assignedDoctor: "Dr. Sarah Jenkins",
    status: "inactive",
  },
  {
    id: "pt-8",
    chartId: "8841",
    firstName: "Fatima",
    lastName: "Al-Hassan",
    email: "fatima.h@example.com",
    phone: "+1 (555) 890-1234",
    lastVisit: "Nov 03, 2023",
    assignedDoctor: "Dr. Alan Grant",
    status: "critical",
  },
];

// ─── Pagination summary ───────────────────────────────────────────────────────

export const MOCK_PATIENTS_TOTAL = 1284;
export const MOCK_PATIENTS_PAGE = 1;
export const MOCK_PATIENTS_PAGE_SIZE = 8;
