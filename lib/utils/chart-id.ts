/**
 * Display-only formatting for per-clinic chart IDs (DB stores integers).
 * Use in components and page mappers — never in validators or persistence.
 */

const PREFIXES = {
  patient:  "#PT-",
  staff:    "#STF-",
  medicine: "#MED-",
  user:     "#USR-",
} as const;

export type ChartIdEntityType = keyof typeof PREFIXES;

function normalizedNumericPart(value: number | string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && !Number.isFinite(value)) return null;
  const s = String(value).trim();
  if (s === "") return null;
  return s;
}

/**
 * Unified chart ID formatter.
 * e.g. formatChartId(1001, "patient") → "#PT-1001"
 *      formatChartId(99,   "staff")   → "#STF-99"
 *      formatChartId(null, "medicine") → "—"
 */
export function formatChartId(
  value: number | string | null | undefined,
  entityType: ChartIdEntityType,
): string {
  const n = normalizedNumericPart(value);
  return n === null ? "—" : `${PREFIXES[entityType]}${n}`;
}

/** Patients: e.g. `#PT-1001`. Missing values → em dash. */
export function formatPatientChartId(value: number | string | null | undefined): string {
  return formatChartId(value, "patient");
}

/** Staff / users: e.g. `#STF-99`. Missing values → em dash. */
export function formatStaffChartId(value: number | string | null | undefined): string {
  return formatChartId(value, "staff");
}
