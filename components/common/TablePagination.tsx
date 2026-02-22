"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface TablePaginationProps {
  /** Current 1-indexed page number. */
  page: number;
  /** Total number of records across all pages. */
  totalRows: number;
  /** Number of rows per page. */
  pageSize: number;
  /** Called when the user navigates to a new page. */
  onPageChange: (page: number) => void;
  /**
   * Singular label for the entity (e.g. "patient", "appointment").
   * Shown in "Showing 1 to 8 of 1,284 {entityLabel}s".
   * Default: "record"
   */
  entityLabel?: string;
  /**
   * Maximum page number chips to render before collapsing.
   * Default: 5
   */
  maxPageChips?: number;
  className?: string;
}

/**
 * Reusable pagination footer for all data tables.
 *
 * Renders a "Showing X to Y of N {label}s" summary on the left and
 * Previous / page-chip / Next controls on the right.
 * All values come from props — nothing is hardcoded.
 *
 * @example
 * ```tsx
 * <TablePagination
 *   page={page}
 *   totalRows={1284}
 *   pageSize={8}
 *   onPageChange={setPage}
 *   entityLabel="patient"
 * />
 * ```
 */
export function TablePagination({
  page,
  totalRows,
  pageSize,
  onPageChange,
  entityLabel = "record",
  maxPageChips = 5,
  className,
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const startRow   = Math.min((page - 1) * pageSize + 1, totalRows);
  const endRow     = Math.min(page * pageSize, totalRows);

  // ── Page chip window calculation ─────────────────────────────────────────
  // Centre the current page in the chip window when possible.
  const half       = Math.floor(maxPageChips / 2);
  let windowStart  = Math.max(1, page - half);
  const windowEnd  = Math.min(totalPages, windowStart + maxPageChips - 1);
  // Shift left if we hit the right boundary
  windowStart      = Math.max(1, windowEnd - maxPageChips + 1);

  const pageChips: number[] = [];
  for (let p = windowStart; p <= windowEnd; p++) pageChips.push(p);

  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-3 rounded-xl",
        className
      )}
      style={{
        background: "var(--color-glass-fill-data)",
        border:     "var(--shadow-card-border)",
        boxShadow:  "var(--shadow-card)",
      }}
    >
      {/* ── Summary label ──────────────────────────────────────────────────── */}
      <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
        Showing{" "}
        <Bold>{startRow.toLocaleString()}</Bold> to{" "}
        <Bold>{endRow.toLocaleString()}</Bold> of{" "}
        <Bold>{totalRows.toLocaleString()}</Bold>{" "}
        {entityLabel}{totalRows !== 1 ? "s" : ""}
      </p>

      {/* ── Navigation ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5">

        {/* Previous */}
        <NavButton
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
        >
          <ChevronLeft size={13} />
          Previous
        </NavButton>

        {/* Leading ellipsis */}
        {windowStart > 1 && (
          <>
            <PageChip pageNum={1} currentPage={page} onClick={onPageChange} />
            {windowStart > 2 && (
              <span
                className="text-xs px-1"
                style={{ color: "var(--color-text-muted)" }}
              >
                …
              </span>
            )}
          </>
        )}

        {/* Page chips */}
        {pageChips.map((p) => (
          <PageChip key={p} pageNum={p} currentPage={page} onClick={onPageChange} />
        ))}

        {/* Trailing ellipsis */}
        {windowEnd < totalPages && (
          <>
            {windowEnd < totalPages - 1 && (
              <span
                className="text-xs px-1"
                style={{ color: "var(--color-text-muted)" }}
              >
                …
              </span>
            )}
            <PageChip
              pageNum={totalPages}
              currentPage={page}
              onClick={onPageChange}
            />
          </>
        )}

        {/* Next */}
        <NavButton
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
        >
          Next
          <ChevronRight size={13} />
        </NavButton>
      </div>
    </div>
  );
}

// ─── Internal primitives ──────────────────────────────────────────────────────

function Bold({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>
      {children}
    </span>
  );
}

function NavButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: "var(--color-surface)",
        border:     "1px solid var(--color-border)",
        color:      "var(--color-text-secondary)",
      }}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function PageChip({
  pageNum,
  currentPage,
  onClick,
}: {
  pageNum: number;
  currentPage: number;
  onClick: (page: number) => void;
}) {
  const isActive = pageNum === currentPage;
  return (
    <button
      className="size-7 rounded-lg text-xs font-medium transition-colors"
      style={{
        background: isActive ? "var(--color-ink)"          : "transparent",
        color:      isActive ? "var(--color-ink-fg)"        : "var(--color-text-secondary)",
        border:     isActive ? "1px solid var(--color-ink)" : "1px solid transparent",
      }}
      onClick={() => onClick(pageNum)}
    >
      {pageNum}
    </button>
  );
}
