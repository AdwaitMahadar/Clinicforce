/**
 * types/activity-log.ts
 *
 * Canonical client-facing types for the activity log feature.
 * These are the shapes returned by the reader server actions after
 * sensitivity stripping — raw DB values (oldValue/newValue for sensitive
 * fields) never reach the client.
 */

/**
 * A single changed field entry within an activity log entry.
 *
 * Discriminated union on `sensitive`:
 *   - `sensitive: true`  — server withheld old/new values; show "updated" label only
 *   - `sensitive: false` — old and new values are safe to display
 */
export type ChangedField =
  | {
      field: string;
      label: string;
      sensitive: true;
    }
  | {
      field: string;
      label: string;
      sensitive: false;
      oldValue: string;
      newValue: string;
    };

/**
 * A single activity log entry — the unit rendered by `ActivityLog` component.
 *
 * `changedFields` is an empty array for `created`, `deactivated`, and `deleted`
 * actions. It is populated (possibly partially redacted) for `updated` and
 * `reactivated` actions.
 *
 * `createdAt` is an ISO 8601 string — convert at render time with `new Date()`.
 */
export type ActivityLogEntry = {
  id: string;
  entityType: string;
  entityId: string;
  action: "created" | "updated" | "deactivated" | "reactivated" | "deleted";
  actorName: string;
  actorRole: "admin" | "doctor" | "staff";
  entityDescriptor: string;
  changedFields: ChangedField[];
  createdAt: string; // ISO string
};
