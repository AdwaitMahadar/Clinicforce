"use client";

/**
 * components/common/TableFilterBar.tsx
 *
 * Search + filter bar. All search and per-filter state lives in the URL
 * via nuqs. Changing any value updates the URL → Next.js re-renders the
 * parent Server Component with new searchParams → server action is called.
 *
 * Dropdown-open/closed state stays in useState because it has no data
 * or shareability implications.
 */

import { useState, useRef, useEffect } from "react";
import { useQueryState, parseAsString, parseAsInteger } from "nuqs";
import { Search, ListFilter, ArrowUpDown, Download, Plus, X, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────────

/** Describes a filterable column. */
export interface FilterColumn {
  /** URL param key — used as the nuqs key. */
  key:      string;
  /** Human-readable label shown in the column picker. */
  label:    string;
  type:     "select" | "text";
  options?: { label: string; value: string }[];
}

/** One active filter row (used only locally for the panel UI). */
export interface ActiveFilter {
  columnKey: string;
  value:     string;
}

interface TableFilterBarProps {
  searchPlaceholder?: string;
  /** All columns that can be filtered. Empty array hides the Filter button. */
  filterColumns:      FilterColumn[];
  actions?:           React.ReactNode;
  className?:         string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TableFilterBar({
  searchPlaceholder = "Search...",
  filterColumns,
  actions,
  className,
}: TableFilterBarProps) {
  // ── URL state (nuqs) ───────────────────────────────────────────────────────
  const [search, setSearch] = useQueryState(
    "search",
    parseAsString.withDefault("").withOptions({ shallow: false })
  );
  const [, setPage] = useQueryState(
    "page",
    parseAsInteger.withDefault(1).withOptions({ shallow: false })
  );

  // One nuqs state per filterable column — stored individually so each filter
  // maps to its own clear URL param (e.g. ?category=Antibiotics&status=active).
  // We build the per-column hooks dynamically by rendering a sub-component.

  // ── UI-only state ──────────────────────────────────────────────────────────
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [columnPickerOpen, setColumnPickerOpen] = useState<number | null>(null);
  const [valuePickerOpen,  setValuePickerOpen]  = useState<number | null>(null);
  const [localFilters, setLocalFilters] = useState<ActiveFilter[]>([]);

  const barRef = useRef<HTMLDivElement>(null);

  const hasFilters = localFilters.some((f) => f.value !== "");

  // ── Close pickers on outside click ────────────────────────────────────────
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setColumnPickerOpen(null);
        setValuePickerOpen(null);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Search handler ─────────────────────────────────────────────────────────
  function handleSearchChange(value: string) {
    setSearch(value || null);   // null removes the param from URL when empty
    setPage(1);                 // always reset page on search change
  }

  // ── Filter panel helpers ───────────────────────────────────────────────────

  function addFilter() {
    const firstCol = filterColumns[0];
    if (!firstCol) return;
    setLocalFilters((prev) => [...prev, { columnKey: firstCol.key, value: "" }]);
  }

  function removeFilter(index: number) {
    const removed = localFilters[index];
    setLocalFilters((prev) => prev.filter((_, i) => i !== index));
    // Clear the URL param for that column
    if (removed) applyFilter(removed.columnKey, "");
  }

  function updateFilterColumn(index: number, newColumnKey: string) {
    const old = localFilters[index];
    if (old) applyFilter(old.columnKey, ""); // clear old column param
    setLocalFilters((prev) =>
      prev.map((f, i) => (i === index ? { columnKey: newColumnKey, value: "" } : f))
    );
    setColumnPickerOpen(null);
    setValuePickerOpen(null);
  }

  function updateFilterValue(index: number, newValue: string) {
    const filter = localFilters[index];
    if (!filter) return;
    setLocalFilters((prev) =>
      prev.map((f, i) => (i === index ? { ...f, value: newValue } : f))
    );
    applyFilter(filter.columnKey, newValue);
    setValuePickerOpen(null);
  }

  function clearAll() {
    // Clear all URL filter params
    localFilters.forEach((f) => applyFilter(f.columnKey, ""));
    setLocalFilters([]);
  }

  function handleExport() {
    console.log("TODO: export data");
  }

  // ── URLSearchParams writer (uses router.push via nuqs pattern) ─────────────
  // We use a simple approach: each filter key is a top-level URL param.
  // Because nuqs hooks can't be called conditionally, we delegate the URL
  // write to a tiny helper that uses the native history API — nuqs will pick
  // it up on the next render.
  function applyFilter(key: string, value: string) {
    const url = new URL(window.location.href);
    if (value) {
      url.searchParams.set(key, value);
    } else {
      url.searchParams.delete(key);
    }
    url.searchParams.set("page", "1"); // reset page
    window.history.pushState({}, "", url.toString());
    // Trigger a Next.js navigation so the Server Component re-renders
    window.dispatchEvent(new PopStateEvent("popstate"));
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
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        {/* Right-side controls */}
        <div className="flex items-center gap-2 shrink-0">

          {filterColumns.length > 0 && (
            <button
              className={cn(
                "flex items-center gap-2 px-3 py-[7px] rounded-lg text-sm font-medium transition-colors",
                hasFilters && "ring-1"
              )}
              style={{
                background: filterPanelOpen || hasFilters
                  ? "var(--color-surface-alt)"
                  : "var(--color-surface)",
                border: "1px solid var(--color-border)",
                color:  filterPanelOpen || hasFilters
                  ? "var(--color-text-primary)"
                  : "var(--color-text-secondary)",
                ...( hasFilters ? { "--tw-ring-color": "var(--color-border)" } as React.CSSProperties : {}),
              }}
              onClick={() => {
                setFilterPanelOpen((o) => !o);
                if (!filterPanelOpen && localFilters.length === 0) addFilter();
              }}
            >
              <ListFilter size={13} />
              Filter
              {hasFilters && (
                <span
                  className="flex items-center justify-center size-4 rounded-full text-[10px] font-bold"
                  style={{ background: "var(--color-ink)", color: "var(--color-ink-fg)" }}
                >
                  {localFilters.filter((f) => f.value !== "").length}
                </span>
              )}
            </button>
          )}

          <button
            className="flex items-center gap-2 px-3 py-[7px] rounded-lg text-sm font-medium transition-colors"
            style={{
              background: "var(--color-surface)",
              border:     "1px solid var(--color-border)",
              color:      "var(--color-text-secondary)",
            }}
          >
            <ArrowUpDown size={13} />
            Sort
          </button>

          <button
            className="flex items-center justify-center size-9 rounded-lg transition-colors"
            style={{
              background: "var(--color-surface)",
              border:     "1px solid var(--color-border)",
              color:      "var(--color-text-secondary)",
            }}
            title="Export"
            onClick={handleExport}
          >
            <Download size={14} />
          </button>

          {actions}
        </div>
      </div>

      {/* ── Filter panel ─────────────────────────────────────────────────────── */}
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
            {localFilters.length === 0 && (
              <p className="text-xs py-1" style={{ color: "var(--color-text-muted)" }}>
                No filters applied — add one below.
              </p>
            )}

            {localFilters.map((filter, idx) => {
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

            <div className="flex items-center gap-3 pt-1">
              <button
                className="flex items-center gap-1.5 text-xs font-medium transition-colors"
                style={{ color: "var(--color-text-secondary)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-text-primary)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-secondary)")}
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
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-red)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-muted)")}
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
  index:             number;
  filter:            ActiveFilter;
  selectedCol:       FilterColumn | undefined;
  filterColumns:     FilterColumn[];
  columnPickerOpen:  boolean;
  valuePickerOpen:   boolean;
  onToggleColumnPicker: () => void;
  onToggleValuePicker:  () => void;
  onColumnChange:    (key: string) => void;
  onValueChange:     (val: string) => void;
  onRemove:          () => void;
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
      <span
        className="text-[11px] font-semibold uppercase tracking-wide w-10 text-right shrink-0"
        style={{ color: "var(--color-text-muted)" }}
      >
        Where
      </span>

      <div className="relative">
        <button
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{
            background: "var(--color-surface-alt)",
            border:     "1px solid var(--color-border)",
            color:      "var(--color-text-primary)",
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

      <span className="text-xs font-medium px-2 shrink-0" style={{ color: "var(--color-text-muted)" }}>
        is
      </span>

      <div className="relative">
        {selectedCol?.type === "select" ? (
          <>
            <button
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                background: "var(--color-surface-alt)",
                border:     "1px solid var(--color-border)",
                color:      filter.value ? "var(--color-text-primary)" : "var(--color-text-muted)",
              }}
              onClick={onToggleValuePicker}
            >
              {selectedCol.options?.find((o) => o.value === filter.value)?.label ?? "Select value"}
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
              background: "var(--color-surface-alt)",
              border:     "1px solid var(--color-border)",
              color:      "var(--color-text-primary)",
              minWidth:   "140px",
            }}
            value={filter.value}
            onChange={(e) => onValueChange(e.target.value)}
          />
        )}
      </div>

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

function PickerOption({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
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
