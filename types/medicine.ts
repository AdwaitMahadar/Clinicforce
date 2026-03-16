/**
 * types/medicine.ts
 *
 * Canonical medicine types derived from the server action return shapes.
 * Replaces @/mock/medicines/dashboard and @/mock/medicines/detail.
 */

import type { LogEvent } from "@/components/common";

// ─── Dashboard row (list view) ────────────────────────────────────────────────

export type MedicineIcon = "pill" | "medication_liquid" | "vaccines" | "prescriptions";

export interface MedicineRow {
  id:       string;
  name:     string;
  category: string;
  brand:    string;
  lastUsed: string;   // display string, e.g. "Nov 5, 2024"
  icon:     MedicineIcon;
  status:   "active" | "inactive";
}

// ─── Detail record (single medicine view/edit panel) ──────────────────────────

export interface MedicineDetail {
  id:                 string;
  name:               string;
  category:           string;
  brand:              string;
  form:               string;
  description:        string;
  lastPrescribedDate: string;   // ISO date string "YYYY-MM-DD" or ""
  isActive:           boolean;
  createdAt:          string;   // ISO datetime string
  createdBy:          string;   // display name
  activityLog:        LogEvent[];
}
