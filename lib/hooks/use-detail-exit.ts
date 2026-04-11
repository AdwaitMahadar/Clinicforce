"use client";

import { startTransition, useCallback } from "react";
import { useRouter } from "next/navigation";

/**
 * Shared post-mutation navigation for entity detail panels (modal + full-page).
 * Modal wrappers pass `onClose` (typically `router.back()`); full-page omits it
 * and uses `router.replace(listHref)` so direct URLs work without history.
 *
 * Modal path: `router.back()` schedules navigation; calling `router.refresh()` in
 * the same synchronous turn can refresh before the URL tree matches the visible
 * dashboard. Wrapping `onClose()` and `router.refresh()` in `startTransition`
 * marks both updates as a single concurrent transition so React coordinates them
 * instead of relying on an arbitrary timeout.
 */
export function useDetailExit({
  listHref,
  onClose,
}: {
  listHref: string;
  onClose?: () => void;
}) {
  const router = useRouter();

  const exitAfterMutation = useCallback(() => {
    if (onClose) {
      startTransition(() => {
        onClose();
        router.refresh();
      });
    } else {
      router.replace(listHref);
      router.refresh();
    }
  }, [listHref, onClose, router]);

  return { exitAfterMutation };
}
