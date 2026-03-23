"use client";

/**
 * Right-column shell: optional tabbed top zone + always-visible activity log.
 * Colours via CSS variables only — see globals.css.
 */

import { useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { EventLog } from "@/components/common/EventLog";
import type { LogEvent } from "@/components/common/EventLog";
import { cn } from "@/lib/utils";

export interface DetailSidebarTab {
  label: string;
  icon?: LucideIcon;
  content: ReactNode;
}

export interface DetailSidebarProps {
  /** When empty or omitted, the top zone is not rendered. */
  tabs?: DetailSidebarTab[];
  events: LogEvent[];
  className?: string;
}

export function DetailSidebar({ tabs, events, className }: DetailSidebarProps) {
  const hasTabs = Boolean(tabs && tabs.length > 0);
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div
      className={cn("flex h-full min-h-0 flex-col overflow-hidden", className)}
      style={{
        background: "var(--color-surface-alt)",
        borderLeft: "1px solid var(--color-border)",
      }}
    >
      {hasTabs && (
        <>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div
              className="flex shrink-0 items-center justify-between px-4 py-3"
              style={{
                borderBottom: "1px solid var(--color-border)",
                background: "var(--color-glass-fill)",
              }}
            >
              <div className="flex gap-4">
                {tabs!.map((tab, i) => {
                  const Icon = tab.icon;
                  const active = activeIndex === i;
                  return (
                    <button
                      key={`${tab.label}-${i}`}
                      type="button"
                      onClick={() => setActiveIndex(i)}
                      className="flex items-center gap-1.5 border-b-2 pb-1 text-sm font-semibold capitalize transition-colors"
                      style={{
                        color: active
                          ? "var(--color-text-primary)"
                          : "var(--color-text-muted)",
                        borderColor: active
                          ? "var(--color-text-primary)"
                          : "transparent",
                      }}
                    >
                      {Icon && <Icon size={15} />}
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {tabs![activeIndex]?.content}
            </div>
          </div>

          <div
            className="h-px shrink-0"
            style={{ background: "var(--color-border)" }}
            aria-hidden
          />
        </>
      )}

      <div
        className={cn(
          "flex min-h-0 flex-col overflow-hidden",
          hasTabs ? "shrink-0" : "min-h-0 flex-1"
        )}
        style={
          hasTabs
            ? {
                height: "min(40vh, 320px)",
                maxHeight: "45%",
              }
            : undefined
        }
      >
        <div className="shrink-0 px-5 pb-3 pt-5">
          <p
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: "var(--color-text-muted)" }}
          >
            Activity Log
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
          <EventLog events={events} maxHeight="100%" className="h-full" />
        </div>
      </div>
    </div>
  );
}
