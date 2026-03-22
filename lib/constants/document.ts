/**
 * Document type enum — aligned with `document_type` pgEnum in `lib/db/schema/documents.ts`.
 */

export const DOCUMENT_TYPES = [
  "prescription",
  "lab-report",
  "x-ray",
  "scan",
  "identification",
  "insurance",
  "consent-form",
  "other",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  prescription:   "Prescription",
  "lab-report":   "Lab report",
  "x-ray":        "X-ray",
  scan:           "Scan",
  identification: "Identification",
  insurance:      "Insurance",
  "consent-form": "Consent form",
  other:          "Other",
};
