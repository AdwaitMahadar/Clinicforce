"use client";

/**
 * Right-column shell: optional tabbed top zone + always-visible activity log.
 * Colours via CSS variables only — see globals.css.
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
import type { LucideIcon } from "lucide-react";
import { ActivityLog } from "@/components/common/ActivityLog";
import { getEntityActivity } from "@/lib/actions/activity-log";
import type { ActivityLogEntry } from "@/types/activity-log";
import { cn } from "@/lib/utils";

export interface DetailSidebarTab {
  label: string;
  icon?: LucideIcon;
  content: ReactNode;
}

export interface DetailSidebarProps {
  /** When empty or omitted, the top zone is not rendered. */
  tabs?: DetailSidebarTab[];
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
  tabs,
  entries,
  initialHasMore,
  entityType,
  entityId,
  className,
}: DetailSidebarProps) {
  const hasTabs = Boolean(tabs && tabs.length > 0);
  const [activeIndex, setActiveIndex] = useState(0);

  // ── Activity log pagination state ─────────────────────────────────────────
  // Entries accumulate across pages; page 1 comes from SSR.
  const [allEntries, setAllEntries] = useState<ActivityLogEntry[]>(entries);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Use a ref for the current page so handleLoadMore is always stable (no
  // deps that change on every render). This is safe because we only read
  // pageRef.current inside the async callback, never during render.
  const pageRef = useRef(1);
  const isFetchingRef = useRef(false);

  // ── Reset on fresh server data ────────────────────────────────────────────
  // After a mutation, useDetailExit calls router.refresh(), which causes the
  // server to re-render with a fresh `entries` array. The new array reference
  // triggers this effect, discarding any client-accumulated pages so the log
  // always reflects post-mutation state rather than a stale multi-page view.
  useEffect(() => {
    setAllEntries(entries);
    setHasMore(initialHasMore);
    pageRef.current = 1;
    isFetchingRef.current = false;
  }, [entries]); // intentionally omit initialHasMore — it always changes with entries

  // Stable callback — never recreated, so ActivityLog's IntersectionObserver
  // does not disconnect/reconnect whenever state changes.
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
    // On failure: silently stop — hasMore stays true and the user can scroll
    // again; the IntersectionObserver will retry on next intersection.

    setIsLoadingMore(false);
    isFetchingRef.current = false;
  }, [entityType, entityId]); // entityType + entityId are stable per panel mount

  return (
    <div
      className={cn("flex h-full min-h-0 flex-col overflow-hidden", className)}
      style={{
        background: "var(--color-surface-alt)",
        borderLeft: "1px solid var(--color-border)",
      }}
    >
      {hasTabs && (
        <>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div
              className="flex shrink-0 items-center justify-between px-4 py-3"
              style={{
                borderBottom: "1px solid var(--color-border)",
                background: "var(--color-glass-fill)",
              }}
            >
              <div className="flex gap-4">
                {tabs!.map((tab, i) => {
                  const Icon = tab.icon;
                  const active = activeIndex === i;
                  return (
                    <button
                      key={`${tab.label}-${i}`}
                      type="button"
                      onClick={() => setActiveIndex(i)}
                      className="flex items-center gap-1.5 border-b-2 pb-1 text-sm font-semibold capitalize transition-colors"
                      style={{
                        color: active
                          ? "var(--color-text-primary)"
                          : "var(--color-text-muted)",
                        borderColor: active
                          ? "var(--color-text-primary)"
                          : "transparent",
                      }}
                    >
                      {Icon && <Icon size={15} />}
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {tabs![activeIndex]?.content}
            </div>
          </div>

          <div
            className="h-px shrink-0"
            style={{ background: "var(--color-border)" }}
            aria-hidden
          />
        </>
      )}

      <div
        className={cn(
          "flex min-h-0 flex-col overflow-hidden",
          hasTabs ? "shrink-0" : "min-h-0 flex-1"
        )}
        style={
          hasTabs
            ? {
                height: "min(40vh, 320px)",
                maxHeight: "45%",
              }
            : undefined
        }
      >
        <div className="shrink-0 px-5 pb-3 pt-5">
          <p
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: "var(--color-text-muted)" }}
          >
            Activity Log
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden px-5 pb-5">
          <div
            className="flex min-h-0 h-full flex-col overflow-hidden rounded-lg"
            style={{
              background: "var(--color-surface)",
              border:     "1px solid var(--color-border)",
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
      </div>
    </div>
  );
}
