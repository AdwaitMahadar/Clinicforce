import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { clinics } from "./clinics";
import { users } from "./auth";

/** Entity types that can be the subject of an activity log entry. */
export const activityEntityTypeEnum = pgEnum("activity_entity_type", [
  "patient",
  "appointment",
  "medicine",
  "document",
  "user",
]);

/** Mutation actions that produce activity log entries. */
export const activityActionEnum = pgEnum("activity_action", [
  "created",
  "updated",
  "deactivated",
  "reactivated",
  "deleted",
]);

/**
 * activity_log — Immutable audit trail of all meaningful state changes.
 *
 * One row per mutation operation. Same-time field changes are grouped
 * into a single row via the `metadata.changedFields` jsonb array.
 *
 * Log rows are immutable — no `updated_at` column.
 *
 * Sensitivity: `metadata` always stores raw old/new values in the DB.
 * The server read layer strips them (replacing with `{ sensitive: true }`)
 * before the payload leaves the server. See `lib/activity-log/sensitive-fields.ts`.
 *
 * Cross-entity fan-out: `subscribers` carries secondary entity references
 * (e.g. the patient linked to a new appointment) so that detail page queries
 * can pick up related activity without denormalization.
 */
export const activityLog = pgTable(
  "activity_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "restrict" }),
    entityType: activityEntityTypeEnum("entity_type").notNull(),
    /** UUID or better-auth text id of the primary affected record. */
    entityId: text("entity_id").notNull(),
    action: activityActionEnum("action").notNull(),
    actorId: text("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    /** Denormalized display name captured at time of action. */
    actorName: text("actor_name").notNull(),
    /** Denormalized role captured at time of action. */
    actorRole: text("actor_role").notNull(),
    /**
     * jsonb metadata shape:
     * {
     *   entityDescriptor: string,
     *   changedFields?: Array<{
     *     field: string, label: string, oldValue: string, newValue: string
     *   }>
     * }
     * changedFields is only present on 'updated' and 'reactivated' actions.
     */
    metadata: jsonb("metadata"),
    /**
     * jsonb array of secondary entities that should also see this log entry.
     * Shape: Array<{ entityType: string, entityId: string }>
     * Queried with @> (jsonb containment) — backed by a GIN index.
     */
    subscribers: jsonb("subscribers"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    // GIN index for jsonb containment queries on subscribers (@> operator)
    index("idx_activity_log_subscribers").using("gin", t.subscribers),
    // Home dashboard feed: all clinic activity ordered by time
    index("idx_activity_log_clinic_time").on(t.clinicId, t.createdAt),
    // Detail page queries: all activity for a specific entity
    index("idx_activity_log_entity").on(t.clinicId, t.entityType, t.entityId),
  ]
);
