"use client";

/**
 * components/common/TablePagination.tsx
 *
 * Pagination footer. Page state lives in the URL via nuqs
 * ("page" param). Clicking a page chip or Prev/Next updates
 * the URL → triggers Server Component re-render with new searchParams.
 */

import { useQueryState, parseAsInteger } from "nuqs";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface TablePaginationProps {
  /** Total number of records across all pages. */
  totalRows: number;
  /** Number of rows per page. */
  pageSize:  number;
  /**
   * Singular label for the entity (e.g. "patient", "appointment").
   * Shown in "Showing 1 to 8 of 1,284 {entityLabel}s".
   * @default "record"
   */
  entityLabel?:  string;
  /**
   * Maximum page number chips to render before collapsing.
   * @default 5
   */
  maxPageChips?: number;
  className?:    string;
}

export function TablePagination({
  totalRows,
  pageSize,
  entityLabel  = "record",
  maxPageChips = 5,
  className,
}: TablePaginationProps) {
  const [page, setPage] = useQueryState(
    "page",
    parseAsInteger.withDefault(1).withOptions({ shallow: false })
  );

  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const startRow   = Math.min((page - 1) * pageSize + 1, Math.max(totalRows, 1));
  const endRow     = Math.min(page * pageSize, totalRows);

  // ── Page chip window ─────────────────────────────────────────────────────
  const half       = Math.floor(maxPageChips / 2);
  let windowStart  = Math.max(1, page - half);
  const windowEnd  = Math.min(totalPages, windowStart + maxPageChips - 1);
  windowStart      = Math.max(1, windowEnd - maxPageChips + 1);

  const pageChips: number[] = [];
  for (let p = windowStart; p <= windowEnd; p++) pageChips.push(p);

  function goTo(p: number) {
    const clamped = Math.max(1, Math.min(totalPages, p));
    setPage(clamped);
  }

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

        <NavButton onClick={() => goTo(page - 1)} disabled={page <= 1}>
          <ChevronLeft size={13} />
          Previous
        </NavButton>

        {windowStart > 1 && (
          <>
            <PageChip pageNum={1}         currentPage={page} onClick={goTo} />
            {windowStart > 2 && (
              <span className="text-xs px-1" style={{ color: "var(--color-text-muted)" }}>…</span>
            )}
          </>
        )}

        {pageChips.map((p) => (
          <PageChip key={p} pageNum={p} currentPage={page} onClick={goTo} />
        ))}

        {windowEnd < totalPages && (
          <>
            {windowEnd < totalPages - 1 && (
              <span className="text-xs px-1" style={{ color: "var(--color-text-muted)" }}>…</span>
            )}
            <PageChip pageNum={totalPages} currentPage={page} onClick={goTo} />
          </>
        )}

        <NavButton onClick={() => goTo(page + 1)} disabled={page >= totalPages}>
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
  onClick:  () => void;
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
  pageNum:     number;
  currentPage: number;
  onClick:     (page: number) => void;
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
