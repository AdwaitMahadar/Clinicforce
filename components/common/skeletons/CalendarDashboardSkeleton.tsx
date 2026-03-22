import { Skeleton } from "@/components/ui/skeleton";

/**
 * Matches `AppointmentCalendarClient`: padded column, PageHeader row with
 * toolbar + primary action, large glass calendar card.
 */
export function CalendarDashboardSkeleton() {
  return (
    <div className="p-8 h-full flex flex-col gap-5 min-h-0">
      <div className="flex items-start justify-between mb-8 pt-1 gap-4 flex-wrap">
        <div className="space-y-2 min-w-0 flex-1">
          <Skeleton className="h-9 w-52 max-w-[min(100%,16rem)]" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>
        <div className="flex items-center gap-2 ml-auto shrink-0 flex-wrap">
          <Skeleton className="h-9 w-[min(100%,280px)] rounded-lg" />
          <Skeleton className="h-9 w-[120px] rounded-md" />
        </div>
      </div>

      <div
        className="flex-1 min-h-0 rounded-xl overflow-hidden flex flex-col"
        style={{
          background: "var(--color-glass-fill-data)",
          border: "var(--shadow-card-border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div
          className="flex items-center justify-between gap-2 px-4 py-3 border-b shrink-0"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div className="flex gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-10 rounded-md" />
            ))}
          </div>
          <Skeleton className="h-8 w-32 rounded-md hidden sm:block" />
        </div>
        <div className="flex-1 min-h-[240px] p-4 grid grid-cols-7 gap-2 auto-rows-fr">
          {Array.from({ length: 28 }).map((_, i) => (
            <Skeleton key={i} className="min-h-[48px] rounded-md opacity-80" />
          ))}
        </div>
      </div>
    </div>
  );
}
