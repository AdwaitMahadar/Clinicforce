/**
 * types/medicine.ts
 *
 * Canonical medicine types derived from server action return shapes (UI layer).
 */

import type { ActivityLogEntry } from "@/types/activity-log";

// ─── Dashboard row (list view) ────────────────────────────────────────────────

/** Form / detail header icon keys — used by `MedicineDetailPanel` (not the dashboard row). */
export type MedicineIcon = "pill" | "medication_liquid" | "vaccines" | "prescriptions";

export interface MedicineRow {
  id:       string;
  name:     string;
  category: string;
  brand:    string;
  lastUsed: string;   // display string, e.g. "Nov 5, 2024"
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
  activityLog:        ActivityLogEntry[];
  /** Whether the server has more activity log pages beyond the initial SSR batch. */
  activityLogHasMore: boolean;
}
