import { Skeleton } from "@/components/ui/skeleton";

interface DetailPageSkeletonProps {
  /** Breadcrumb line: two short segments for "Entity › Name" */
  breadcrumbSegments?: number;
}

/**
 * Matches full-page new and view routes: breadcrumb + glass panel.
 */
export function DetailPageSkeleton({ breadcrumbSegments = 2 }: DetailPageSkeletonProps) {
  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-6">
        {Array.from({ length: breadcrumbSegments }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            {i > 0 && (
              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                ›
              </span>
            )}
            <Skeleton className="h-3 w-24 sm:w-32" />
          </div>
        ))}
      </div>

      <div
        className="flex-1 rounded-2xl overflow-hidden flex flex-col min-h-[320px] p-6 sm:p-8 gap-6"
        style={{
          background: "var(--color-glass-fill-data)",
          border: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 gap-y-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t mt-auto" style={{ borderColor: "var(--color-border)" }}>
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      </div>
    </div>
  );
}
