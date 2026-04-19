"use client";

/**
 * Right column: optional top slot (e.g. appointment patient summary) + activity log.
 * Colours via CSS variables only — see globals.css.
 *
 * With `topSlot` (appointment detail): sidebar height splits 40% / 60% between the
 * slot and the activity log; the slot scrolls internally on overflow.
 * Without `topSlot`: activity log uses the full column height.
 *
 * Phase 6+: ActivityLog pagination is fully wired.
 *   - Page 1 entries arrive via SSR (entries / initialHasMore props).
 *   - Subsequent pages are fetched client-side via getEntityActivity when
 *     ActivityLog's IntersectionObserver sentinel fires at the bottom.
 *   - Each page's entries are appended to the local accumulation — no replace.
 *   - handleLoadMore is stable (useCallback with no deps that change on render);
 *     page is tracked in a ref so the callback never goes stale.
 */

import { useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { ActivityLog } from "@/components/common/ActivityLog";
import { getEntityActivity } from "@/lib/actions/activity-log";
import type { ActivityLogEntry } from "@/types/activity-log";
import { cn } from "@/lib/utils";

export interface DetailSidebarProps {
  /** Optional region above the activity log (appointment patient card, etc.). */
  topSlot?: ReactNode;
  /** Initial activity log entries from SSR (page 1). */
  entries: ActivityLogEntry[];
  /** Whether the server returned more entries beyond the initial page. */
  initialHasMore: boolean;
  /** Entity type for getEntityActivity pagination fetches. */
  entityType: "patient" | "appointment" | "medicine" | "document" | "user";
  /** Entity ID for getEntityActivity pagination fetches. */
  entityId: string;
  className?: string;
}

export function DetailSidebar({
  topSlot,
  entries,
  initialHasMore,
  entityType,
  entityId,
  className,
}: DetailSidebarProps) {
  // ── Activity log pagination state ─────────────────────────────────────────
  const [allEntries, setAllEntries] = useState<ActivityLogEntry[]>(entries);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const pageRef = useRef(1);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    setAllEntries(entries);
    setHasMore(initialHasMore);
    pageRef.current = 1;
    isFetchingRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initialHasMore always tracks entries
  }, [entries]);

  const handleLoadMore = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsLoadingMore(true);

    const nextPage = pageRef.current + 1;
    const result = await getEntityActivity({ entityType, entityId, page: nextPage });

    if (result.success) {
      pageRef.current = nextPage;
      setAllEntries((prev) => [...prev, ...result.data.entries]);
      setHasMore(result.data.hasMore);
    }

    setIsLoadingMore(false);
    isFetchingRef.current = false;
  }, [entityType, entityId]);

  const activityLogBody = (
    <>
      <div className="shrink-0 px-4 pb-2 pt-1">
        <p
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: "var(--color-text-muted)" }}
        >
          Activity Log
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden px-4 pb-4">
        <div
          className="flex min-h-0 h-full flex-col overflow-hidden rounded-lg"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div className="min-h-0 flex-1 overflow-y-auto p-3 scrollbar-hover">
            <ActivityLog
              entries={allEntries}
              hasMore={hasMore}
              onLoadMore={handleLoadMore}
              isLoading={isLoadingMore}
              className="h-full"
            />
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div
      className={cn("flex h-full min-h-0 flex-col overflow-hidden", className)}
      style={{
        background: "var(--color-surface-alt)",
        borderLeft: "1px solid var(--color-border)",
      }}
    >
      {topSlot ? (
        <div className="grid h-full min-h-0 grid-rows-[minmax(0,2fr)_minmax(0,3fr)] overflow-hidden">
          <div className="min-h-0 flex flex-col overflow-hidden px-4 pb-2 pt-4">
            <div className="scrollbar-hover min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
              {topSlot}
            </div>
          </div>
          <div className="flex min-h-0 flex-col overflow-hidden">{activityLogBody}</div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{activityLogBody}</div>
      )}
    </div>
  );
}
