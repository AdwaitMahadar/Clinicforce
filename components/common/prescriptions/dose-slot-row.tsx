"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { PrescriptionDoseSlot } from "@/components/common/prescriptions/prescription-slots";

/** Spring that matches the topnav sliding pill — snappy, no overshoot */
export const mealSliderSpring = { type: "spring", stiffness: 880, damping: 46, mass: 0.32 } as const;

export function DoseSlotRow({
  slot,
  enabled,
  quantity,
  meal,
  itemId,
  itemUpdatedAt,
  onToggle,
  queueDebouncedPatch,
}: {
  slot: PrescriptionDoseSlot;
  enabled: boolean;
  quantity: number;
  meal: "before_food" | "after_food";
  itemId: string;
  itemUpdatedAt: string;
  onToggle: () => void;
  queueDebouncedPatch: (id: string, patch: Record<string, unknown>) => void;
}) {
  const [draftEnabled, setDraftEnabled] = useState<boolean | null>(null);
  const [draftQty, setDraftQty] = useState<number | null>(null);
  const [draftMeal, setDraftMeal] = useState<"before_food" | "after_food" | null>(null);

  const pendingEnabledRef = useRef<boolean | null>(null);
  const pendingQtyRef = useRef<number | null>(null);
  const pendingMealRef = useRef<"before_food" | "after_food" | null>(null);

  const displayEnabled = draftEnabled ?? enabled;
  const display = draftQty ?? quantity;
  const isBefore = (draftMeal ?? meal) === "before_food";

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
      <div className="grid items-center gap-1" style={{ gridTemplateColumns: "auto 1fr auto" }}>
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
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-secondary)",
            }}
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
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-secondary)",
            }}
            onClick={() => pushQty(display + 1)}
          >
            +
          </button>
        </div>
      </div>

      <div onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
        <div
          className="relative flex items-center rounded-full p-0.5"
          style={{
            background: "var(--color-surface)",
            border: `1px solid ${displayEnabled ? slot.color.border : "var(--color-border)"}`,
          }}
          role="group"
          aria-label="Meal timing"
        >
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
