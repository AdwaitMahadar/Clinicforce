"use client";

/**
 * app/(app)/home/_components/HomeDashboardActivityFeed.tsx
 *
 * Client wrapper around <ActivityLog> for the home dashboard "Recent Activity"
 * section. Receives page-1 entries from the SSR parent and fetches subsequent
 * pages client-side via getRecentActivity when the IntersectionObserver
 * sentinel fires.
 *
 * Pagination mirrors DetailSidebar's pattern exactly:
 *   - pageRef (not state) keeps handleLoadMore stable across renders
 *   - isFetchingRef prevents concurrent fetches
 *   - allEntries accumulates across pages (append-only)
 *   - Silent retry on failure (hasMore stays true)
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { ActivityLog } from "@/components/common/ActivityLog";
import { getRecentActivity } from "@/lib/actions/activity-log";
import type { ActivityLogEntry } from "@/types/activity-log";

interface Props {
  /** Page-1 entries from the server. */
  entries: ActivityLogEntry[];
  /** Whether the server has more pages beyond the initial batch. */
  initialHasMore: boolean;
}

export function HomeDashboardActivityFeed({ entries, initialHasMore }: Props) {
  const [allEntries, setAllEntries] = useState<ActivityLogEntry[]>(entries);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const pageRef = useRef(1);
  const isFetchingRef = useRef(false);

  // Reset whenever the server delivers a fresh entries array (after router.refresh()).
  useEffect(() => {
    setAllEntries(entries);
    setHasMore(initialHasMore);
    pageRef.current = 1;
    isFetchingRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `initialHasMore` tracks the same SSR batch as `entries`
  }, [entries]);

  // Stable callback — never recreated so ActivityLog's IntersectionObserver
  // does not disconnect/reconnect on every state change.
  const handleLoadMore = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsLoadingMore(true);

    const nextPage = pageRef.current + 1;
    const result = await getRecentActivity({ page: nextPage });

    if (result.success) {
      pageRef.current = nextPage;
      setAllEntries((prev) => [...prev, ...result.data.entries]);
      setHasMore(result.data.hasMore);
    }
    // On failure: silently stop — hasMore stays true for retry on next scroll.

    setIsLoadingMore(false);
    isFetchingRef.current = false;
  }, []); // no deps — pageRef/isFetchingRef are refs, getRecentActivity is a stable import

  return (
    <ActivityLog
      entries={allEntries}
      hasMore={hasMore}
      onLoadMore={handleLoadMore}
      isLoading={isLoadingMore}
    />
  );
}
