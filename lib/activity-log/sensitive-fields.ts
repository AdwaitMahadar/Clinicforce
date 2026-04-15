/**
 * lib/activity-log/sensitive-fields.ts
 *
 * Single source of truth for field-level sensitivity per entity type.
 *
 * Fields listed here will have their `oldValue` / `newValue` stripped from
 * activity log entries before they leave the server — the client receives
 * `{ sensitive: true }` in place of the actual values.
 *
 * Changing a field here applies universally to ALL historical log rows because
 * raw values are always stored in the DB and sensitivity is enforced at read
 * time, never at write time.
 *
 * Key: entity type matching `activity_entity_type` enum values.
 * Value: array of `changedFields[].field` strings to treat as sensitive.
 */
export const SENSITIVE_FIELDS: Record<string, string[]> = {
  patient: ["pastHistoryNotes"],
  appointment: ["notes"],
};
