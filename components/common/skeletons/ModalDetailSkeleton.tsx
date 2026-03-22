import { Skeleton } from "@/components/ui/skeleton";

/**
 * Matches `ModalShell` xl footprint while async modal pages load.
 * Backdrop + centred panel (same dimensions as `ModalShell` size xl).
 */
export function ModalDetailSkeleton() {
  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{
          background: "rgba(26, 26, 24, 0.35)",
          backdropFilter: "blur(3px)",
          WebkitBackdropFilter: "blur(3px)",
        }}
        aria-hidden
      />
      <div
        className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-8"
        aria-busy
        role="dialog"
        aria-label="Loading"
      >
        <div
          className="pointer-events-auto rounded-2xl overflow-hidden flex flex-col gap-4 p-6 sm:p-8 w-full animate-in fade-in-0 zoom-in-95 duration-200"
          style={{
            width: "min(92vw, 1650px)",
            height: "min(90vh, 1080px)",
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            boxShadow:
              "0 24px 64px -12px rgba(0,0,0,0.18), 0 8px 24px -4px rgba(0,0,0,0.08)",
          }}
        >
          <div className="flex items-center justify-between gap-4 shrink-0">
            <Skeleton className="h-8 w-64 max-w-[70%]" />
            <Skeleton className="h-9 w-9 rounded-md shrink-0" />
          </div>
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden">
            <div className="lg:col-span-4 space-y-4 overflow-y-auto min-h-0 pr-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
              ))}
            </div>
            <div className="lg:col-span-5 space-y-4 hidden lg:flex flex-col min-h-0">
              <Skeleton className="h-8 w-40 shrink-0" />
              <Skeleton className="flex-1 min-h-[240px] w-full rounded-xl" />
            </div>
            <div className="lg:col-span-3 space-y-4 hidden lg:flex flex-col min-h-0">
              <Skeleton className="h-36 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
