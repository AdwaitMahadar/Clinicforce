"use client";

import { format, parseISO } from "date-fns";
import { CheckCircle2 } from "lucide-react";
import type { PrescriptionItemForAppointmentTab } from "@/types/prescription";
import { PRESCRIPTION_DOSE_SLOTS } from "@/components/common/prescriptions/prescription-slots";

export type RxClinicalDocumentLayout = "plain" | "accordionPanel";

export interface RxClinicalDocumentProps {
  items: PrescriptionItemForAppointmentTab[];
  /** When `undefined`, the Notes block is omitted (patient accordion). Otherwise shown. */
  notes?: string | null;
  /** When set, shows the green “Published …” stamp (appointment published accordion). */
  publishedAt?: string | null;
  layout?: RxClinicalDocumentLayout;
}

/**
 * Read-only ℞ body: optional published stamp, divider, medicine rows, optional notes.
 */
export function RxClinicalDocument({
  items,
  notes,
  publishedAt,
  layout = "accordionPanel",
}: RxClinicalDocumentProps) {
  const rootClass =
    layout === "accordionPanel"
      ? "rounded-b-xl border-t px-5 py-4"
      : "border-t px-5 py-4";

  return (
    <div
      className={rootClass}
      style={{ borderColor: "var(--color-glass-border)", background: "var(--color-surface)" }}
    >
      {publishedAt ? (
        <div className="mb-4 flex items-center gap-1.5">
          <CheckCircle2 className="size-3.5 shrink-0" style={{ color: "var(--color-green)" }} aria-hidden />
          <span className="text-[11px] font-semibold" style={{ color: "var(--color-green)" }}>
            Published {format(parseISO(publishedAt), "MMM d, yyyy · h:mm a")}
          </span>
        </div>
      ) : null}

      <div className="mb-4 flex items-center gap-3">
        <span
          className="text-2xl font-light leading-none select-none"
          style={{ color: "var(--color-text-muted)", fontFamily: "serif" }}
          aria-hidden
        >
          ℞
        </span>
        <div className="flex-1 border-t" style={{ borderColor: "var(--color-border)" }} />
      </div>

      {items.length > 0 ? (
        <div className="flex flex-col divide-y" style={{ borderColor: "var(--color-border)" }}>
          {items.map((item, idx) => {
            const activeSlots = PRESCRIPTION_DOSE_SLOTS.filter((s) => item[s.enabled]);
            return (
              <div key={item.id} className="grid grid-cols-[1fr_auto] items-start gap-4 py-3">
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
                    {item.remarks?.trim() ? (
                      <p className="mt-0.5 text-xs italic" style={{ color: "var(--color-text-secondary)" }}>
                        {item.remarks}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {activeSlots.length > 0 ? (
                    <div className="flex flex-wrap justify-end gap-1">
                      {activeSlots.map((s) => {
                        const qty = item[s.qty];
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
                    <span className="text-[11px] italic" style={{ color: "var(--color-text-muted)" }}>
                      No doses
                    </span>
                  )}
                  {item.duration?.trim() ? (
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{
                        background: "var(--color-surface-alt)",
                        border: "1px solid var(--color-border)",
                        color: "var(--color-text-muted)",
                      }}
                    >
                      <span className="font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                        for
                      </span>
                      {item.duration} days
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          No medicines on this prescription.
        </p>
      )}

      {notes !== undefined ? (
        <div className="mt-4 border-t pt-3" style={{ borderColor: "var(--color-border)" }}>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
            Notes
          </p>
          <p
            className="text-sm whitespace-pre-wrap"
            style={{ color: notes?.trim() ? "var(--color-text-primary)" : "var(--color-text-muted)" }}
          >
            {notes?.trim() || "—"}
          </p>
        </div>
      ) : null}
    </div>
  );
}
