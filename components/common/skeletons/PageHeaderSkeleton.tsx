import { Skeleton } from "@/components/ui/skeleton";

interface PageHeaderSkeletonProps {
  /** Primary action button (e.g. New Patient) */
  showActions?: boolean;
}

/**
 * Mirrors `PageHeader` spacing (`mb-8 pt-1`) for loading states.
 */
export function PageHeaderSkeleton({ showActions = true }: PageHeaderSkeletonProps) {
  return (
    <div className="flex items-start justify-between mb-8 pt-1">
      <div className="space-y-2 min-w-0 flex-1">
        <Skeleton className="h-9 w-48 max-w-[min(100%,20rem)]" />
        <Skeleton className="h-4 w-[min(100%,28rem)] max-w-full" />
      </div>
      {showActions && (
        <div className="flex items-center gap-2 ml-4 shrink-0">
          <Skeleton className="h-9 w-[140px] rounded-md" />
        </div>
      )}
    </div>
  );
}
