/**
 * Shared patient field enums (no Zod) — align `lib/db/schema` + Zod + any typed UI.
 * Display labels for gender (e.g. "Male") stay in components; DB stores lowercase.
 */

export const PATIENT_GENDERS = ["male", "female", "other"] as const;

export const PATIENT_BLOOD_GROUPS = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
] as const;

export type PatientGenderValue = (typeof PATIENT_GENDERS)[number];
export type PatientBloodGroup = (typeof PATIENT_BLOOD_GROUPS)[number];
