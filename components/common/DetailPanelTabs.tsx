"use client";

/**
 * Tabbed content region for entity detail panels: Details + optional domain tabs.
 * Single-tab mode hides the switcher. Active tab resets when `resetKey` changes.
 * Tab indicator: one shared sliding underline (Framer Motion layoutId).
 */

import { useEffect, useState, type ReactNode } from "react";
import { LayoutGroup, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DetailPanelTabItem {
  key: string;
  label: string;
  icon?: LucideIcon;
  content: ReactNode;
}

export interface DetailPanelTabsProps {
  tabs: DetailPanelTabItem[];
  /** When this changes (entity switch / create vs edit), the active tab resets to Details. */
  resetKey: string;
  /** Unique id so multiple mounted panels never share motion layoutIds. */
  layoutGroupId: string;
  className?: string;
}

export function DetailPanelTabs({
  tabs,
  resetKey,
  layoutGroupId,
  className,
}: DetailPanelTabsProps) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    setActive(0);
  }, [resetKey]);

  const safeActive = Math.min(active, Math.max(0, tabs.length - 1));
  const single = tabs.length <= 1;

  if (tabs.length === 0) return null;

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden", className)}>
      {!single && (
        <div
          className="shrink-0 px-6"
          style={{
            borderBottom: "1px solid var(--color-border)",
            background: "var(--color-surface-alt)",
          }}
        >
          <LayoutGroup id={layoutGroupId}>
            <div className="flex gap-6">
              {tabs.map((tab, i) => {
                const Icon = tab.icon;
                const isActive = i === safeActive;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActive(i)}
                    className="relative pb-3 pt-3 text-sm font-semibold capitalize transition-colors"
                    style={{
                      color: isActive
                        ? "var(--color-text-primary)"
                        : "var(--color-text-muted)",
                    }}
                  >
                    <span className="flex items-center gap-1.5">
                      {Icon && <Icon size={15} aria-hidden />}
                      {tab.label}
                    </span>
                    {isActive && (
                      <motion.div
                        layoutId={`${layoutGroupId}-tab-line`}
                        className="absolute right-0 bottom-0 left-0 h-[3px] rounded-full"
                        style={{ background: "var(--color-text-primary)" }}
                        transition={{
                          type: "spring",
                          stiffness: 420,
                          damping: 34,
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </LayoutGroup>
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        {tabs[safeActive]?.content}
      </div>
    </div>
  );
}
