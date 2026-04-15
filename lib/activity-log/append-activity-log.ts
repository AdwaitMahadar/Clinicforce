/**
 * lib/activity-log/append-activity-log.ts
 *
 * Fire-and-forget writer for activity log entries.
 *
 * Call this AFTER a successful DB mutation and BEFORE `revalidatePath`.
 * It never throws — errors are caught and console.error'd so that a logging
 * failure can never break the parent server action.
 */

import { db } from "@/lib/db";
import { activityLog } from "@/lib/db/schema";
import type { AppSession } from "@/lib/auth/session";

// ─── Types ────────────────────────────────────────────────────────────────────

type EntityType = "patient" | "appointment" | "medicine" | "document" | "user";
type Action =
  | "created"
  | "updated"
  | "deactivated"
  | "reactivated"
  | "deleted";

interface ChangedField {
  field: string;
  label: string;
  oldValue: string;
  newValue: string;
}

interface ActivityLogMetadata {
  entityDescriptor: string;
  changedFields?: ChangedField[];
}

interface Subscriber {
  entityType: EntityType;
  entityId: string;
}

interface AppendActivityLogParams {
  session: AppSession;
  entityType: EntityType;
  entityId: string;
  action: Action;
  metadata?: ActivityLogMetadata;
  subscribers?: Subscriber[];
}

// ─── Writer ──────────────────────────────────────────────────────────────────

/**
 * Inserts a single immutable row into `activity_log`.
 *
 * - Actor fields (`actor_id`, `actor_name`, `actor_role`, `clinic_id`) are
 *   pulled from the session — callers never pass them directly.
 * - Errors are swallowed; the function always resolves without throwing.
 */
export async function appendActivityLog(
  params: AppendActivityLogParams
): Promise<void> {
  const { session, entityType, entityId, action, metadata, subscribers } =
    params;

  try {
    const { id: actorId, firstName, lastName, type, clinicId } = session.user;
    const actorName = `${firstName} ${lastName}`.trim() || session.user.email;

    await db.insert(activityLog).values({
      clinicId,
      entityType,
      entityId,
      action,
      actorId,
      actorName,
      actorRole: type,
      metadata: metadata ?? null,
      subscribers: subscribers ?? null,
    });
  } catch (err) {
    console.error("[appendActivityLog] Failed to write activity log row:", err);
    // Intentionally swallowed — must not propagate to the calling action.
  }
}
