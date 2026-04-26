"use client";

/**
 * Appointment detail — Prescriptions tab.
 *
 * DRAFT state:   `DraftPrescriptionShell` with nested line cards, add-medicine controls, notes.
 * PUBLISHED state: `PublishedPrescriptionAccordion` → read-only ℞ (`RxClinicalDocument`).
 *
 * Implementation pieces live under `components/common/prescriptions/`.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Pill, Plus, X } from "lucide-react";
import { AlertDialog as AlertDialogPrimitive } from "radix-ui";
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
import type { PrescriptionForAppointmentTab } from "@/types/prescription";
import type { PatientPrescriptionSummary } from "@/types/patient";
import { AsyncSearchCombobox } from "@/components/common/AsyncSearchCombobox";
import { DraftPrescriptionShell } from "@/components/common/prescriptions/draft-prescription-shell";
import { DraftSortableCard } from "@/components/common/prescriptions/draft-prescription-item-card";
import { PublishedPrescriptionAccordion } from "@/components/common/prescriptions/published-prescription-accordion";
import { PrescriptionPublishedHistoryList } from "@/components/common/prescriptions/prescription-published-history-list";
import {
  applyPayload,
  failToast,
  medicineSubtitle,
  type MedicinePickerRow,
} from "@/components/common/prescriptions/prescription-tab-helpers";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface PrescriptionsTabProps {
  appointmentId: string;
  initialPrescription: PrescriptionForAppointmentTab | null;
  /** This visit — used to dedupe `initialPrescriptionHistory` so the published current row is not listed twice. */
  currentAppointmentId: string;
  /** Published prescriptions for the patient (`getPrescriptionsByPatient`); drafts never appear. */
  initialPrescriptionHistory: PatientPrescriptionSummary[];
}

export function PrescriptionsTab({
  appointmentId,
  initialPrescription,
  currentAppointmentId,
  initialPrescriptionHistory,
}: PrescriptionsTabProps) {
  const router = useRouter();
  const [rx, setRx] = useState<PrescriptionForAppointmentTab | null>(initialPrescription);
  const [history, setHistory] = useState<PatientPrescriptionSummary[]>(initialPrescriptionHistory);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearPending, setClearPending] = useState(false);
  const [showAddPicker, setShowAddPicker] = useState(false);
  const addPickerKey = useRef(0);

  const pendingPatches = useRef<Record<string, Record<string, unknown>>>({});
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const inFlight = useRef<Set<string>>(new Set());

  useEffect(() => {
    setRx(initialPrescription);
  }, [initialPrescription]);

  useEffect(() => {
    setHistory(initialPrescriptionHistory);
  }, [initialPrescriptionHistory]);

  const otherPrescriptions = useMemo(
    () => history.filter((p) => p.appointmentId !== currentAppointmentId),
    [history, currentAppointmentId]
  );

  const published = rx?.publishedAt != null;
  const draft = rx != null && !published;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const itemIds = useMemo(() => (rx?.items ?? []).map((i) => i.id), [rx?.items]);

  const flushDebounced = useCallback(async (itemId: string) => {
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

  const queueDebouncedPatch = useCallback(
    (itemId: string, patch: Record<string, unknown>) => {
      pendingPatches.current[itemId] = { ...pendingPatches.current[itemId], ...patch };
      const prev = debounceTimers.current[itemId];
      if (prev) clearTimeout(prev);
      debounceTimers.current[itemId] = setTimeout(() => {
        delete debounceTimers.current[itemId];
        void flushDebounced(itemId);
      }, 350);
    },
    [flushDebounced]
  );

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

  const onDragEnd = useCallback(
    async (event: DragEndEvent) => {
      if (!rx || published) return;
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const prevItems = [...rx.items];
      const oldIndex = prevItems.findIndex((i) => i.id === active.id);
      const newIndex = prevItems.findIndex((i) => i.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return;
      const newOrder = arrayMove(prevItems, oldIndex, newIndex);
      setRx((prev) =>
        prev ? { ...prev, items: newOrder.map((it, idx) => ({ ...it, sortOrder: idx })) } : prev
      );
      const payload = newOrder.map((it, idx) => ({ id: it.id, sortOrder: idx }));
      const res = await reorderPrescriptionItems({ prescriptionId: rx.id, items: payload });
      if (!(await failToast(res))) {
        setRx((prev) => (prev ? { ...prev, items: prevItems } : prev));
        return;
      }
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
    router.refresh();
  }, [rx, router]);

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

  const showEmptyState = rx == null && !showAddPicker;

  const addMedicineComboboxKey = `add-${addPickerKey.current}-${rx?.items.length ?? 0}`;

  const renderAddMedicinePicker = (embedded: boolean) => (
    <div
      className={embedded ? "rounded-lg border border-dashed p-3" : "rounded-xl p-4"}
      style={
        embedded
          ? {
              background: "var(--color-surface-alt)",
              borderColor: "var(--color-border)",
            }
          : {
              background: "var(--color-glass-fill-data)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              border: "1px solid var(--color-glass-border)",
            }
      }
      onPointerDown={(e) => e.stopPropagation()}
    >
      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
        Add Medicine
      </p>
      <AsyncSearchCombobox<MedicinePickerRow>
        key={addMedicineComboboxKey}
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
          <span className="flex flex-col gap-0.5 text-left">
            <span className="font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
              {m.name}
            </span>
            <span className="text-xs truncate" style={{ color: "var(--color-text-secondary)" }}>
              {medicineSubtitle(m)}
            </span>
          </span>
        )}
      />
      <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => setShowAddPicker(false)}>
        Cancel
      </Button>
    </div>
  );

  const standaloneAddPicker = showAddPicker && rx == null ? renderAddMedicinePicker(false) : null;

  return (
    <div className="flex flex-col gap-4">
      {published && rx ? <PublishedPrescriptionAccordion rx={rx} highlightCurrent /> : null}

      {draft && rx ? (
        <DraftPrescriptionShell
          rx={rx}
          collapsible
          defaultOpen={rx.items.length > 0 || showAddPicker}
          onClearClick={() => setClearOpen(true)}
          onPublishClick={() => void handlePublish()}
          notesFooter={
            <>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
                  Notes
                </p>
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
                className="min-h-8 resize-none border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
                placeholder="Clinical notes for this prescription…"
                defaultValue={rx.notes ?? ""}
                key={`notes-${rx.updatedAt}`}
                onBlur={(e) => void handleNotesBlur(e.target.value)}
              />
            </>
          }
        >
          {rx.items.length === 0 && !showAddPicker ? (
            <p
              className="rounded-lg border border-dashed py-5 text-center text-xs"
              style={{ color: "var(--color-text-muted)", borderColor: "var(--color-border)" }}
            >
              No medicines yet — add one below.
            </p>
          ) : null}

          {rx.items.length > 0 ? (
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
                        embedded
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          ) : null}

          {showAddPicker ? renderAddMedicinePicker(true) : null}

          {!showEmptyState && !showAddPicker ? (
            <button
              type="button"
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed py-2.5 text-xs font-medium transition-colors hover:bg-[color:var(--color-surface-alt)]"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
              onClick={() => setShowAddPicker(true)}
            >
              <Plus className="size-3.5" strokeWidth={2.5} />
              Add another medicine
            </button>
          ) : null}
        </DraftPrescriptionShell>
      ) : null}

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
            <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
              No prescription yet
            </p>
            <p className="text-xs max-w-xs" style={{ color: "var(--color-text-muted)" }}>
              Add a medicine from your clinic library to create this visit's prescription.
            </p>
          </div>
          <Button type="button" size="sm" onClick={() => setShowAddPicker(true)}>
            + Add Medicine
          </Button>
        </div>
      ) : null}

      {standaloneAddPicker}

      {otherPrescriptions.length > 0 ? (
        <div
          className="flex flex-col gap-2 border-t pt-4"
          style={{ borderColor: "var(--color-border)" }}
        >
          <p
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: "var(--color-text-muted)" }}
          >
            Other prescriptions
          </p>
          <div className="max-h-[min(24rem,50vh)] min-h-0 overflow-y-auto pr-1">
            <PrescriptionPublishedHistoryList prescriptions={otherPrescriptions} />
          </div>
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
          <AlertDialogPrimitive.Content className="bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-xl border p-6 shadow-lg sm:max-w-md outline-none">
            <AlertDialogPrimitive.Title className="text-base font-semibold" style={{ color: "var(--color-text-primary)" }}>
              Clear all medicines?
            </AlertDialogPrimitive.Title>
            <AlertDialogPrimitive.Description className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
              All medicine lines will be removed from this draft. Your Rx number and notes stay — you can add medicines
              again.
            </AlertDialogPrimitive.Description>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" disabled={clearPending} onClick={() => setClearOpen(false)}>
                Cancel
              </Button>
              <Button type="button" variant="destructive" size="sm" disabled={clearPending} onClick={() => void handleClear()}>
                Clear medicines
              </Button>
            </div>
          </AlertDialogPrimitive.Content>
        </AlertDialogPrimitive.Portal>
      </AlertDialogPrimitive.Root>
    </div>
  );
}
