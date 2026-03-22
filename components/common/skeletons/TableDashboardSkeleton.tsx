import { Skeleton } from "@/components/ui/skeleton";
import { PageHeaderSkeleton } from "./PageHeaderSkeleton";

interface TableDashboardSkeletonProps {
  /** Patients table uses 6 columns; medicines uses 4 */
  columnCount?: number;
  /** Approximate body rows */
  rowCount?: number;
}

/**
 * Matches `patients/dashboard` and `medicines/dashboard`: PageHeader,
 * filter bar, DataTable-shaped block, pagination strip.
 */
export function TableDashboardSkeleton({
  columnCount = 6,
  rowCount = 8,
}: TableDashboardSkeletonProps) {
  return (
    <div className="p-8 h-full flex flex-col gap-5">
      <PageHeaderSkeleton />

      <Skeleton className="h-[52px] w-full rounded-xl shrink-0" />

      <div className="flex-1 min-h-0 flex flex-col">
        <div
          className="rounded-xl overflow-hidden flex flex-col flex-1 min-h-0"
          style={{
            background: "var(--color-glass-fill-data)",
            border: "var(--shadow-card-border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div
            className="flex gap-3 px-4 py-3 shrink-0"
            style={{
              borderBottom: "1px solid var(--color-border)",
              background: "var(--color-row-header)",
            }}
          >
            {Array.from({ length: columnCount }).map((_, i) => (
              <Skeleton key={i} className="h-3 flex-1 max-w-[100px]" />
            ))}
          </div>
          <div className="flex-1 min-h-0">
            {Array.from({ length: rowCount }).map((_, row) => (
              <div
                key={row}
                className="flex gap-3 px-4 py-3.5"
                style={{ borderBottom: "1px solid var(--color-border)" }}
              >
                {Array.from({ length: columnCount }).map((_, col) => (
                  <Skeleton key={col} className="h-4 flex-1" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <Skeleton className="h-4 w-56" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
      </div>
    </div>
  );
}
