import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TableDashboardLayoutProps {
  /**
   * Top slot — search / filter chrome. Typically `<TableFilterBar />`, which
   * supports an optional `actions` prop for export or secondary controls.
   * Omit when the page has no list-level filters.
   */
  filters?: ReactNode;
  /**
   * Bottom slot — pagination or summary. Typically `<TablePagination />`.
   * Omit for embedded lists without a footer strip.
   */
  footer?: ReactNode;
  /** Scrollable body — usually a domain table wrapping `<DataTable />`. */
  children: ReactNode;
  className?: string;
}

/**
 * Flex shell for full-page entity list dashboards (`page.tsx` inside
 * `max-w-[1700px]` + `flex-1 min-h-0`): optional fixed header row, a middle
 * region that scrolls (`overflow-y-auto` + `min-h-0` + `scrollbar-hover`) so
 * tall tables do not paint over the footer; `.scrollbar-hover` shows the thumb
 * only while hovering that band and avoids an idle scrollbar gutter so the
 * table lines up with full-width filter and pagination rows.
 *
 * Used by `/patients/dashboard` and `/medicines/dashboard`. New list
 * dashboards with URL-driven filters + pagination should compose the same way.
 */
export function TableDashboardLayout({
  filters,
  footer,
  children,
  className,
}: TableDashboardLayoutProps) {
  return (
    <div
      className={cn("flex w-full flex-col gap-5 flex-1 min-h-0", className)}
    >
      {filters != null ? (
        <div className="shrink-0">{filters}</div>
      ) : null}
      <div className="scrollbar-hover min-h-0 flex-1 overflow-y-auto">
        {children}
      </div>
      {footer != null ? (
        <div className="shrink-0">{footer}</div>
      ) : null}
    </div>
  );
}
