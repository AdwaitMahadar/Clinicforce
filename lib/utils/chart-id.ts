/**
 * Display-only formatting for per-clinic chart IDs (DB stores integers).
 * Use in components and page mappers — never in validators or persistence.
 */

const PATIENT_PREFIX = "#PT-";
const STAFF_PREFIX = "#STF-";

function normalizedNumericPart(value: number | string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && !Number.isFinite(value)) return null;
  const s = String(value).trim();
  if (s === "") return null;
  return s;
}

/** Patients: e.g. `#PT-1001`. Missing values → em dash. */
export function formatPatientChartId(value: number | string | null | undefined): string {
  const n = normalizedNumericPart(value);
  return n === null ? "—" : `${PATIENT_PREFIX}${n}`;
}

/** Staff / users: e.g. `#STF-99`. Missing values → em dash. */
export function formatStaffChartId(value: number | string | null | undefined): string {
  const n = normalizedNumericPart(value);
  return n === null ? "—" : `${STAFF_PREFIX}${n}`;
}
