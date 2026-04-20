"use client";

/**
 * Appointment detail — Prescriptions tab: draft (auto-save) and published read-only.
 * Uses @dnd-kit for reorder; `AsyncSearchCombobox` + `searchMedicinesForPicker` for medicines.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format, isSameDay, parseISO, subDays } from "date-fns";
import { GripVertical, Minus, Pill, Plus, Trash2, X } from "lucide-react";
import { AlertDialog as AlertDialogPrimitive } from "radix-ui";
import { toast } from "sonner";
import { searchMedicinesForPicker } from "@/lib/actions/medicines";
import {
  addPrescriptionItem,
  clearPrescriptionItems,
  publishPrescription,
  removePrescriptionItem,
  reorderPrescriptionItems,
  updatePrescriptionItem,
  updatePrescriptionNotes,
} from "@/lib/actions/prescriptions";
import type { MealTiming } from "@/lib/constants/prescription";
import { formatPrescriptionChartId } from "@/lib/utils/chart-id";
import type {
  PrescriptionForAppointmentTab,
  PrescriptionItemForAppointmentTab,
  PrescriptionWithItemsPayload,
} from "@/types/prescription";
import { toAppointmentTabPrescription } from "@/types/prescription";
import { AsyncSearchCombobox } from "@/components/common/AsyncSearchCombobox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type MedicinePickerRow = {
  id: string;
  name: string;
  category: string | null;
  brand: string | null;
  form: string | null;
  lastPrescribedDate: Date | string | null;
};

function formatLastPrescribed(d: Date | string | null | undefined): string | null {
  if (d == null) return null;
  try {
    const dt = typeof d === "string" ? parseISO(d) : d;
    const today = new Date();
    if (isSameDay(dt, today)) return "Today";
    if (isSameDay(dt, subDays(today, 1))) return "Yesterday";
    return format(dt, "MMM d, yyyy");
  } catch {
    return null;
  }
}

function medicineSubtitle(m: MedicinePickerRow): string {
  const parts = [m.category, m.form].filter(Boolean);
  return parts.join(" · ");
}

function mealShortLabel(m: string): string {
  return m === "after_food" ? "After" : "Before";
}

function applyPayload(
  setRx: React.Dispatch<React.SetStateAction<PrescriptionForAppointmentTab | null>>,
  data: PrescriptionWithItemsPayload | undefined
) {
  if (!data) return;
  setRx(toAppointmentTabPrescription(data));
}

async function failToast<T extends { success: boolean; error?: string }>(res: T): Promise<boolean> {
  if (!res.success) {
    toast.error(res.error ?? "Something went wrong.");
    return false;
  }
  return true;
}

export interface PrescriptionsTabProps {
  appointmentId: string;
  initialPrescription: PrescriptionForAppointmentTab | null;
}

type SlotKey = "morning" | "afternoon" | "night";

const SLOTS: { key: SlotKey; enabled: `${SlotKey}Enabled`; qty: `${SlotKey}Quantity`; timing: `${SlotKey}Timing` }[] = [
  { key: "morning", enabled: "morningEnabled", qty: "morningQuantity", timing: "morningTiming" },
  { key: "afternoon", enabled: "afternoonEnabled", qty: "afternoonQuantity", timing: "afternoonTiming" },
  { key: "night", enabled: "nightEnabled", qty: "nightQuantity", timing: "nightTiming" },
];

function QtyStepper({
  itemId,
  qtyField,
  disabled,
  serverQty,
  itemUpdatedAt,
  queueDebouncedPatch,
}: {
  itemId: string;
  qtyField: "morningQuantity" | "afternoonQuantity" | "nightQuantity";
  disabled: boolean;
  serverQty: number;
  itemUpdatedAt: string;
  queueDebouncedPatch: (itemId: string, patch: Record<string, unknown>) => void;
}) {
  const [draft, setDraft] = useState<number | null>(null);
  const display = draft ?? serverQty;

  useEffect(() => {
    setDraft(null);
  }, [serverQty, itemUpdatedAt]);

  const push = (n: number) => {
    const c = Math.min(10, Math.max(1, Math.round(n)));
    setDraft(c);
    queueDebouncedPatch(itemId, { [qtyField]: c });
  };

  return (
    <div className="flex items-center gap-0.5" onPointerDown={(e) => e.stopPropagation()}>
      <button
        type="button"
        disabled={disabled}
        aria-label="Decrease quantity"
        className="flex size-7 shrink-0 items-center justify-center rounded border text-sm font-semibold shadow-xs disabled:cursor-not-allowed disabled:opacity-40"
        style={{
          borderColor: "var(--color-border)",
          background: "var(--color-surface)",
          color: "var(--color-text-primary)",
        }}
        onClick={() => push(display - 1)}
      >
        <Minus className="size-3.5" strokeWidth={2.5} />
      </button>
      <Input
        type="text"
        inputMode="numeric"
        disabled={disabled}
        className="h-7 w-10 shrink-0 px-0 text-center text-sm tabular-nums"
        style={{
          borderColor: "var(--color-border)",
          background: "var(--color-surface)",
          color: "var(--color-text-primary)",
        }}
        value={String(display)}
        onChange={(e) => {
          const t = e.target.value.trim();
          if (t === "") return;
          const n = Number(t);
          if (!Number.isFinite(n)) return;
          const c = Math.min(10, Math.max(1, Math.round(n)));
          setDraft(c);
          queueDebouncedPatch(itemId, { [qtyField]: c });
        }}
        onBlur={() => {
          const c = Math.min(10, Math.max(1, Math.round(draft ?? serverQty)));
          setDraft(null);
          if (c !== serverQty) {
            queueDebouncedPatch(itemId, { [qtyField]: c });
          }
        }}
      />
      <button
        type="button"
        disabled={disabled}
        aria-label="Increase quantity"
        className="flex size-7 shrink-0 items-center justify-center rounded border text-sm font-semibold shadow-xs disabled:cursor-not-allowed disabled:opacity-40"
        style={{
          borderColor: "var(--color-border)",
          background: "var(--color-surface)",
          color: "var(--color-text-primary)",
        }}
        onClick={() => push(display + 1)}
      >
        <Plus className="size-3.5" strokeWidth={2.5} />
      </button>
    </div>
  );
}

function MealPillToggle({
  meal,
  disabled,
  onChange,
}: {
  meal: "before_food" | "after_food";
  disabled: boolean;
  onChange: (m: MealTiming) => void;
}) {
  return (
    <div
      className={cn("relative grid h-7 w-full min-w-0 grid-cols-2 rounded-full p-0.5", disabled && "opacity-50")}
      style={{
        border: "1px solid var(--color-border)",
        background: "var(--color-surface-alt)",
      }}
      onPointerDown={(e) => e.stopPropagation()}
      role="group"
      aria-label="Before or after meal"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute top-0.5 bottom-0.5 rounded-full transition-[left] duration-200 ease-out"
        style={{
          left: meal === "after_food" ? "calc(50% - 1px)" : "2px",
          width: "calc(50% - 3px)",
          background: "var(--color-ink)",
        }}
      />
      <button
        type="button"
        disabled={disabled}
        className="relative z-10 rounded-full px-1 text-[10px] font-semibold leading-none transition-colors"
        style={{
          color: meal === "before_food" ? "var(--color-ink-fg)" : "var(--color-text-secondary)",
        }}
        onClick={() => {
          if (!disabled && meal !== "before_food") onChange("before_food");
        }}
      >
        Before food
      </button>
      <button
        type="button"
        disabled={disabled}
        className="relative z-10 rounded-full px-1 text-[10px] font-semibold leading-none transition-colors"
        style={{
          color: meal === "after_food" ? "var(--color-ink-fg)" : "var(--color-text-secondary)",
        }}
        onClick={() => {
          if (!disabled && meal !== "after_food") onChange("after_food");
        }}
      >
        After food
      </button>
    </div>
  );
}

function RxMedicineCardBody({
  item,
  draft,
  excludeMedicineIds,
  onPatch,
  queueDebouncedPatch,
}: {
  item: PrescriptionItemForAppointmentTab;
  draft: boolean;
  excludeMedicineIds: string[];
  onPatch: (patch: Parameters<typeof updatePrescriptionItem>[0]) => void | Promise<void>;
  queueDebouncedPatch: (itemId: string, patch: Record<string, unknown>) => void;
}) {
  const fetchMedicines = useCallback(
    async (query: string) => {
      const res = await searchMedicinesForPicker({ query, excludeIds: excludeMedicineIds });
      if (!res.success) return [];
      return res.data as MedicinePickerRow[];
    },
    [excludeMedicineIds]
  );

  return (
    <div className={cn("min-h-0", draft && "pr-20")}>
      <div className="mb-4">
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-5 sm:gap-4"
          onPointerDown={(e) => e.stopPropagation()}
        >
        <div className="min-w-0 sm:col-span-3">
          <p className="text-xs font-medium mb-1.5" style={{ color: "var(--color-text-muted)" }}>
            Medicine
          </p>
          {draft ? (
            <AsyncSearchCombobox<MedicinePickerRow>
              value={item.medicineId}
              selectedDisplayLabel={item.displayMedicineName}
              onValueChange={(nextId) => {
                if (nextId && nextId !== item.medicineId) {
                  void onPatch({ id: item.id, medicineId: nextId });
                }
              }}
              placeholder="Search medicines…"
              searchPlaceholder="Search by name, brand, category…"
              emptyLabel="No medicines found."
              fetchItems={fetchMedicines}
              getOptionValue={(m) => m.id}
              getOptionLabel={(m) => m.name}
              renderOption={(m) => (
                <span className="flex min-w-0 flex-col gap-0.5 text-left">
                  <span className="truncate font-medium" style={{ color: "var(--color-text-primary)" }}>
                    {m.name}
                  </span>
                  <span className="truncate text-xs" style={{ color: "var(--color-text-secondary)" }}>
                    {medicineSubtitle(m)}
                    {formatLastPrescribed(m.lastPrescribedDate)
                      ? ` · Last prescribed: ${formatLastPrescribed(m.lastPrescribedDate)}`
                      : ""}
                  </span>
                </span>
              )}
              listMaxHeightClassName="max-h-[min(18rem,var(--radix-popover-content-available-height))]"
            />
          ) : (
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                {item.displayMedicineName}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                {item.medicineName ? "As published" : "From catalog at publish time"}
              </p>
            </div>
          )}
        </div>
        <div className="min-w-0 sm:col-span-2">
          <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--color-text-muted)" }}>
            Duration
          </label>
          {draft ? (
            <Input
              className="h-9 text-sm"
              defaultValue={item.duration ?? ""}
              key={`${item.id}-dur-${item.updatedAt}`}
              onPointerDown={(e) => e.stopPropagation()}
              onBlur={(e) => {
                const v = e.target.value.trim();
                const next = v === "" ? null : v;
                if (next !== (item.duration ?? null)) {
                  void onPatch({ id: item.id, duration: next });
                }
              }}
            />
          ) : (
            <p className="text-sm" style={{ color: "var(--color-text-primary)" }}>
              {item.duration?.trim() ? item.duration : "—"}
            </p>
          )}
        </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {SLOTS.map(({ key, enabled, qty, timing }) => {
          const en = item[enabled];
          const quantity = item[qty];
          const meal = item[timing] as "before_food" | "after_food";
          const label = key.charAt(0).toUpperCase() + key.slice(1);
          return (
            <div
              key={key}
              className="flex flex-col gap-2 rounded-md border p-3"
              style={{
                borderColor: "var(--color-border)",
                background: "var(--color-surface-alt)",
              }}
            >
              {draft ? (
                <>
                  <div className="flex min-h-7 min-w-0 items-center gap-2">
                    <div className="shrink-0" onPointerDown={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={en}
                        onCheckedChange={(c) => {
                          void onPatch({ id: item.id, [enabled]: c === true });
                        }}
                        aria-label={`${label} dose`}
                      />
                    </div>
                    <span
                      className="min-w-0 shrink text-sm font-medium truncate"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {label}
                    </span>
                    <div className="ml-auto flex shrink-0 items-center gap-1.5">
                      <span
                        className="text-xs font-medium tabular-nums"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        Qty
                      </span>
                      <div
                        className={cn(!en && "opacity-[0.55]")}
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        <QtyStepper
                          itemId={item.id}
                          qtyField={qty}
                          disabled={!en}
                          serverQty={quantity}
                          itemUpdatedAt={item.updatedAt}
                          queueDebouncedPatch={queueDebouncedPatch}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="min-w-0 w-full" onPointerDown={(e) => e.stopPropagation()}>
                    <MealPillToggle
                      meal={meal}
                      disabled={!en}
                      onChange={(m) => void onPatch({ id: item.id, [timing]: m })}
                    />
                  </div>
                </>
              ) : (
                <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  {en ? (
                    <>
                      {quantity} × {mealShortLabel(meal)}
                    </>
                  ) : (
                    <span style={{ color: "var(--color-text-muted)" }}>—</span>
                  )}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4" onPointerDown={(e) => e.stopPropagation()}>
        <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--color-text-muted)" }}>
          Remarks
        </label>
        {draft ? (
          <Textarea
            rows={1}
            className="min-h-9 resize-none text-sm"
            defaultValue={item.remarks ?? ""}
            key={`${item.id}-rm-${item.updatedAt}`}
            onBlur={(e) => {
              const v = e.target.value;
              if (v !== (item.remarks ?? "")) {
                void onPatch({ id: item.id, remarks: v === "" ? null : v });
              }
            }}
          />
        ) : (
          <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--color-text-primary)" }}>
            {item.remarks?.trim() ? item.remarks : "—"}
          </p>
        )}
      </div>
    </div>
  );
}

function DraftSortableRxCard({
  item,
  excludeMedicineIds,
  onPatch,
  onRemove,
  queueDebouncedPatch,
}: {
  item: PrescriptionItemForAppointmentTab;
  excludeMedicineIds: string[];
  onPatch: (patch: Parameters<typeof updatePrescriptionItem>[0]) => void | Promise<void>;
  onRemove: () => void | Promise<void>;
  queueDebouncedPatch: (itemId: string, patch: Record<string, unknown>) => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.92 : 1,
    borderColor: "var(--color-border)",
    background: "var(--color-surface)",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative touch-manipulation rounded-lg border p-4"
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        className="absolute top-3 right-11 z-10 rounded p-1.5 opacity-0 transition-opacity group-hover:opacity-100"
        style={{ color: "var(--color-text-muted)" }}
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <button
        type="button"
        className="absolute top-3 right-3 z-10 rounded p-1.5 opacity-0 transition-opacity group-hover:opacity-100"
        style={{ color: "var(--color-red)" }}
        aria-label="Remove medicine"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => void onRemove()}
      >
        <Trash2 className="size-4" />
      </button>
      <RxMedicineCardBody
        item={item}
        draft
        excludeMedicineIds={excludeMedicineIds}
        onPatch={onPatch}
        queueDebouncedPatch={queueDebouncedPatch}
      />
    </div>
  );
}

function PublishedRxCard({
  item,
  excludeMedicineIds,
  onPatch,
  queueDebouncedPatch,
}: {
  item: PrescriptionItemForAppointmentTab;
  excludeMedicineIds: string[];
  onPatch: (patch: Parameters<typeof updatePrescriptionItem>[0]) => void | Promise<void>;
  queueDebouncedPatch: (itemId: string, patch: Record<string, unknown>) => void;
}) {
  return (
    <div
      className="relative rounded-lg border p-4"
      style={{
        borderColor: "var(--color-border)",
        background: "var(--color-surface)",
      }}
    >
      <RxMedicineCardBody
        item={item}
        draft={false}
        excludeMedicineIds={excludeMedicineIds}
        onPatch={onPatch}
        queueDebouncedPatch={queueDebouncedPatch}
      />
    </div>
  );
}

export function PrescriptionsTab({ appointmentId, initialPrescription }: PrescriptionsTabProps) {
  const [rx, setRx] = useState<PrescriptionForAppointmentTab | null>(initialPrescription);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearPending, setClearPending] = useState(false);
  const [showAddPicker, setShowAddPicker] = useState(false);
  const addPickerKey = useRef(0);

  const pendingPatches = useRef<Record<string, Record<string, unknown>>>({});
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    setRx(initialPrescription);
  }, [initialPrescription]);

  const published = rx?.publishedAt != null;
  const draft = rx != null && !published;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const itemIds = useMemo(() => (rx?.items ?? []).map((i) => i.id), [rx?.items]);

  const flushDebounced = useCallback(
    async (itemId: string) => {
      const patch = pendingPatches.current[itemId];
      delete pendingPatches.current[itemId];
      if (!patch || Object.keys(patch).length === 0) return;
      const res = await updatePrescriptionItem({
        id: itemId,
        ...patch,
      } as Parameters<typeof updatePrescriptionItem>[0]);
      if (!(await failToast(res))) return;
      applyPayload(setRx, res.data);
    },
    []
  );

  const queueDebouncedPatch = useCallback(
    (itemId: string, patch: Record<string, unknown>) => {
      pendingPatches.current[itemId] = { ...pendingPatches.current[itemId], ...patch };
      const prev = debounceTimers.current[itemId];
      if (prev) clearTimeout(prev);
      debounceTimers.current[itemId] = setTimeout(() => {
        delete debounceTimers.current[itemId];
        void flushDebounced(itemId);
      }, 300);
    },
    [flushDebounced]
  );

  const onPatch = useCallback(async (input: Parameters<typeof updatePrescriptionItem>[0]) => {
    const res = await updatePrescriptionItem(input);
    if (!(await failToast(res))) return;
    applyPayload(setRx, res.data);
  }, []);

  const onRemoveItem = useCallback(
    async (id: string) => {
      const res = await removePrescriptionItem({ id });
      if (!(await failToast(res))) return;
      applyPayload(setRx, res.data);
    },
    []
  );

  const onDragEnd = useCallback(
    async (event: DragEndEvent) => {
      if (!rx || published) return;
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const items = [...rx.items];
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return;
      const newOrder = arrayMove(items, oldIndex, newIndex);
      const payload = newOrder.map((it, idx) => ({ id: it.id, sortOrder: idx }));
      const res = await reorderPrescriptionItems({
        prescriptionId: rx.id,
        items: payload,
      });
      if (!(await failToast(res))) return;
      applyPayload(setRx, res.data);
    },
    [rx, published]
  );

  const handleAddMedicine = useCallback(
    async (medicineId: string) => {
      const res = await addPrescriptionItem({ appointmentId, medicineId });
      if (!(await failToast(res))) return;
      applyPayload(setRx, res.data);
      setShowAddPicker(false);
      addPickerKey.current += 1;
    },
    [appointmentId]
  );

  const handleClear = useCallback(async () => {
    if (!rx) return;
    setClearPending(true);
    try {
      const res = await clearPrescriptionItems({ prescriptionId: rx.id });
      if (!(await failToast(res))) return;
      applyPayload(setRx, res.data);
      setClearOpen(false);
    } finally {
      setClearPending(false);
    }
  }, [rx]);

  const handlePublish = useCallback(async () => {
    if (!rx) return;
    const res = await publishPrescription({ prescriptionId: rx.id });
    if (!(await failToast(res))) return;
    applyPayload(setRx, res.data);
  }, [rx]);

  const handleNotesBlur = useCallback(
    async (raw: string) => {
      if (!rx || published) return;
      const trimmed = raw.trim();
      const next = trimmed === "" ? null : trimmed;
      if (next === (rx.notes ?? null)) return;
      const res = await updatePrescriptionNotes({ prescriptionId: rx.id, notes: next });
      if (!(await failToast(res))) return;
      applyPayload(setRx, res.data);
    },
    [rx, published]
  );

  const handleClearNotes = useCallback(async () => {
    if (!rx || published) return;
    const res = await updatePrescriptionNotes({ prescriptionId: rx.id, notes: null });
    if (!(await failToast(res))) return;
    applyPayload(setRx, res.data);
  }, [rx, published]);

  const fetchMedicinesEmpty = useCallback(async (query: string) => {
    const excludeIds = (rx?.items ?? []).map((i) => i.medicineId);
    const res = await searchMedicinesForPicker({ query, excludeIds });
    if (!res.success) return [];
    return res.data as MedicinePickerRow[];
  }, [rx?.items]);

  const emptyFirstAdd = rx == null;
  const showEmptyState = emptyFirstAdd && !showAddPicker;

  const addPickerBlock =
    showAddPicker && (rx == null || draft) ? (
      <div
        className="rounded-lg border p-4"
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface-alt)" }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <p className="text-xs font-medium mb-2" style={{ color: "var(--color-text-muted)" }}>
          Select medicine
        </p>
        <AsyncSearchCombobox<MedicinePickerRow>
          key={`add-${addPickerKey.current}-${rx?.items.length ?? 0}`}
          value=""
          onValueChange={(id) => {
            if (id) void handleAddMedicine(id);
          }}
          placeholder="Search medicines…"
          searchPlaceholder="Search by name, brand, category…"
          emptyLabel="No medicines found."
          fetchItems={fetchMedicinesEmpty}
          getOptionValue={(m) => m.id}
          getOptionLabel={(m) => m.name}
          renderOption={(m) => (
            <span className="flex min-w-0 flex-col gap-0.5 text-left">
              <span className="truncate font-medium" style={{ color: "var(--color-text-primary)" }}>
                {m.name}
              </span>
              <span className="truncate text-xs" style={{ color: "var(--color-text-secondary)" }}>
                {medicineSubtitle(m)}
                {formatLastPrescribed(m.lastPrescribedDate)
                  ? ` · Last prescribed: ${formatLastPrescribed(m.lastPrescribedDate)}`
                  : ""}
              </span>
            </span>
          )}
        />
        <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => setShowAddPicker(false)}>
          Cancel
        </Button>
      </div>
    ) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Pill className="size-5 shrink-0" style={{ color: "var(--color-green)" }} aria-hidden />
          <div>
            <h4 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
              Prescription
            </h4>
            {rx ? (
              <p className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                {formatPrescriptionChartId(rx.chartId)}
                {published && rx.publishedAt ? (
                  <span className="ml-2">
                    · Published {format(parseISO(rx.publishedAt), "MMM d, yyyy · h:mm a")}
                  </span>
                ) : null}
              </p>
            ) : (
              <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                Add medicines from your clinic library.
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {published ? (
            <Badge
              variant="outline"
              className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
              style={{
                background: "var(--color-green-bg)",
                color: "var(--color-green)",
                borderColor: "var(--color-green-border)",
              }}
            >
              Published
            </Badge>
          ) : null}
          {draft && rx ? (
            <>
              <Button type="button" variant="outline" size="sm" onClick={() => setClearOpen(true)}>
                Clear medicines
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={rx.items.length === 0}
                onClick={() => void handlePublish()}
                style={{
                  background: "var(--color-ink)",
                  color: "var(--color-ink-fg)",
                }}
              >
                Publish
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {showEmptyState ? (
        <div
          className="flex flex-col items-center justify-center gap-4 rounded-lg border py-14 px-6 text-center"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface-alt)" }}
        >
          <p className="text-sm max-w-sm" style={{ color: "var(--color-text-secondary)" }}>
            No prescription yet. Add a medicine to create this visit&apos;s prescription.
          </p>
          <Button type="button" size="sm" onClick={() => setShowAddPicker(true)}>
            Add Medicine
          </Button>
        </div>
      ) : null}

      {draft && rx && rx.items.length === 0 && !showAddPicker ? (
        <p
          className="text-sm text-center py-6 rounded-lg border border-dashed"
          style={{ color: "var(--color-text-muted)", borderColor: "var(--color-border)" }}
        >
          No medicines on this prescription yet.
        </p>
      ) : null}

      {rx && rx.items.length > 0 ? (
        draft ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => void onDragEnd(e)}>
            <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-4">
                {rx.items.map((item) => {
                  const excludeMedicineIds = rx.items.filter((i) => i.id !== item.id).map((i) => i.medicineId);
                  return (
                    <DraftSortableRxCard
                      key={item.id}
                      item={item}
                      excludeMedicineIds={excludeMedicineIds}
                      onPatch={onPatch}
                      onRemove={() => void onRemoveItem(item.id)}
                      queueDebouncedPatch={queueDebouncedPatch}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="flex flex-col gap-4">
            {rx.items.map((item) => {
              const excludeMedicineIds = rx.items.filter((i) => i.id !== item.id).map((i) => i.medicineId);
              return (
                <PublishedRxCard
                  key={item.id}
                  item={item}
                  excludeMedicineIds={excludeMedicineIds}
                  onPatch={onPatch}
                  queueDebouncedPatch={queueDebouncedPatch}
                />
              );
            })}
          </div>
        )
      ) : null}

      {addPickerBlock}

      {draft && rx && !showEmptyState ? (
        <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => setShowAddPicker(true)}>
          Add another medicine
        </Button>
      ) : null}

      {rx ? (
        <div className="relative">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
              Prescription notes
            </label>
            {draft && (rx.notes?.length ?? 0) > 0 ? (
              <button
                type="button"
                className="rounded p-1 text-xs transition-colors hover:bg-[var(--color-border)]"
                style={{ color: "var(--color-text-muted)" }}
                aria-label="Clear notes"
                onClick={() => void handleClearNotes()}
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>
          {draft ? (
            <Textarea
              rows={1}
              className="min-h-9 resize-none text-sm"
              defaultValue={rx.notes ?? ""}
              key={`notes-${rx.updatedAt}`}
              onBlur={(e) => void handleNotesBlur(e.target.value)}
            />
          ) : (
            <p
              className="text-sm rounded-md border p-3 whitespace-pre-wrap"
              style={{
                borderColor: "var(--color-border)",
                background: "var(--color-surface-alt)",
                color: "var(--color-text-primary)",
              }}
            >
              {rx.notes?.trim() ? rx.notes : "—"}
            </p>
          )}
        </div>
      ) : null}

      <AlertDialogPrimitive.Root open={clearOpen} onOpenChange={(o) => !clearPending && setClearOpen(o)}>
        <AlertDialogPrimitive.Portal>
          <AlertDialogPrimitive.Overlay
            className={cn(
              "data-[state=open]:animate-in data-[state=closed]:animate-out fixed inset-0 z-50 bg-black/50",
              clearPending && "pointer-events-none"
            )}
          />
          <AlertDialogPrimitive.Content
            className="bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg sm:max-w-md outline-none"
          >
            <AlertDialogPrimitive.Title className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
              Clear all medicines?
            </AlertDialogPrimitive.Title>
            <AlertDialogPrimitive.Description className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
              All lines will be removed from this draft prescription. Your Rx number and notes stay; you can add
              medicines again.
            </AlertDialogPrimitive.Description>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" disabled={clearPending} onClick={() => setClearOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={clearPending}
                onClick={() => void handleClear()}
              >
                Clear medicines
              </Button>
            </div>
          </AlertDialogPrimitive.Content>
        </AlertDialogPrimitive.Portal>
      </AlertDialogPrimitive.Root>
    </div>
  );
}
