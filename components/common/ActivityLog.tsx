"use client";

/**
 * components/common/ActivityLog.tsx
 *
 * Presentational timeline component for activity log entries.
 * Receives data as props — does NOT fetch anything.
 *
 * Colours strictly from CSS vars (globals.css). No hex literals here.
 *
 * Usage:
 *   <ActivityLog
 *     entries={entries}
 *     hasMore={hasMore}
 *     onLoadMore={loadMore}
 *     isLoading={false}
 *   />
 */

import { useEffect, useLayoutEffect, useRef } from "react";
import {
  Plus,
  Pencil,
  Archive,
  ArchiveRestore,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { ActivityLogEntry, ChangedField } from "@/types/activity-log";

// ─── Action → Icon map ────────────────────────────────────────────────────────

const ACTION_ICON: Record<ActivityLogEntry["action"], LucideIcon> = {
  created:     Plus,
  updated:     Pencil,
  deactivated: Archive,
  reactivated: ArchiveRestore,
  deleted:     Trash2,
};

// ─── Action → Icon color ──────────────────────────────────────────────────────

const ACTION_COLOR: Record<ActivityLogEntry["action"], string> = {
  created:     "var(--color-green)",
  updated:     "var(--color-blue)",
  deactivated: "var(--color-amber)",
  reactivated: "var(--color-green)",
  deleted:     "var(--color-red)",
};

// ─── Actor role → colour (text only — no badge) ───────────────────────────────

/**
 * Maps actor roles to a CSS variable for text colour.
 * Tokens defined in globals.css under "Role identity colours".
 * Kept in one place so a future change applies everywhere automatically.
 */
const ROLE_COLOR: Record<ActivityLogEntry["actorRole"], string> = {
  admin:  "var(--role-color-admin)",
  doctor: "var(--role-color-doctor)",
  staff:  "var(--role-color-staff)",
};

// ─── Action → label (verb to appear in the title line) ────────────────────────

const ACTION_LABEL: Record<ActivityLogEntry["action"], string> = {
  created:     "created",
  updated:     "updated",
  deactivated: "deactivated",
  reactivated: "reactivated",
  deleted:     "deleted",
};

// ─── Timestamp formatter ───────────────────────────────────────────────────────

/**
 * Formats an ISO string into "Jan 12 · 2:34 PM".
 * Called each render — no memoisation needed at this scale.
 */
function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const datePart = d.toLocaleDateString("en-US", {
    month: "short",
    day:   "numeric",
  });
  const timePart = d.toLocaleTimeString("en-US", {
    hour:   "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${datePart} · ${timePart}`;
}

// ─── Capitalise helper ────────────────────────────────────────────────────────

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Intersection sentinel hook ──────────────────────────────────────────────

/**
 * Attaches an IntersectionObserver to the returned ref. When the element
 * enters the viewport and `enabled` is true, the latest `callback` is called.
 *
 * Why callbackRef?
 * `callback` (onLoadMore) is a new function reference on every parent render
 * unless the parent wraps it in useCallback. Including it in the useEffect
 * dependency array would cause the observer to disconnect and reconnect on
 * every render — defeating infinite scroll. Instead we:
 *   1. Store the latest callback in a ref kept current via useLayoutEffect
 *      (runs synchronously before paint, so the ref is never stale when the
 *      IntersectionObserver fires).
 *   2. Keep only `enabled` in the useEffect deps so the observer is only
 *      torn down / recreated when the guard condition actually changes.
 */
function useIntersectionSentinel(
  callback: () => void,
  enabled: boolean,
): React.RefObject<HTMLDivElement | null> {
  const ref         = useRef<HTMLDivElement | null>(null);
  const callbackRef = useRef(callback);

  // Keep callbackRef current without triggering the observer effect
  useLayoutEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    if (!enabled || !ref.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          callbackRef.current();
        }
      },
      // Fire as soon as even 1px of the sentinel is visible
      { threshold: 0 },
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [enabled]); // ← only enabled; callback is read via callbackRef

  return ref;
}

// ─── Component props ──────────────────────────────────────────────────────────

export interface ActivityLogProps {
  entries:    ActivityLogEntry[];
  hasMore:    boolean;
  onLoadMore: () => void;
  isLoading:  boolean;
  className?: string;
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * Renders a vertical timeline of activity log entries.
 *
 * Purely presentational — all data arrives through props. The parent is
 * responsible for fetching (`getEntityActivity` / `getRecentActivity`) and
 * managing page state for pagination.
 *
 * @example
 * ```tsx
 * <ActivityLog
 *   entries={activityEntries}
 *   hasMore={hasMore}
 *   onLoadMore={() => setPage(p => p + 1)}
 *   isLoading={isLoading}
 * />
 * ```
 */
export function ActivityLog({
  entries,
  hasMore,
  onLoadMore,
  isLoading,
  className,
}: ActivityLogProps) {
  // ── Loading skeleton state ─────────────────────────────────────────────────
  if (isLoading && entries.length === 0) {
    return <ActivityLogSkeleton className={className} />;
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!isLoading && entries.length === 0) {
    return (
      <p
        className={`text-sm text-center py-6 ${className ?? ""}`}
        style={{ color: "var(--color-text-muted)" }}
      >
        No activity yet.
      </p>
    );
  }

  return (
    <div className={className}>
      {/* ── Timeline ────────────────────────────────────────────────────── */}
      <div className="relative pl-2 space-y-5">
        {/* Vertical rule — spans from top dot to bottom dot */}
        <div
          className="absolute top-3 bottom-5 left-[11px] w-[1.5px]"
          style={{ background: "var(--color-border)" }}
          aria-hidden
        />

        {entries.map((entry) => (
          <ActivityLogItem key={entry.id} entry={entry} />
        ))}
      </div>

      {/* ── Infinite-scroll sentinel + inline loading indicator ────────── */}
      <InfiniteScrollSentinel
        hasMore={hasMore}
        isLoading={isLoading}
        onLoadMore={onLoadMore}
      />
    </div>
  );
}
// ─── Infinite-scroll sentinel ─────────────────────────────────────────────────

/**
 * Invisible sentinel div placed at the bottom of the list.
 * - When it enters the viewport AND `hasMore && !isLoading`, fires `onLoadMore`.
 * - While `isLoading` is true (and entries already exist), shows three pulsing
 *   dots as a minimal inline loading indicator.
 */
function InfiniteScrollSentinel({
  hasMore,
  isLoading,
  onLoadMore,
}: Pick<ActivityLogProps, "hasMore" | "isLoading" | "onLoadMore">) {
  // Only observe when there is more data to load and we are not mid-request
  const sentinel = useIntersectionSentinel(onLoadMore, hasMore && !isLoading);

  return (
    <>
      {/* Zero-height element watched by the observer */}
      <div ref={sentinel} aria-hidden className="h-px" />

      {/* Subtle loading indicator while a page fetch is in flight */}
      {isLoading && (
        <div className="flex items-center justify-center gap-1.5 py-3" aria-label="Loading more">
          {[0, 1, 2].map((i) => (
            <Skeleton
              key={i}
              className="size-1.5 rounded-full"
              style={{
                animationDelay: `${i * 150}ms`,
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}

// ─── Single timeline row ──────────────────────────────────────────────────────

function ActivityLogItem({ entry }: { entry: ActivityLogEntry }) {
  const Icon        = ACTION_ICON[entry.action];
  const iconColor   = ACTION_COLOR[entry.action];
  const actionLabel = ACTION_LABEL[entry.action];
  const roleColor   = ROLE_COLOR[entry.actorRole] ?? "var(--color-text-primary)";
  const showFields  = entry.action === "updated" || entry.action === "reactivated";

  return (
    <div className="flex gap-3 relative">
      {/* ── Dot with action icon ──────────────────────────────────────── */}
      <div className="flex-shrink-0 mt-0.5 z-10">
        <div
          className="size-[22px] rounded-full flex items-center justify-center"
          style={{
            background: "var(--color-surface)",
            border:     "1.5px solid var(--color-border)",
            boxShadow:  "0 0 0 3px var(--color-surface)",
          }}
        >
          <Icon
            size={11}
            strokeWidth={2.5}
            style={{ color: iconColor }}
          />
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────── */}
      <div className="min-w-0 pb-1">
        {/* Timestamp */}
        <p
          className="text-[10px] font-medium mb-0.5"
          style={{ color: "var(--color-text-muted)" }}
        >
          {formatTimestamp(entry.createdAt)}
        </p>

        {/* Title: "{Entity} {action} by {actorName}" */}
        <p
          className="text-xs font-semibold leading-snug"
          style={{ color: "var(--color-text-primary)" }}
        >
          {capitalise(entry.entityType)} {actionLabel} by{" "}
          <span style={{ color: roleColor }}>{entry.actorName}</span>
        </p>

        {/* Entity descriptor */}
        <p
          className="text-[11.5px] mt-0.5 leading-relaxed"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {entry.entityDescriptor}
        </p>

        {/* Changed fields — only for updated / reactivated */}
        {showFields && entry.changedFields.length > 0 && (
          <div className="mt-1.5 space-y-0.5">
            {entry.changedFields.map((cf) => (
              <ChangedFieldRow key={cf.field} field={cf} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Changed-field row ────────────────────────────────────────────────────────

function ChangedFieldRow({ field }: { field: ChangedField }) {
  return (
    <div className="flex items-baseline gap-2 text-[10.5px]">
      {/* Field label */}
      <span
        className="font-semibold uppercase tracking-wide shrink-0"
        style={{ color: "var(--color-text-muted)" }}
      >
        {field.label}
      </span>

      {/* Value */}
      {field.sensitive ? (
        <span
          className="italic"
          style={{ color: "var(--color-text-muted)" }}
        >
          updated
        </span>
      ) : (
        <span style={{ color: "var(--color-text-secondary)" }}>
          {field.oldValue ? (
            <span
              className="line-through mr-1"
              style={{ color: "var(--color-text-muted)" }}
            >
              {field.oldValue}
            </span>
          ) : (
            <span
              className="italic mr-1"
              style={{ color: "var(--color-text-muted)" }}
            >
              (empty)
            </span>
          )}
          →{" "}
          <span style={{ color: "var(--color-text-primary)" }}>
            {field.newValue || "—"}
          </span>
        </span>
      )}
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function ActivityLogSkeleton({ className }: { className?: string }) {
  return (
    <div className={`relative pl-2 space-y-5 ${className ?? ""}`}>
      {/* Vertical rule placeholder */}
      <div
        className="absolute top-3 bottom-5 left-[11px] w-[1.5px]"
        style={{ background: "var(--color-border)" }}
        aria-hidden
      />

      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-3 relative">
          {/* Dot skeleton */}
          <div className="flex-shrink-0 mt-0.5 z-10">
            <Skeleton className="size-[22px] rounded-full" />
          </div>
          {/* Content skeleton */}
          <div className="min-w-0 flex-1 pb-1 space-y-1.5">
            <Skeleton className="h-2.5 w-24" />
            <Skeleton className="h-3 w-[65%] max-w-[220px]" />
            <Skeleton className="h-2.5 w-[45%] max-w-[160px]" />
          </div>
        </div>
      ))}
    </div>
  );
}
