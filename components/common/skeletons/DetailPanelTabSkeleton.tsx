import { Skeleton } from "@/components/ui/skeleton";

/**
 * Fallback for `DetailPanel` inner tab `Suspense` boundaries — matches tab body
 * padding (`px-6 py-4`); token-based only.
 */
export function DetailPanelTabSkeleton() {
  return (
    <div className="space-y-4 px-6 py-4" aria-hidden>
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24 rounded" />
        <Skeleton className="h-7 w-20 rounded-md" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="h-[72px] w-full rounded-lg" />
        <Skeleton className="h-[72px] w-full rounded-lg" />
      </div>
      <Skeleton className="h-3 w-full max-w-md rounded" />
    </div>
  );
}
