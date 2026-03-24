import { Skeleton } from "@/components/ui/skeleton";
import { PageHeaderSkeleton } from "./PageHeaderSkeleton";

function StatCardSkeleton() {
  return (
    <div
      className="p-5 rounded-xl"
      style={{
        background: "var(--color-glass-fill-data)",
        border: "var(--shadow-card-border)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-[18px] w-[18px] rounded" />
      </div>
      <Skeleton className="h-9 w-20" />
    </div>
  );
}

/**
 * Matches `home/dashboard`: PageHeader, 4 stat cards, 2+1 content grid.
 */
export function HomeDashboardSkeleton() {
  return (
    <div className="p-8 h-full">
      <div className="max-w-[1700px] mx-auto w-full">
        <PageHeaderSkeleton />

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-28" />
            </div>
            <div
              className="rounded-xl overflow-hidden"
              style={{
                background: "var(--color-glass-fill-data)",
                border: "var(--shadow-card-border)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <div
                className="flex gap-3 px-4 py-3"
                style={{
                  borderBottom: "1px solid var(--color-border)",
                  background: "var(--color-row-header)",
                }}
              >
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-3 flex-1 max-w-[120px]" />
                ))}
              </div>
              {Array.from({ length: 5 }).map((_, row) => (
                <div
                  key={row}
                  className="flex gap-3 px-4 py-3.5 items-center"
                  style={{ borderBottom: "1px solid var(--color-border)" }}
                >
                  <Skeleton className="h-3 w-12 shrink-0" />
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                    <Skeleton className="h-4 w-40 max-w-full" />
                  </div>
                  <Skeleton className="h-4 w-24 hidden sm:block" />
                  <Skeleton className="h-6 w-20 rounded-md shrink-0" />
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-3">
              <Skeleton className="h-5 w-36" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex gap-3 p-3 rounded-xl"
                  style={{
                    background: "var(--color-glass-fill-data)",
                    border: "var(--shadow-card-border)",
                    boxShadow: "var(--shadow-card)",
                  }}
                >
                  <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2 min-w-0">
                    <Skeleton className="h-3 w-[75%] max-w-[200px]" />
                    <Skeleton className="h-3 w-1/2 max-w-[120px]" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
