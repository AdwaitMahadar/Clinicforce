"use server";

/**
 * lib/actions/activity-log.ts
 *
 * Reader server actions for the activity log feature.
 * Anatomy: getSession → requireRole → DB → sensitivity strip → subscriber filter → return.
 * Always return { success: true, data } or { success: false, error }.
 * Never throw.
 *
 * Sensitivity contract:
 *   Raw old/new values are always stored in the DB (see append-activity-log.ts).
 *   This layer strips values for fields listed in SENSITIVE_FIELDS before the
 *   payload leaves the server — the client only ever receives { sensitive: true }.
 *
 * Subscriber filtering (getEntityActivity only):
 *   When querying for entity X, the DB also returns entries whose `subscribers`
 *   array contains X (cross-entity fan-out, e.g. appointment logs on a patient
 *   page). These subscriber entries are filtered at read time:
 *     - created / deleted / deactivated → included as-is
 *     - updated / reactivated with a `status` field change → included, but only
 *       the `status` ChangedField is returned (all others are stripped)
 *     - updated / reactivated without a `status` field change → excluded entirely
 *   This filter runs AFTER applyFieldSensitivity.
 *
 * Pagination:
 *   Both actions fetch (limit + 1) rows. If the extra row exists, hasMore = true
 *   and the extra row is dropped before returning.
 */

import { z } from "zod";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { requireRole, ForbiddenError } from "@/lib/auth/rbac";
import { hasPermission } from "@/lib/permissions";
import { db } from "@/lib/db";
import { activityLog } from "@/lib/db/schema";
import { SENSITIVE_FIELDS } from "@/lib/activity-log";
import type { ActivityLogEntry, ChangedField } from "@/types/activity-log";

// ─── Input schemas ────────────────────────────────────────────────────────────

const getEntityActivitySchema = z.object({
  entityType: z.enum(["patient", "appointment", "medicine", "document", "user"]),
  entityId:   z.string().min(1),
  page:       z.number().int().min(1).default(1),
  limit:      z.number().int().min(1).max(100).default(20),
});

const getRecentActivitySchema = z.object({
  page:  z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

// ─── Sensitivity stripping ────────────────────────────────────────────────────

/**
 * Strips old/new values from changedFields entries whose `field` name appears
 * in `SENSITIVE_FIELDS[entityType]`. Replaced with `{ sensitive: true }`.
 * Fields not in the sensitive list get `{ sensitive: false, oldValue, newValue }`.
 */
function applyFieldSensitivity(
  entityType: string,
  rawChangedFields: unknown
): ChangedField[] {
  if (!Array.isArray(rawChangedFields) || rawChangedFields.length === 0) {
    return [];
  }

  const sensitiveSet = new Set<string>(SENSITIVE_FIELDS[entityType] ?? []);

  return rawChangedFields.map((f): ChangedField => {
    if (
      typeof f !== "object" ||
      f === null ||
      typeof (f as Record<string, unknown>).field !== "string" ||
      typeof (f as Record<string, unknown>).label !== "string"
    ) {
      // Malformed entry — surface as sensitive to be safe
      return { field: "", label: "", sensitive: true };
    }

    const entry = f as { field: string; label: string; oldValue?: string; newValue?: string };

    if (sensitiveSet.has(entry.field)) {
      return { field: entry.field, label: entry.label, sensitive: true };
    }

    return {
      field:    entry.field,
      label:    entry.label,
      sensitive: false,
      oldValue: entry.oldValue ?? "",
      newValue: entry.newValue ?? "",
    };
  });
}

/**
 * Filters an `ActivityLogEntry` that arrived via subscriber fan-out (i.e. the
 * entry's entityType differs from the queried entityType).
 *
 * Rules (applied after sensitivity stripping):
 *   - created / deleted / deactivated → returned as-is
 *   - updated / reactivated WITH a `status` changedField → returned with only
 *     the `status` field in changedFields (all other fields stripped)
 *   - updated / reactivated WITHOUT a `status` changedField → null (excluded)
 *
 * Returns the (possibly modified) entry, or `null` if the entry should be dropped.
 */
function applySubscriberFilter(
  entry: ActivityLogEntry,
  queriedEntityType: string
): ActivityLogEntry | null {
  // Not a subscriber entry — pass through unchanged
  if (entry.entityType === queriedEntityType) return entry;

  const { action } = entry;

  // Non-update actions are always relevant (creation, deletion, cancellation)
  if (action === "created" || action === "deleted" || action === "deactivated") {
    return entry;
  }

  // updated / reactivated: only surface a status change, drop everything else
  const statusField = entry.changedFields.find((f) => f.field === "status");
  if (!statusField) return null; // no status change — exclude entirely

  return { ...entry, changedFields: [statusField] };
}

/**
 * Converts a raw DB activity_log row into an `ActivityLogEntry`, applying
 * sensitivity stripping based on the row's own entityType.
 */
function toEntry(row: {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorName: string;
  actorRole: string;
  metadata: unknown;
  createdAt: Date;
}): ActivityLogEntry {
  const meta = (
    typeof row.metadata === "object" && row.metadata !== null
      ? row.metadata
      : {}
  ) as { entityDescriptor?: string; changedFields?: unknown[] };

  const changedFields = applyFieldSensitivity(
    row.entityType,
    meta.changedFields ?? []
  );

  return {
    id:               row.id,
    entityType:       row.entityType,
    entityId:         row.entityId,
    action:           row.action as ActivityLogEntry["action"],
    actorName:        row.actorName,
    actorRole:        row.actorRole as ActivityLogEntry["actorRole"],
    entityDescriptor: meta.entityDescriptor ?? "",
    changedFields,
    createdAt:        row.createdAt.toISOString(),
  };
}

// ─── getEntityActivity ────────────────────────────────────────────────────────

/**
 * Returns paginated activity log entries for a specific entity (primary or
 * subscribed). Only admin and doctor may call this — staff sees no detail sidebars.
 *
 * Subscriber fan-out: the query matches rows where either:
 *   - `entity_id = entityId AND entity_type = entityType` (primary), OR
 *   - `subscribers @> '[{"entityType":"…","entityId":"…"}]'` (cross-entity)
 */
export async function getEntityActivity(input: unknown) {
  try {
    const session = await getSession();
    requireRole(session, ["admin", "doctor", "staff"]);
    if (!hasPermission(session.user.type, "viewActivityLog")) {
      return { success: false as const, error: "FORBIDDEN" };
    }

    const parsed = getEntityActivitySchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: "Invalid parameters." };
    }

    const { entityType, entityId, page, limit } = parsed.data;
    const { clinicId } = session.user;
    const offset = (page - 1) * limit;

    // Fetch one extra row to determine hasMore without a separate COUNT query
    const rows = await db
      .select({
        id:         activityLog.id,
        entityType: activityLog.entityType,
        entityId:   activityLog.entityId,
        action:     activityLog.action,
        actorName:  activityLog.actorName,
        actorRole:  activityLog.actorRole,
        metadata:   activityLog.metadata,
        createdAt:  activityLog.createdAt,
      })
      .from(activityLog)
      .where(
        and(
          eq(activityLog.clinicId, clinicId),
          or(
            and(
              eq(activityLog.entityType, entityType),
              eq(activityLog.entityId, entityId)
            ),
            sql`${activityLog.subscribers} @> ${JSON.stringify([
              { entityType, entityId },
            ])}::jsonb`
          )
        )
      )
      .orderBy(desc(activityLog.createdAt))
      .limit(limit + 1)
      .offset(offset);

    const hasMore = rows.length > limit;
    const rawEntries = rows.slice(0, limit).map(toEntry);

    // Apply subscriber filtering: suppress noisy cross-entity field changes
    // (e.g. appointment field diffs on a patient page). Only status changes
    // and non-update actions survive for entries that arrived via fan-out.
    const entries = rawEntries.flatMap((entry) => {
      const filtered = applySubscriberFilter(entry, entityType);
      return filtered ? [filtered] : [];
    });

    return { success: true as const, data: { entries, hasMore } };
  } catch (err) {
    if (err instanceof ForbiddenError) return { success: false as const, error: "FORBIDDEN" };
    console.error("[getEntityActivity]", err);
    return { success: false as const, error: "Failed to load activity log." };
  }
}

// ─── getRecentActivity ────────────────────────────────────────────────────────

/**
 * Returns paginated recent activity for the home dashboard.
 *
 * Role-scoped:
 *   - staff       → only entries where actor_id = session.user.id
 *   - admin/doctor → all clinic activity
 *
 * Sensitivity stripping is applied per-entry based on each row's entityType.
 */
export async function getRecentActivity(input: unknown = {}) {
  try {
    const session = await getSession();
    requireRole(session, ["admin", "doctor", "staff"]);

    const parsed = getRecentActivitySchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: "Invalid parameters." };
    }

    const { page, limit } = parsed.data;
    const { clinicId, id: userId, type: userType } = session.user;
    const offset = (page - 1) * limit;

    // Staff lack viewFullActivityLog — scope to their own actions only
    const whereClause = !hasPermission(session.user.type, "viewFullActivityLog")
        ? and(
            eq(activityLog.clinicId, clinicId),
            eq(activityLog.actorId, userId)
          )
        : eq(activityLog.clinicId, clinicId);

    const rows = await db
      .select({
        id:         activityLog.id,
        entityType: activityLog.entityType,
        entityId:   activityLog.entityId,
        action:     activityLog.action,
        actorName:  activityLog.actorName,
        actorRole:  activityLog.actorRole,
        metadata:   activityLog.metadata,
        createdAt:  activityLog.createdAt,
      })
      .from(activityLog)
      .where(whereClause)
      .orderBy(desc(activityLog.createdAt))
      .limit(limit + 1)
      .offset(offset);

    const hasMore = rows.length > limit;
    const entries = rows.slice(0, limit).map(toEntry);

    return { success: true as const, data: { entries, hasMore } };
  } catch (err) {
    if (err instanceof ForbiddenError) return { success: false as const, error: "FORBIDDEN" };
    console.error("[getRecentActivity]", err);
    return { success: false as const, error: "Failed to load recent activity." };
  }
}
