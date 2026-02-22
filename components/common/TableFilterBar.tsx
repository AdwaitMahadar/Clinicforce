"use client";

import { useState, useRef, useEffect } from "react";
import { Search, ListFilter, ArrowUpDown, Download, Plus, X, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────────

/** Describes a column that can be filtered. */
export interface FilterColumn {
  /** The field key on the data row — used as the filter identifier. */
  key: string;
  /** Human-readable label shown in the column picker. */
  label: string;
  /** Type of filter control to render for this column. */
  type: "select" | "text";
  /** Required when type = "select". Each option has a display label and a raw value. */
  options?: { label: string; value: string }[];
}

/** One active filter row. */
export interface ActiveFilter {
  /** Matches FilterColumn.key */
  columnKey: string;
  /** Raw value to filter against. */
  value: string;
}

interface TableFilterBarProps {
  // ── Search ──────────────────────────────────────────────────────────────────
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;

  // ── Filters ─────────────────────────────────────────────────────────────────
  /** All columns that can be filtered. Pass an empty array to hide the filter button. */
  filterColumns: FilterColumn[];
  activeFilters: ActiveFilter[];
  onFiltersChange: (filters: ActiveFilter[]) => void;

  // ── Export ──────────────────────────────────────────────────────────────────
  onExport?: () => void;

  // ── Extra actions (right side) ───────────────────────────────────────────────
  actions?: React.ReactNode;

  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * A fully reusable search + filter + export bar for any data table.
 *
 * Filters use a Notion-style collapsible panel: click "Filter" to reveal
 * rows where you pick a column and a value. Multiple filter rows stack up,
 * and each can be removed individually. The button shows a count badge when
 * filters are active.
 *
 * @example
 * ```tsx
 * <TableFilterBar
 *   searchValue={search}
 *   onSearchChange={setSearch}
 *   searchPlaceholder="Search patients..."
 *   filterColumns={PATIENT_FILTER_COLUMNS}
 *   activeFilters={filters}
 *   onFiltersChange={setFilters}
 *   onExport={() => console.log("export")}
 * />
 * ```
 */
export function TableFilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  filterColumns,
  activeFilters,
  onFiltersChange,
  onExport,
  actions,
  className,
}: TableFilterBarProps) {
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [columnPickerOpen, setColumnPickerOpen] = useState<number | null>(null);
  const [valuePickerOpen, setValuePickerOpen]   = useState<number | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const hasFilters = activeFilters.length > 0;

  // ── Close pickers when clicking outside the bar ────────────────────────────
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setColumnPickerOpen(null);
        setValuePickerOpen(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Filter mutation helpers ────────────────────────────────────────────────

  function addFilter() {
    const firstCol = filterColumns[0];
    if (!firstCol) return;
    onFiltersChange([
      ...activeFilters,
      { columnKey: firstCol.key, value: "" },
    ]);
  }

  function removeFilter(index: number) {
    onFiltersChange(activeFilters.filter((_, i) => i !== index));
  }

  function updateFilterColumn(index: number, newColumnKey: string) {
    onFiltersChange(
      activeFilters.map((f, i) =>
        i === index ? { columnKey: newColumnKey, value: "" } : f
      )
    );
    setColumnPickerOpen(null);
    setValuePickerOpen(null);
  }

  function updateFilterValue(index: number, newValue: string) {
    onFiltersChange(
      activeFilters.map((f, i) =>
        i === index ? { ...f, value: newValue } : f
      )
    );
    setValuePickerOpen(null);
  }

  function clearAll() {
    onFiltersChange([]);
  }

  return (
    <div ref={barRef} className={cn("", className)}>
      {/* ── Top bar row ──────────────────────────────────────────────────────── */}
      <div
        className="flex flex-col sm:flex-row items-center gap-3 p-3 rounded-xl"
        style={{
          background: "var(--color-glass-fill-data)",
          border:     "var(--shadow-card-border)",
          boxShadow:  "var(--shadow-card)",
          // Round bottom corners only when panel is closed
          borderRadius: filterPanelOpen ? "0.75rem 0.75rem 0 0" : "0.75rem",
        }}
      >
        {/* Search input */}
        <div className="relative flex-1 w-full">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--color-text-muted)" }}
          />
          <Input
            placeholder={searchPlaceholder}
            className="pl-9 text-sm h-9"
            style={{
              background:  "var(--color-surface-alt)",
              borderColor: "var(--color-border)",
              color:       "var(--color-text-primary)",
            }}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Right-side controls */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Filter toggle — only shown if filterColumns exist */}
          {filterColumns.length > 0 && (
            <button
              className={cn(
                "flex items-center gap-2 px-3 py-[7px] rounded-lg text-sm font-medium transition-colors",
                hasFilters && "ring-1"
              )}
              style={{
                background:  filterPanelOpen || hasFilters
                  ? "var(--color-surface-alt)"
                  : "var(--color-surface)",
                border:      "1px solid var(--color-border)",
                color:       filterPanelOpen || hasFilters
                  ? "var(--color-text-primary)"
                  : "var(--color-text-secondary)",
                ringColor: hasFilters ? "var(--color-border)" : undefined,
              }}
              onClick={() => {
                setFilterPanelOpen((o) => !o);
                // Open panel + add first row if no filters yet
                if (!filterPanelOpen && activeFilters.length === 0) {
                  addFilter();
                }
              }}
            >
              <ListFilter size={13} />
              Filter
              {hasFilters && (
                <span
                  className="flex items-center justify-center size-4 rounded-full text-[10px] font-bold"
                  style={{
                    background: "var(--color-ink)",
                    color:      "var(--color-ink-fg)",
                  }}
                >
                  {activeFilters.length}
                </span>
              )}
            </button>
          )}

          {/* Sort button (structural — wired to server-side sort in Phase 3) */}
          <button
            className="flex items-center gap-2 px-3 py-[7px] rounded-lg text-sm font-medium transition-colors"
            style={{
              background:  "var(--color-surface)",
              border:      "1px solid var(--color-border)",
              color:       "var(--color-text-secondary)",
            }}
          >
            <ArrowUpDown size={13} />
            Sort
          </button>

          {/* Export */}
          {onExport && (
            <button
              className="flex items-center justify-center size-9 rounded-lg transition-colors"
              style={{
                background:  "var(--color-surface)",
                border:      "1px solid var(--color-border)",
                color:       "var(--color-text-secondary)",
              }}
              title="Export"
              onClick={onExport}
            >
              <Download size={14} />
            </button>
          )}

          {/* Extra action slot */}
          {actions}
        </div>
      </div>

      {/* ── Filter panel (Notion-style) ───────────────────────────────────────── */}
      {filterPanelOpen && (
        <div
          className="px-4 py-3 rounded-b-xl"
          style={{
            background:  "var(--color-glass-fill-data)",
            borderLeft:  "var(--shadow-card-border)",
            borderRight: "var(--shadow-card-border)",
            borderBottom:"var(--shadow-card-border)",
            borderTop:   "1px solid var(--color-border)",
            boxShadow:   "var(--shadow-card)",
          }}
        >
          <div className="flex flex-col gap-2">
            {activeFilters.length === 0 && (
              <p className="text-xs py-1" style={{ color: "var(--color-text-muted)" }}>
                No filters applied — add one below.
              </p>
            )}

            {/* ── Filter rows ──────────────────────────────────────────────── */}
            {activeFilters.map((filter, idx) => {
              const selectedCol = filterColumns.find((c) => c.key === filter.columnKey);
              return (
                <FilterRow
                  key={idx}
                  index={idx}
                  filter={filter}
                  selectedCol={selectedCol}
                  filterColumns={filterColumns}
                  columnPickerOpen={columnPickerOpen === idx}
                  valuePickerOpen={valuePickerOpen === idx}
                  onToggleColumnPicker={() =>
                    setColumnPickerOpen((o) => (o === idx ? null : idx))
                  }
                  onToggleValuePicker={() =>
                    setValuePickerOpen((o) => (o === idx ? null : idx))
                  }
                  onColumnChange={(key) => updateFilterColumn(idx, key)}
                  onValueChange={(val) => updateFilterValue(idx, val)}
                  onRemove={() => removeFilter(idx)}
                />
              );
            })}

            {/* ── Bottom actions ───────────────────────────────────────────── */}
            <div className="flex items-center gap-3 pt-1">
              <button
                className="flex items-center gap-1.5 text-xs font-medium transition-colors"
                style={{ color: "var(--color-text-secondary)" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "var(--color-text-primary)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "var(--color-text-secondary)")
                }
                onClick={addFilter}
              >
                <Plus size={12} />
                Add filter
              </button>

              {hasFilters && (
                <>
                  <span style={{ color: "var(--color-border)" }}>·</span>
                  <button
                    className="text-xs font-medium transition-colors"
                    style={{ color: "var(--color-text-muted)" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "var(--color-red)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "var(--color-text-muted)")
                    }
                    onClick={clearAll}
                  >
                    Clear all
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-component: one filter row ────────────────────────────────────────────

interface FilterRowProps {
  index: number;
  filter: ActiveFilter;
  selectedCol: FilterColumn | undefined;
  filterColumns: FilterColumn[];
  columnPickerOpen: boolean;
  valuePickerOpen: boolean;
  onToggleColumnPicker: () => void;
  onToggleValuePicker: () => void;
  onColumnChange: (key: string) => void;
  onValueChange: (val: string) => void;
  onRemove: () => void;
}

function FilterRow({
  filter,
  selectedCol,
  filterColumns,
  columnPickerOpen,
  valuePickerOpen,
  onToggleColumnPicker,
  onToggleValuePicker,
  onColumnChange,
  onValueChange,
  onRemove,
}: FilterRowProps) {
  return (
    <div className="flex items-center gap-2 text-sm">

      {/* ── WHERE label ────────────────────────────────────────────────────── */}
      <span
        className="text-[11px] font-semibold uppercase tracking-wide w-10 text-right shrink-0"
        style={{ color: "var(--color-text-muted)" }}
      >
        Where
      </span>

      {/* ── Column picker ────────────────────────────────────────────────── */}
      <div className="relative">
        <button
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{
            background:  "var(--color-surface-alt)",
            border:      "1px solid var(--color-border)",
            color:       "var(--color-text-primary)",
          }}
          onClick={onToggleColumnPicker}
        >
          {selectedCol?.label ?? "Column"}
          <ChevronDown size={11} className="opacity-50" />
        </button>
        {columnPickerOpen && (
          <PickerDropdown>
            {filterColumns.map((col) => (
              <PickerOption
                key={col.key}
                label={col.label}
                active={col.key === filter.columnKey}
                onClick={() => onColumnChange(col.key)}
              />
            ))}
          </PickerDropdown>
        )}
      </div>

      {/* ── Operator (fixed "is" for now) ─────────────────────────────────── */}
      <span
        className="text-xs font-medium px-2 shrink-0"
        style={{ color: "var(--color-text-muted)" }}
      >
        is
      </span>

      {/* ── Value picker / input ─────────────────────────────────────────── */}
      <div className="relative">
        {selectedCol?.type === "select" ? (
          <>
            <button
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                background:  "var(--color-surface-alt)",
                border:      "1px solid var(--color-border)",
                color:       filter.value ? "var(--color-text-primary)" : "var(--color-text-muted)",
              }}
              onClick={onToggleValuePicker}
            >
              {selectedCol.options?.find((o) => o.value === filter.value)?.label
                ?? "Select value"}
              <ChevronDown size={11} className="opacity-50" />
            </button>
            {valuePickerOpen && selectedCol.options && (
              <PickerDropdown>
                {selectedCol.options.map((opt) => (
                  <PickerOption
                    key={opt.value}
                    label={opt.label}
                    active={opt.value === filter.value}
                    onClick={() => onValueChange(opt.value)}
                  />
                ))}
              </PickerDropdown>
            )}
          </>
        ) : (
          <input
            type="text"
            placeholder="Value..."
            className="px-2.5 py-1.5 rounded-lg text-xs outline-none transition-colors"
            style={{
              background:  "var(--color-surface-alt)",
              border:      "1px solid var(--color-border)",
              color:       "var(--color-text-primary)",
              minWidth:    "140px",
            }}
            value={filter.value}
            onChange={(e) => onValueChange(e.target.value)}
          />
        )}
      </div>

      {/* ── Remove row ─────────────────────────────────────────────────────── */}
      <button
        className="flex items-center justify-center size-6 rounded-md transition-colors ml-1 shrink-0"
        style={{ color: "var(--color-text-muted)" }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "var(--color-red-bg)";
          (e.currentTarget as HTMLButtonElement).style.color      = "var(--color-red)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
          (e.currentTarget as HTMLButtonElement).style.color      = "var(--color-text-muted)";
        }}
        onClick={onRemove}
        title="Remove filter"
      >
        <X size={12} />
      </button>
    </div>
  );
}

// ─── Shared picker primitives ─────────────────────────────────────────────────

function PickerDropdown({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="absolute left-0 top-full mt-1 z-50 rounded-xl py-1 min-w-[140px] overflow-hidden"
      style={{
        background: "var(--color-surface)",
        border:     "1px solid var(--color-border)",
        boxShadow:  "var(--shadow-main)",
      }}
    >
      {children}
    </div>
  );
}

function PickerOption({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="w-full text-left px-3 py-1.5 text-xs transition-colors"
      style={{
        color:      active ? "var(--color-text-primary)"  : "var(--color-text-secondary)",
        background: active ? "var(--color-surface-alt)"   : "transparent",
        fontWeight: active ? "600"                         : "400",
      }}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
