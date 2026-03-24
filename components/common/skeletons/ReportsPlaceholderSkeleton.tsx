import { Skeleton } from "@/components/ui/skeleton";
import { PageHeaderSkeleton } from "./PageHeaderSkeleton";

/**
 * Matches entity reports placeholder pages: PageHeader + dashed card area.
 */
export function ReportsPlaceholderSkeleton() {
  return (
    <div className="p-8 h-full">
      <div className="max-w-[1700px] mx-auto w-full">
        <PageHeaderSkeleton showActions={false} />
        <div
          className="flex flex-col items-center justify-center gap-4 h-64 rounded-xl border-2 border-dashed px-6"
          style={{ borderColor: "var(--color-border)" }}
        >
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-64 max-w-full" />
        </div>
      </div>
    </div>
  );
}
