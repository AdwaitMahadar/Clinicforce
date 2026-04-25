"use client";

/**
 * Appointment detail — Prescriptions tab.
 *
 * DRAFT state:   Full editing UX — medicine cards with interactive dose slots,
 *                auto-save, dnd reorder, publish action.
 * PUBLISHED state: Accordion (collapsed by default) → expands to a clinical
 *                  prescription document (℞ format) — read-only.
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
import { format, parseISO } from "date-fns";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  ChevronDown,
  GripVertical,
  Moon,
  Pill,
  Plus,
  Sun,
  Sunrise,
  Trash2,
  X,
} from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────── */

type MedicinePickerRow = {
  id: string;
  name: string;
  category: string | null;
  brand: string | null;
  form: string | null;
  lastPrescribedDate: Date | string | null;
};

/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */

function applyPayload(
  setRx: React.Dispatch<React.SetStateAction<PrescriptionForAppointmentTab | null>>,
  data: PrescriptionWithItemsPayload | undefined
) {
  if (!data) return;
  setRx(toAppointmentTabPrescription(data));
}

async function failToast<T extends { success: boolean; error?: string }>(res: T): Promise<boolean> {
  if (!res.success) { toast.error(res.error ?? "Something went wrong."); return false; }
  return true;
}

function medicineSubtitle(m: MedicinePickerRow): string {
  return [m.category, m.form].filter(Boolean).join(" · ");
}

/* ─────────────────────────────────────────────────────────────
   Slot configuration
───────────────────────────────────────────────────────────── */

type SlotKey = "morning" | "afternoon" | "night";

const SLOTS = [
  {
    key:     "morning"   as SlotKey,
    enabled: "morningEnabled"   as const,
    qty:     "morningQuantity"  as const,
    timing:  "morningTiming"    as const,
    label:   "Morning",
    Icon:    Sunrise,
    color: {
      active:    "var(--color-amber-bg)",
      border:    "var(--color-amber-border)",
      text:      "var(--color-amber)",
      iconColor: "var(--color-amber)",
    },
  },
  {
    key:     "afternoon" as SlotKey,
    enabled: "afternoonEnabled"   as const,
    qty:     "afternoonQuantity"  as const,
    timing:  "afternoonTiming"    as const,
    label:   "Afternoon",
    Icon:    Sun,
    color: {
      active:    "var(--color-blue-bg)",
      border:    "var(--color-blue-border)",
      text:      "var(--color-blue)",
      iconColor: "var(--color-blue)",
    },
  },
  {
    key:     "night" as SlotKey,
    enabled: "nightEnabled"   as const,
    qty:     "nightQuantity"  as const,
    timing:  "nightTiming"    as const,
    label:   "Night",
    Icon:    Moon,
    color: {
      active:    "var(--color-purple-bg)",
      border:    "var(--color-purple-border)",
      text:      "var(--color-purple)",
      iconColor: "var(--color-purple)",
    },
  },
] as const;

/* ─────────────────────────────────────────────────────────────
   DoseSlotRow — 2-line compact row; animated BF/AF slider
───────────────────────────────────────────────────────────── */

/** Spring that matches the topnav sliding pill — snappy, no overshoot */
const mealSliderSpring = { type: "spring", stiffness: 880, damping: 46, mass: 0.32 } as const;

function DoseSlotRow({
  slot,
  enabled,
  quantity,
  meal,
  itemId,
  itemUpdatedAt,
  onToggle,
  queueDebouncedPatch,
}: {
  slot: (typeof SLOTS)[number];
  enabled: boolean;
  quantity: number;
  meal: "before_food" | "after_food";
  itemId: string;
  itemUpdatedAt: string;
  onToggle: () => void;
  queueDebouncedPatch: (id: string, patch: Record<string, unknown>) => void;
}) {
  // ── Optimistic draft state ─────────────────────────────────────────────
  const [draftEnabled, setDraftEnabled] = useState<boolean | null>(null);
  const [draftQty,     setDraftQty]     = useState<number | null>(null);
  const [draftMeal,    setDraftMeal]    = useState<"before_food" | "after_food" | null>(null);

  const pendingEnabledRef = useRef<boolean | null>(null);
  const pendingQtyRef     = useRef<number | null>(null);
  const pendingMealRef    = useRef<"before_food" | "after_food" | null>(null);

  const displayEnabled = draftEnabled ?? enabled;
  const display        = draftQty     ?? quantity;
  const isBefore       = (draftMeal ?? meal) === "before_food";

  // Reset each optimistic value only once the server-confirmed prop has caught
  // up to the last value we queued.  Guarding on the pending ref prevents a
  // mid-flight response from an earlier click stomping a newer optimistic value.
  useEffect(() => {
    if (pendingEnabledRef.current === null || enabled === pendingEnabledRef.current) {
      pendingEnabledRef.current = null;
      setDraftEnabled(null);
    }
    if (pendingQtyRef.current === null || quantity === pendingQtyRef.current) {
      pendingQtyRef.current = null;
      setDraftQty(null);
    }
    if (pendingMealRef.current === null || meal === pendingMealRef.current) {
      pendingMealRef.current = null;
      setDraftMeal(null);
    }
  }, [enabled, quantity, meal, itemUpdatedAt]);

  const pushQty = (n: number) => {
    if (!displayEnabled) return;
    const c = Math.min(10, Math.max(1, Math.round(n)));
    pendingQtyRef.current = c;
    setDraftQty(c);
    queueDebouncedPatch(itemId, { [slot.qty]: c });
  };

  return (
    <div
      className="flex flex-col gap-2 rounded-lg px-2.5 py-2.5 transition-all duration-150"
      style={{
        border: `1px solid ${displayEnabled ? slot.color.border : "var(--color-border)"}`,
        background: "var(--color-surface-alt)",
        opacity: displayEnabled ? 1 : 0.55,
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* ── LINE 1: [checkbox icon] | centered label | [qty stepper] ── */}
      <div
        className="grid items-center gap-1"
        style={{ gridTemplateColumns: "auto 1fr auto" }}
      >
        {/* Left: checkbox only */}
        <div className="flex items-center">
          <input
            type="checkbox"
            className="size-3.5 cursor-pointer shrink-0"
            checked={displayEnabled}
            onChange={() => {
              const next = !displayEnabled;
              setDraftEnabled(next);
              pendingEnabledRef.current = next;
              onToggle();
            }}
            aria-label={`Enable ${slot.label} dose`}
          />
        </div>

        {/* Center: icon + label */}
        <div className="flex items-center justify-center gap-1.5">
          <slot.Icon
            className="size-3.5 shrink-0"
            style={{ color: displayEnabled ? slot.color.text : "var(--color-text-muted)" }}
            aria-hidden
          />
          <span
            className="text-xs font-semibold truncate"
            style={{ color: displayEnabled ? slot.color.text : "var(--color-text-muted)" }}
          >
            {slot.label}
          </span>
        </div>

        {/* Right: qty stepper */}
        <div
          className="flex items-center gap-0.5"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            aria-label="Decrease"
            disabled={!displayEnabled}
            className="flex size-5 items-center justify-center rounded text-xs transition-colors"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
            onClick={() => pushQty(display - 1)}
          >
            −
          </button>
          <span
            className="w-4 text-center text-xs font-bold tabular-nums"
            style={{ color: displayEnabled ? slot.color.text : "var(--color-text-muted)" }}
          >
            {display}
          </span>
          <button
            type="button"
            aria-label="Increase"
            disabled={!displayEnabled}
            className="flex size-5 items-center justify-center rounded text-xs transition-colors"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
            onClick={() => pushQty(display + 1)}
          >
            +
          </button>
        </div>
      </div>

      {/* ── LINE 2: Full-width animated BF / AF slider ── */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Slider track spans full card width */}
        <div
          className="relative flex items-center rounded-full p-0.5"
          style={{
            background: "var(--color-surface)",
            border: `1px solid ${displayEnabled ? slot.color.border : "var(--color-border)"}`,
          }}
          role="group"
          aria-label="Meal timing"
        >
          {/*
            Always-mounted sliding pill.
            Animating a single continuously-mounted element avoids Framer
            Motion queueing stale animation moves that happen when the pill
            was conditionally mounted/unmounted on rapid clicks.
            x "0%" = left half (Before food), x "100%" = right half (After food).
          */}
          <motion.span
            className="absolute top-0.5 bottom-0.5 rounded-full pointer-events-none"
            style={{
              background: slot.color.text,
              width: "calc(50% - 2px)",
              left: "2px",
            }}
            initial={false}
            animate={{ x: isBefore ? "0%" : "100%" }}
            transition={mealSliderSpring}
            aria-hidden
          />

          {/* Before food */}
          <button
            type="button"
            disabled={!displayEnabled}
            className="relative z-10 flex-1 rounded-full py-0.5 text-center text-[10px] font-bold transition-colors duration-150"
            style={{ color: isBefore ? "#fff" : "var(--color-text-muted)" }}
            onClick={() => {
              if (displayEnabled && !isBefore) {
                setDraftMeal("before_food");
                pendingMealRef.current = "before_food";
                queueDebouncedPatch(itemId, { [slot.timing]: "before_food" });
              }
            }}
          >
            Before food
          </button>

          {/* After food */}
          <button
            type="button"
            disabled={!displayEnabled}
            className="relative z-10 flex-1 rounded-full py-0.5 text-center text-[10px] font-bold transition-colors duration-150"
            style={{ color: !isBefore ? "#fff" : "var(--color-text-muted)" }}
            onClick={() => {
              if (displayEnabled && isBefore) {
                setDraftMeal("after_food");
                pendingMealRef.current = "after_food";
                queueDebouncedPatch(itemId, { [slot.timing]: "after_food" });
              }
            }}
          >
            After food
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   DraftMedicineCard — full editing card
───────────────────────────────────────────────────────────── */

function DraftMedicineCard({
  item,
  index,
  excludeMedicineIds,
  onPatch,
  onRemove,
  queueDebouncedPatch,
  dragHandleRef,
  dragHandleProps,
  isDragging,
}: {
  item: PrescriptionItemForAppointmentTab;
  index: number;
  excludeMedicineIds: string[];
  onPatch: (patch: Parameters<typeof updatePrescriptionItem>[0]) => void | Promise<void>;
  onRemove: () => void | Promise<void>;
  queueDebouncedPatch: (id: string, patch: Record<string, unknown>) => void;
  dragHandleRef: (el: HTMLElement | null) => void;
  dragHandleProps: Record<string, unknown>;
  isDragging: boolean;
}) {
  const fetchMedicines = useCallback(async (query: string) => {
    const res = await searchMedicinesForPicker({ query, excludeIds: excludeMedicineIds });
    if (!res.success) return [];
    return res.data as MedicinePickerRow[];
  }, [excludeMedicineIds]);

  const [draftDuration, setDraftDuration] = useState<string>(item.duration ?? "");
  const [draftRemarks,  setDraftRemarks]  = useState<string>(item.remarks  ?? "");

  // Refs that track whether the field is currently focused.  When focused, we
  // skip the server-sync reset so a save of any *other* field on this item
  // (e.g., a BF/AF toggle debounce) cannot wipe in-progress typing.
  const durationFocusedRef = useRef(false);
  const remarksFocusedRef  = useRef(false);

  useEffect(() => {
    if (!durationFocusedRef.current) setDraftDuration(item.duration ?? "");
  }, [item.duration, item.updatedAt]);
  useEffect(() => {
    if (!remarksFocusedRef.current) setDraftRemarks(item.remarks ?? "");
  }, [item.remarks, item.updatedAt]);

  return (
    <div
      className="group relative rounded-2xl overflow-hidden transition-shadow"
      style={{
        background: "var(--color-glass-fill-data)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        border: "1px solid var(--color-glass-border)",
        boxShadow: isDragging ? "var(--shadow-main)" : "var(--shadow-card)",
      }}
    >
      {/* ── Section header bar: index + label left │ drag + delete right ── */}
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b"
        style={{ borderColor: "var(--color-glass-border)", background: "var(--color-surface-alt)" }}
      >
        {/* Left: numbered badge + label */}
        <div className="flex items-center gap-2">
          <span
            className="flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}
          >
            {index + 1}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
            Medicine
          </span>
        </div>

        {/* Right: drag handle + delete — always correct spacing, revealed on hover */}
        <div className="flex items-center gap-1.5">
          <button
            ref={dragHandleRef}
            type="button"
            className="flex size-7 items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
            style={{ color: "var(--color-text-muted)" }}
            aria-label="Drag to reorder"
            {...dragHandleProps}
          >
            <GripVertical className="size-4" />
          </button>
          <button
            type="button"
            className="flex size-7 items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-[color:var(--color-red-bg)]"
            style={{ color: "var(--color-red)" }}
            aria-label="Remove medicine"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => void onRemove()}
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {/* ── Medicine combobox + Days input ── */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Medicine combobox */}
        <div className="min-w-0 flex-1">
          <AsyncSearchCombobox<MedicinePickerRow>
            value={item.medicineId}
            selectedDisplayLabel={item.displayMedicineName}
            onValueChange={(nextId) => {
              if (nextId && nextId !== item.medicineId) void onPatch({ id: item.id, medicineId: nextId });
            }}
            placeholder="Search medicines…"
            searchPlaceholder="Search by name, brand, category…"
            emptyLabel="No medicines found."
            fetchItems={fetchMedicines}
            getOptionValue={(m) => m.id}
            getOptionLabel={(m) => m.name}
            renderOption={(m) => (
              <span className="flex flex-col gap-0.5 text-left">
                <span className="font-medium truncate" style={{ color: "var(--color-text-primary)" }}>{m.name}</span>
                <span className="text-xs truncate" style={{ color: "var(--color-text-secondary)" }}>
                  {medicineSubtitle(m)}
                </span>
              </span>
            )}
          />
        </div>

        {/* Days input */}
        <input
          type="text"
          className="h-9 w-24 shrink-0 rounded-lg border px-3 text-sm focus:outline-none focus:ring-1"
          style={{
            background: "var(--color-surface-alt)",
            borderColor: "var(--color-border)",
            color: "var(--color-text-primary)",
          }}
          placeholder="Days"
          value={draftDuration}
          onChange={(e) => setDraftDuration(e.target.value)}
          onFocus={() => { durationFocusedRef.current = true; }}
          onBlur={() => {
            durationFocusedRef.current = false;
            const next = draftDuration.trim() || null;
            if (next !== (item.duration ?? null)) void onPatch({ id: item.id, duration: next });
          }}
        />
      </div>

      {/* ── Dose grid ── */}
      <div className="grid grid-cols-3 gap-3 px-4 pb-3" onPointerDown={(e) => e.stopPropagation()}>
        {SLOTS.map((slot) => {
          const en  = item[slot.enabled];
          const qty = item[slot.qty];
          const mg  = item[slot.timing] as "before_food" | "after_food";
          return (
            <DoseSlotRow
              key={slot.key}
              slot={slot}
              enabled={en}
              quantity={qty}
              meal={mg}
              itemId={item.id}
              itemUpdatedAt={item.updatedAt}
              onToggle={() => void onPatch({ id: item.id, [slot.enabled]: !en } as Parameters<typeof updatePrescriptionItem>[0])}
              queueDebouncedPatch={queueDebouncedPatch}
            />
          );
        })}
      </div>

      {/* ── Remarks footer ── */}
      <div
        className="border-t px-4 py-2.5"
        style={{ borderColor: "var(--color-glass-border)" }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <textarea
          rows={1}
          className="w-full resize-none border-0 bg-transparent text-xs leading-relaxed placeholder:italic placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-0"
          style={{ color: "var(--color-text-secondary)" }}
          placeholder="Remarks (optional)…"
          value={draftRemarks}
          onChange={(e) => setDraftRemarks(e.target.value)}
          onFocus={() => { remarksFocusedRef.current = true; }}
          onBlur={() => {
            remarksFocusedRef.current = false;
            const next = draftRemarks.trim() || null;
            if (next !== (item.remarks ?? null)) void onPatch({ id: item.id, remarks: next });
          }}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   DraftSortableCard
───────────────────────────────────────────────────────────── */

function DraftSortableCard(props: Omit<React.ComponentProps<typeof DraftMedicineCard>, "dragHandleRef" | "dragHandleProps" | "isDragging">) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: props.item.id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.9 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <DraftMedicineCard
        {...props}
        isDragging={isDragging}
        dragHandleRef={setActivatorNodeRef}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   RxDocument — the clinical prescription document view
   Used in the published accordion expansion.
───────────────────────────────────────────────────────────── */

function RxDocument({
  items,
  notes,
  publishedAt,
  doctorId,
}: {
  items: PrescriptionItemForAppointmentTab[];
  notes: string | null;
  publishedAt: string | null;
  doctorId: string;
}) {
  return (
    <div
      className="rounded-b-xl border-t px-5 py-4"
      style={{ borderColor: "var(--color-glass-border)", background: "var(--color-surface)" }}
    >
      {/* Published stamp */}
      {publishedAt && (
        <div className="mb-4 flex items-center gap-1.5">
          <CheckCircle2 className="size-3.5 shrink-0" style={{ color: "var(--color-green)" }} aria-hidden />
          <span className="text-[11px] font-semibold" style={{ color: "var(--color-green)" }}>
            Published {format(parseISO(publishedAt), "MMM d, yyyy · h:mm a")}
          </span>
        </div>
      )}

      {/* Divider with Rx symbol */}
      <div className="mb-4 flex items-center gap-3">
        <span className="text-2xl font-light leading-none" style={{ color: "var(--color-text-muted)", fontFamily: "serif" }}>℞</span>
        <div className="flex-1 border-t" style={{ borderColor: "var(--color-border)" }} />
      </div>

      {/* Medicine lines — two-column: name+remarks left, doses+duration right */}
      {items.length > 0 ? (
        <div className="flex flex-col divide-y" style={{ borderColor: "var(--color-border)" }}>
          {items.map((item, idx) => {
            const activeSlots = SLOTS.filter(s => item[s.enabled]);
            return (
              <div key={item.id} className="grid grid-cols-[1fr_auto] items-start gap-4 py-3">
                {/* LEFT: index + medicine name + remarks */}
                <div className="min-w-0 flex items-start gap-2">
                  <span
                    className="mt-0.5 shrink-0 text-xs font-bold tabular-nums"
                    style={{ color: "var(--color-text-muted)", minWidth: "1rem" }}
                  >
                    {idx + 1}.
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--color-text-primary)" }}>
                      {item.displayMedicineName}
                    </p>
                    {item.remarks?.trim() && (
                      <p className="mt-0.5 text-xs italic" style={{ color: "var(--color-text-secondary)" }}>
                        {item.remarks}
                      </p>
                    )}
                  </div>
                </div>

                {/* RIGHT: dose pills + duration */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {activeSlots.length > 0 ? (
                    <div className="flex flex-wrap justify-end gap-1">
                      {activeSlots.map(s => {
                        const qty  = item[s.qty];
                        const meal = item[s.timing] === "after_food" ? "After" : "Before";
                        return (
                          <span
                            key={s.key}
                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap"
                            style={{
                              background: s.color.active,
                              border: `1px solid ${s.color.border}`,
                              color: s.color.text,
                            }}
                          >
                            <s.Icon className="size-2.5 shrink-0" aria-hidden />
                            ×{qty}
                            <span style={{ opacity: 0.75 }}>{meal}</span>
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-[11px] italic" style={{ color: "var(--color-text-muted)" }}>No doses</span>
                  )}
                  {item.duration?.trim() && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{ background: "var(--color-surface-alt)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}
                    >
                      <span className="font-semibold" style={{ color: "var(--color-text-secondary)" }}>for</span>
                      {item.duration} days
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>No medicines on this prescription.</p>
      )}

      {/* Notes */}
      <div className="mt-4 border-t pt-3" style={{ borderColor: "var(--color-border)" }}>
        <p className="mb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
          Notes
        </p>
        <p className="text-sm whitespace-pre-wrap" style={{ color: notes?.trim() ? "var(--color-text-primary)" : "var(--color-text-muted)" }}>
          {notes?.trim() || "—"}
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PublishedRxAccordion — single item (one Rx per appointment)
───────────────────────────────────────────────────────────── */

function PublishedRxAccordion({ rx }: { rx: PrescriptionForAppointmentTab }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="overflow-hidden rounded-xl"
      style={{
        background: "var(--color-glass-fill-data)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        border: "1px solid var(--color-green-border)",
      }}
    >
      {/* Collapsed header — balanced left/right */}
      <button
        type="button"
        className="w-full grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[color:var(--color-green-bg)]/30"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {/* Left: check icon + Rx ID + Published badge */}
        <div className="flex items-center gap-2 min-w-0">
          <CheckCircle2 className="size-4 shrink-0" style={{ color: "var(--color-green)" }} aria-hidden />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold" style={{ color: "var(--color-text-primary)" }}>
                {formatPrescriptionChartId(rx.chartId)}
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{ background: "var(--color-green-bg)", color: "var(--color-green)", border: "1px solid var(--color-green-border)" }}
              >
                Published
              </span>
            </div>
          </div>
        </div>
        {/* Right: medicine count + date + chevron */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>
              {rx.items.length} {rx.items.length === 1 ? "medicine" : "medicines"}
            </span>
            {rx.publishedAt && (
              <span className="text-[10px]" style={{ color: "var(--color-green)" }}>
                {format(parseISO(rx.publishedAt), "MMM d, yyyy · h:mm a")}
              </span>
            )}
          </div>
          <ChevronDown
            className="size-4 shrink-0 transition-transform duration-200"
            style={{ color: "var(--color-text-muted)", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
            aria-hidden
          />
        </div>
      </button>

      {/* Accordion body */}
      <div
        style={{
          display: "grid",
          gridTemplateRows: open ? "1fr" : "0fr",
          transition: "grid-template-rows 250ms ease",
        }}
      >
        <div style={{ overflow: "hidden" }}>
          <RxDocument
            items={rx.items}
            notes={rx.notes}
            publishedAt={rx.publishedAt}
            doctorId={rx.doctorId}
          />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Props
───────────────────────────────────────────────────────────── */

export interface PrescriptionsTabProps {
  appointmentId: string;
  initialPrescription: PrescriptionForAppointmentTab | null;
}

/* ─────────────────────────────────────────────────────────────
   PrescriptionsTab — main component
───────────────────────────────────────────────────────────── */

export function PrescriptionsTab({ appointmentId, initialPrescription }: PrescriptionsTabProps) {
  const [rx, setRx] = useState<PrescriptionForAppointmentTab | null>(initialPrescription);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearPending, setClearPending] = useState(false);
  const [showAddPicker, setShowAddPicker] = useState(false);
  const addPickerKey = useRef(0);

  const pendingPatches = useRef<Record<string, Record<string, unknown>>>({});
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const inFlight = useRef<Set<string>>(new Set());

  useEffect(() => { setRx(initialPrescription); }, [initialPrescription]);

  const published = rx?.publishedAt != null;
  const draft = rx != null && !published;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const itemIds = useMemo(() => (rx?.items ?? []).map((i) => i.id), [rx?.items]);

  /* ── Auto-save machinery ── */
  const flushDebounced = useCallback(async (itemId: string) => {
    // If a call is already running for this item, bail — the next debounce
    // cycle (queued by queueDebouncedPatch) will pick up any pending patches.
    if (inFlight.current.has(itemId)) return;
    const patch = pendingPatches.current[itemId];
    delete pendingPatches.current[itemId];
    if (!patch || Object.keys(patch).length === 0) return;
    inFlight.current.add(itemId);
    try {
      const res = await updatePrescriptionItem({ id: itemId, ...patch } as Parameters<typeof updatePrescriptionItem>[0]);
      if (!(await failToast(res))) return;
      applyPayload(setRx, res.data);
    } finally {
      inFlight.current.delete(itemId);
    }
  }, []);

  const queueDebouncedPatch = useCallback((itemId: string, patch: Record<string, unknown>) => {
    pendingPatches.current[itemId] = { ...pendingPatches.current[itemId], ...patch };
    const prev = debounceTimers.current[itemId];
    if (prev) clearTimeout(prev);
    debounceTimers.current[itemId] = setTimeout(() => {
      delete debounceTimers.current[itemId];
      void flushDebounced(itemId);
    }, 350);
  }, [flushDebounced]);

  const onPatch = useCallback(async (input: Parameters<typeof updatePrescriptionItem>[0]) => {
    const res = await updatePrescriptionItem(input);
    if (!(await failToast(res))) return;
    applyPayload(setRx, res.data);
  }, []);

  const onRemoveItem = useCallback(async (id: string) => {
    const res = await removePrescriptionItem({ id });
    if (!(await failToast(res))) return;
    applyPayload(setRx, res.data);
  }, []);

  const onDragEnd = useCallback(async (event: DragEndEvent) => {
    if (!rx || published) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const prevItems = [...rx.items];
    const oldIndex  = prevItems.findIndex((i) => i.id === active.id);
    const newIndex  = prevItems.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const newOrder = arrayMove(prevItems, oldIndex, newIndex);
    // Optimistically apply the new order immediately so cards don't snap back
    // to their original positions during the server round-trip.
    setRx((prev) =>
      prev ? { ...prev, items: newOrder.map((it, idx) => ({ ...it, sortOrder: idx })) } : prev
    );
    const payload = newOrder.map((it, idx) => ({ id: it.id, sortOrder: idx }));
    const res = await reorderPrescriptionItems({ prescriptionId: rx.id, items: payload });
    if (!(await failToast(res))) {
      setRx((prev) => prev ? { ...prev, items: prevItems } : prev); // roll back
      return;
    }
    applyPayload(setRx, res.data);
  }, [rx, published]);

  const handleAddMedicine = useCallback(async (medicineId: string) => {
    const res = await addPrescriptionItem({ appointmentId, medicineId });
    if (!(await failToast(res))) return;
    applyPayload(setRx, res.data);
    setShowAddPicker(false);
    addPickerKey.current += 1;
  }, [appointmentId]);

  const handleClear = useCallback(async () => {
    if (!rx) return;
    setClearPending(true);
    try {
      const res = await clearPrescriptionItems({ prescriptionId: rx.id });
      if (!(await failToast(res))) return;
      applyPayload(setRx, res.data);
      setClearOpen(false);
    } finally { setClearPending(false); }
  }, [rx]);

  const handlePublish = useCallback(async () => {
    if (!rx) return;
    const res = await publishPrescription({ prescriptionId: rx.id });
    if (!(await failToast(res))) return;
    applyPayload(setRx, res.data);
  }, [rx]);

  const handleNotesBlur = useCallback(async (raw: string) => {
    if (!rx || published) return;
    const trimmed = raw.trim();
    const next = trimmed === "" ? null : trimmed;
    if (next === (rx.notes ?? null)) return;
    const res = await updatePrescriptionNotes({ prescriptionId: rx.id, notes: next });
    if (!(await failToast(res))) return;
    applyPayload(setRx, res.data);
  }, [rx, published]);

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

  const showEmptyState = rx == null && !showAddPicker;

  /* ── Add picker block ── */
  const addPickerBlock = showAddPicker && (rx == null || draft) ? (
    <div
      className="rounded-xl p-4"
      style={{
        background: "var(--color-glass-fill-data)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        border: "1px solid var(--color-glass-border)",
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
        Add Medicine
      </p>
      <AsyncSearchCombobox<MedicinePickerRow>
        key={`add-${addPickerKey.current}-${rx?.items.length ?? 0}`}
        value=""
        onValueChange={(id) => { if (id) void handleAddMedicine(id); }}
        placeholder="Search medicines…"
        searchPlaceholder="Search by name, brand, category…"
        emptyLabel="No medicines found."
        fetchItems={fetchMedicinesEmpty}
        getOptionValue={(m) => m.id}
        getOptionLabel={(m) => m.name}
        renderOption={(m) => (
          <span className="flex flex-col gap-0.5 text-left">
            <span className="font-medium truncate" style={{ color: "var(--color-text-primary)" }}>{m.name}</span>
            <span className="text-xs truncate" style={{ color: "var(--color-text-secondary)" }}>{medicineSubtitle(m)}</span>
          </span>
        )}
      />
      <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => setShowAddPicker(false)}>
        Cancel
      </Button>
    </div>
  ) : null;

  /* ─── Render ─── */
  return (
    <div className="flex flex-col gap-4">

      {/* ── PUBLISHED STATE ── */}
      {published && rx ? (
        <PublishedRxAccordion rx={rx} />
      ) : null}

      {/* ── DRAFT STATE: header bar ── */}
      {draft && rx ? (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3"
          style={{ background: "var(--color-surface-alt)", border: "1px solid var(--color-border)" }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Pill className="size-4 shrink-0" style={{ color: "var(--color-text-muted)" }} aria-hidden />
            <div>
              <p className="text-xs font-bold" style={{ color: "var(--color-text-primary)" }}>
                {formatPrescriptionChartId(rx.chartId)}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>Draft · auto-saved</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2.5 text-xs" style={{ color: "var(--color-text-secondary)" }} onClick={() => setClearOpen(true)}>
              Clear
            </Button>
            <Button
              type="button" size="sm" className="h-7 px-3 text-xs font-semibold"
              disabled={rx.items.length === 0}
              onClick={() => void handlePublish()}
              style={{ background: "var(--color-ink)", color: "var(--color-ink-fg)" }}
            >
              Publish Rx
            </Button>
          </div>
        </div>
      ) : null}

      {/* ── EMPTY STATE: no prescription yet ── */}
      {showEmptyState ? (
        <div
          className="flex flex-col items-center justify-center gap-4 rounded-xl py-14 px-6 text-center"
          style={{
            background: "var(--color-glass-fill-data)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            border: "1px solid var(--color-glass-border)",
          }}
        >
          <div
            className="flex size-11 items-center justify-center rounded-full"
            style={{ background: "var(--color-surface-alt)", border: "1px solid var(--color-border)" }}
          >
            <Pill className="size-5" style={{ color: "var(--color-text-muted)" }} aria-hidden />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>No prescription yet</p>
            <p className="text-xs max-w-xs" style={{ color: "var(--color-text-muted)" }}>
              Add a medicine from your clinic library to create this visit's prescription.
            </p>
          </div>
          <Button type="button" size="sm" onClick={() => setShowAddPicker(true)}>+ Add Medicine</Button>
        </div>
      ) : null}

      {/* ── DRAFT: no medicines yet ── */}
      {draft && rx && rx.items.length === 0 && !showAddPicker ? (
        <p
          className="rounded-xl border border-dashed py-6 text-center text-xs"
          style={{ color: "var(--color-text-muted)", borderColor: "var(--color-border)" }}
        >
          No medicines yet — add one below.
        </p>
      ) : null}

      {/* ── Medicine cards (draft) ── */}
      {draft && rx && rx.items.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => void onDragEnd(e)}>
          <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-3">
              {rx.items.map((item, idx) => {
                const excludeMedicineIds = rx.items.filter((i) => i.id !== item.id).map((i) => i.medicineId);
                return (
                  <DraftSortableCard
                    key={item.id}
                    item={item}
                    index={idx}
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
      ) : null}

      {/* ── Add picker ── */}
      {addPickerBlock}

      {/* ── Add another medicine ── */}
      {draft && rx && !showEmptyState && !showAddPicker ? (
        <button
          type="button"
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed py-2.5 text-xs font-medium transition-colors hover:bg-[color:var(--color-surface-alt)]"
          style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
          onClick={() => setShowAddPicker(true)}
        >
          <Plus className="size-3.5" strokeWidth={2.5} />
          Add another medicine
        </button>
      ) : null}

      {/* ── Notes (draft only) ── */}
      {draft && rx ? (
        <div
          className="rounded-xl p-4"
          style={{
            background: "var(--color-glass-fill-data)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            border: "1px solid var(--color-glass-border)",
          }}
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>Notes</p>
            {(rx.notes?.length ?? 0) > 0 ? (
              <button
                type="button"
                className="flex size-5 items-center justify-center rounded transition-colors hover:bg-[color:var(--color-border)]"
                style={{ color: "var(--color-text-muted)" }}
                aria-label="Clear notes"
                onClick={() => void handleClearNotes()}
              >
                <X className="size-3" />
              </button>
            ) : null}
          </div>
          <Textarea
            rows={2}
            className="min-h-8 resize-none text-sm"
            placeholder="Clinical notes for this prescription…"
            defaultValue={rx.notes ?? ""}
            key={`notes-${rx.updatedAt}`}
            onBlur={(e) => void handleNotesBlur(e.target.value)}
          />
        </div>
      ) : null}

      {/* ── Clear dialog ── */}
      <AlertDialogPrimitive.Root open={clearOpen} onOpenChange={(o) => !clearPending && setClearOpen(o)}>
        <AlertDialogPrimitive.Portal>
          <AlertDialogPrimitive.Overlay
            className={cn(
              "data-[state=open]:animate-in data-[state=closed]:animate-out fixed inset-0 z-50 bg-black/50",
              clearPending && "pointer-events-none"
            )}
          />
          <AlertDialogPrimitive.Content className="bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-xl border p-6 shadow-lg sm:max-w-md outline-none">
            <AlertDialogPrimitive.Title className="text-base font-semibold" style={{ color: "var(--color-text-primary)" }}>
              Clear all medicines?
            </AlertDialogPrimitive.Title>
            <AlertDialogPrimitive.Description className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
              All medicine lines will be removed from this draft. Your Rx number and notes stay — you can add medicines again.
            </AlertDialogPrimitive.Description>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" disabled={clearPending} onClick={() => setClearOpen(false)}>Cancel</Button>
              <Button type="button" variant="destructive" size="sm" disabled={clearPending} onClick={() => void handleClear()}>Clear medicines</Button>
            </div>
          </AlertDialogPrimitive.Content>
        </AlertDialogPrimitive.Portal>
      </AlertDialogPrimitive.Root>
    </div>
  );
}
