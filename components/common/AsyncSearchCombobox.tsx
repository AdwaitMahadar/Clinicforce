"use client";

/**
 * Popover + cmdk Command combobox with debounced server-side search.
 * `shouldFilter={false}` — filtering is entirely owned by `fetchItems`.
 *
 * Use `modal={false}` on Popover so focus works inside intercepting route modals (Dialog).
 */

import { useEffect, useState, type Ref } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type AsyncSearchComboboxFetchFn<T> = (query: string) => Promise<T[]>;

export interface AsyncSearchComboboxProps<T> {
  value: string;
  onValueChange: (nextValue: string, item: T | undefined) => void;
  onBlur?: () => void;
  triggerRef?: Ref<HTMLButtonElement>;
  disabled?: boolean;
  /** Shown on the closed trigger when nothing selected (create mode). */
  placeholder?: string;
  /** Input hint inside the popover. */
  searchPlaceholder?: string;
  /** When list is empty and not loading. */
  emptyLabel?: string;
  fetchItems: AsyncSearchComboboxFetchFn<T>;
  getOptionValue: (item: T) => string;
  getOptionLabel: (item: T) => string;
  renderOption?: (item: T) => React.ReactNode;
  /**
   * When the field is disabled (e.g. edit mode), this text is shown on the trigger.
   * Must be set whenever `disabled` is true and a value exists.
   */
  disabledDisplayLabel?: string;
  /**
   * When `value` is set but the selected row is not in the current `items` list (e.g. after
   * a parent refresh or before the popover has been opened), show this label on the closed trigger.
   */
  selectedDisplayLabel?: string | null;
  debounceMs?: number;
  /** Tailwind max-height for the scrollable results region (~6–8 rows). */
  listMaxHeightClassName?: string;
  align?: "start" | "center" | "end";
  id?: string;
  "aria-invalid"?: boolean;
}

const DEFAULT_DEBOUNCE_MS = 300;

export function AsyncSearchCombobox<T>({
  value,
  onValueChange,
  onBlur,
  triggerRef,
  disabled = false,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyLabel = "No results.",
  fetchItems,
  getOptionValue,
  getOptionLabel,
  renderOption,
  disabledDisplayLabel,
  selectedDisplayLabel,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  listMaxHeightClassName = "max-h-[min(18rem,var(--radix-popover-content-available-height))]",
  align = "start",
  id,
  "aria-invalid": ariaInvalid,
}: AsyncSearchComboboxProps<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<T | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query.trim()), debounceMs);
    return () => window.clearTimeout(t);
  }, [query, debounceMs]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const next = await fetchItems(debouncedQuery);
        if (!cancelled) setItems(next);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, debouncedQuery, fetchItems]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setDebouncedQuery("");
    }
  }, [open]);

  useEffect(() => {
    if (!value) {
      setSelectedItem(null);
      return;
    }
    const match = items.find((it) => getOptionValue(it) === value);
    if (match) setSelectedItem(match);
    else setSelectedItem(null);
  }, [value, items, getOptionValue]);

  const triggerLabel = disabled
    ? (disabledDisplayLabel ?? placeholder)
    : placeholder;

  const closedSelectionLabel =
    !disabled && value
      ? selectedItem
        ? getOptionLabel(selectedItem)
        : (selectedDisplayLabel?.trim() ? selectedDisplayLabel.trim() : null)
      : null;

  const showCheck = (item: T) => value === getOptionValue(item);

  if (disabled) {
    return (
      <Button
        ref={triggerRef}
        id={id}
        type="button"
        variant="outline"
        disabled
        aria-invalid={ariaInvalid}
        onBlur={onBlur}
        className="h-9 w-full justify-between rounded-md border px-3 font-normal shadow-xs"
        style={{
          borderColor: "var(--color-border)",
          background: "var(--color-surface)",
          color: "var(--color-text-primary)",
        }}
      >
        <span className="truncate text-left">{triggerLabel}</span>
        <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
      </Button>
    );
  }

  return (
    <Popover modal={false} open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={ariaInvalid}
          onBlur={onBlur}
          className="h-9 w-full justify-between rounded-md border px-3 font-normal shadow-xs"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-surface)",
            color: "var(--color-text-primary)",
          }}
        >
          <span
            className="truncate text-left"
            style={{
              color: closedSelectionLabel ? "var(--color-text-primary)" : "var(--color-text-muted)",
            }}
          >
            {closedSelectionLabel ?? placeholder}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className="w-[var(--radix-popover-trigger-width)] min-w-[var(--radix-popover-trigger-width)] p-0"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList className={listMaxHeightClassName}>
            {loading ? (
              <div
                className="flex items-center justify-center gap-2 py-6 text-sm"
                style={{ color: "var(--color-text-muted)" }}
              >
                <Loader2 className="size-4 animate-spin" />
                Searching…
              </div>
            ) : (
              <>
                <CommandEmpty>{emptyLabel}</CommandEmpty>
                <CommandGroup>
                  {items.map((item) => {
                    const v = getOptionValue(item);
                    return (
                      <CommandItem
                        key={v}
                        value={v}
                        keywords={[getOptionLabel(item)]}
                        onSelect={() => {
                          setSelectedItem(item);
                          onValueChange(v, item);
                          setOpen(false);
                          setQuery("");
                        }}
                      >
                        <span className="flex min-w-0 flex-1 items-center gap-2">
                          {renderOption ? renderOption(item) : getOptionLabel(item)}
                        </span>
                        <Check
                          className={cn("ml-auto size-4 shrink-0", showCheck(item) ? "opacity-100" : "opacity-0")}
                        />
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
