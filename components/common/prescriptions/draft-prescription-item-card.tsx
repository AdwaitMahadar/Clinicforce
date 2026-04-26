"use client";

import { useCallback, useEffect, useRef, useState, type ComponentProps, type CSSProperties } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { searchMedicinesForPicker } from "@/lib/actions/medicines";
import { updatePrescriptionItem } from "@/lib/actions/prescriptions";
import type { PrescriptionItemForAppointmentTab } from "@/types/prescription";
import { AsyncSearchCombobox } from "@/components/common/AsyncSearchCombobox";
import { DoseSlotRow } from "@/components/common/prescriptions/dose-slot-row";
import { PRESCRIPTION_DOSE_SLOTS } from "@/components/common/prescriptions/prescription-slots";
import {
  medicineSubtitle,
  type MedicinePickerRow,
} from "@/components/common/prescriptions/prescription-tab-helpers";
import { cn } from "@/lib/utils";

export function DraftMedicineCard({
  item,
  index,
  excludeMedicineIds,
  onPatch,
  onRemove,
  queueDebouncedPatch,
  dragHandleRef,
  dragHandleProps,
  isDragging,
  embedded = false,
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
  /** When true, sits inside the prescription shell — lighter frame, no outer drop shadow. */
  embedded?: boolean;
}) {
  const fetchMedicines = useCallback(async (query: string) => {
    const res = await searchMedicinesForPicker({ query, excludeIds: excludeMedicineIds });
    if (!res.success) return [];
    return res.data as MedicinePickerRow[];
  }, [excludeMedicineIds]);

  const [draftDuration, setDraftDuration] = useState<string>(item.duration ?? "");
  const [draftRemarks, setDraftRemarks] = useState<string>(item.remarks ?? "");

  const durationFocusedRef = useRef(false);
  const remarksFocusedRef = useRef(false);

  useEffect(() => {
    if (!durationFocusedRef.current) setDraftDuration(item.duration ?? "");
  }, [item.duration, item.updatedAt]);
  useEffect(() => {
    if (!remarksFocusedRef.current) setDraftRemarks(item.remarks ?? "");
  }, [item.remarks, item.updatedAt]);

  return (
    <div
      className={cn(
        "group relative overflow-hidden transition-shadow",
        embedded ? "rounded-xl" : "rounded-2xl"
      )}
      style={{
        background: embedded ? "var(--color-surface)" : "var(--color-glass-fill-data)",
        backdropFilter: embedded ? undefined : "blur(10px)",
        WebkitBackdropFilter: embedded ? undefined : "blur(10px)",
        border: embedded ? "1px solid var(--color-border)" : "1px solid var(--color-glass-border)",
        boxShadow: isDragging ? "var(--shadow-main)" : embedded ? "none" : "var(--shadow-card)",
      }}
    >
      <div
        className="flex items-center gap-2 border-b px-4 py-2.5"
        style={{ borderColor: "var(--color-glass-border)", background: "var(--color-surface-alt)" }}
      >
        <span
          className="flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text-muted)",
          }}
        >
          {index + 1}
        </span>
        <div className="min-w-0 flex-1" onPointerDown={(e) => e.stopPropagation()}>
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
                <span className="font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
                  {m.name}
                </span>
                <span className="text-xs truncate" style={{ color: "var(--color-text-secondary)" }}>
                  {medicineSubtitle(m)}
                </span>
              </span>
            )}
            chevronPosition="start"
            chevronVisibility="hover"
            closedSelectionLabelClassName="font-semibold"
            triggerClassName={cn(
              "rounded-lg border-0 bg-transparent px-2 shadow-none ring-0",
              "focus-visible:ring-1 focus-visible:ring-[color:var(--color-border)] focus-visible:ring-offset-0",
              "hover:bg-[color:var(--color-surface)]/45 data-[state=open]:bg-[color:var(--color-surface)]/45"
            )}
            triggerStyle={{
              background: "transparent",
              borderColor: "transparent",
            }}
          />
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
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

      <div className="flex items-center gap-3 px-4 py-3" onPointerDown={(e) => e.stopPropagation()}>
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
          onFocus={() => {
            durationFocusedRef.current = true;
          }}
          onBlur={() => {
            durationFocusedRef.current = false;
            const next = draftDuration.trim() || null;
            if (next !== (item.duration ?? null)) void onPatch({ id: item.id, duration: next });
          }}
        />
        <input
          type="text"
          className="h-9 min-w-0 flex-1 truncate rounded-lg border px-3 text-sm focus:outline-none focus:ring-1"
          style={{
            background: "var(--color-surface-alt)",
            borderColor: "var(--color-border)",
            color: "var(--color-text-primary)",
          }}
          placeholder="Remarks (optional)…"
          value={draftRemarks}
          onChange={(e) => setDraftRemarks(e.target.value)}
          onFocus={() => {
            remarksFocusedRef.current = true;
          }}
          onBlur={() => {
            remarksFocusedRef.current = false;
            const next = draftRemarks.trim() || null;
            if (next !== (item.remarks ?? null)) void onPatch({ id: item.id, remarks: next });
          }}
        />
      </div>

      <div className="grid grid-cols-3 gap-3 px-4 pb-3 pt-1" onPointerDown={(e) => e.stopPropagation()}>
        {PRESCRIPTION_DOSE_SLOTS.map((slot) => {
          const en = item[slot.enabled];
          const qty = item[slot.qty];
          const mg = item[slot.timing] as "before_food" | "after_food";
          return (
            <DoseSlotRow
              key={slot.key}
              slot={slot}
              enabled={en}
              quantity={qty}
              meal={mg}
              itemId={item.id}
              itemUpdatedAt={item.updatedAt}
              onToggle={() =>
                void onPatch({ id: item.id, [slot.enabled]: !en } as Parameters<typeof updatePrescriptionItem>[0])
              }
              queueDebouncedPatch={queueDebouncedPatch}
            />
          );
        })}
      </div>
    </div>
  );
}

export function DraftSortableCard(
  props: Omit<ComponentProps<typeof DraftMedicineCard>, "dragHandleRef" | "dragHandleProps" | "isDragging">
) {
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
