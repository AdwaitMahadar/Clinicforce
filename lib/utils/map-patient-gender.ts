/**
 * Maps `patients.gender` DB values (lowercase `male` | `female` | `other`) to UI
 * `PatientGender` labels. Shared by patient and appointment detail mappers.
 */

import type { PatientGender } from "@/types/patient";

function trimToNull(s: string | null | undefined): string | null {
  if (s == null) return null;
  const t = String(s).trim();
  return t === "" ? null : t;
}

/** Maps DB enum string to display label; returns `null` when missing or unknown. */
export function mapDbGenderToDisplay(g: string | null | undefined): PatientGender | null {
  const t = trimToNull(g);
  if (t === null) return null;
  const lower = t.toLowerCase();
  if (lower === "male") return "Male";
  if (lower === "female") return "Female";
  if (lower === "other") return "Other";
  return null;
}
