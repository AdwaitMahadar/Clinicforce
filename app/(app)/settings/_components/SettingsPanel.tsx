"use client";

/**
 * Settings shell: header, main column with DetailPanelTabs (General + Templates +
 * Integrations). General tab: full appearance + preferences UI (`SettingsGeneralTab`).
 */

import { Suspense, type ReactNode } from "react";
import { FileStack, Plug, SlidersHorizontal } from "lucide-react";
import { DetailPanelTabs, type DetailPanelTabItem } from "@/components/common/DetailPanelTabs";
import { DetailPanelTabSkeleton } from "@/components/common/skeletons";
import { PanelCloseButton } from "@/components/common/PanelCloseButton";
import { SettingsGeneralTab } from "./SettingsGeneralTab";
import type { SettingsViewPayload } from "@/types/settings";
import { cn } from "@/lib/utils";

export type SettingsPanelProps = {
  payload: SettingsViewPayload;
  templatesTab: ReactNode;
  integrationsTab: ReactNode;
  onClose?: () => void;
  className?: string;
};

export function SettingsPanel({
  payload,
  templatesTab,
  integrationsTab,
  onClose,
  className,
}: SettingsPanelProps) {
  const tabItems: DetailPanelTabItem[] = [
    {
      key: "general",
      label: "General",
      icon: SlidersHorizontal,
      content: <SettingsGeneralTab payload={payload} />,
    },
    {
      key: "templates",
      label: "Templates",
      icon: FileStack,
      content: (
        <Suspense fallback={<DetailPanelTabSkeleton />}>
          {templatesTab}
        </Suspense>
      ),
    },
    {
      key: "integrations",
      label: "Integrations",
      icon: Plug,
      content: (
        <Suspense fallback={<DetailPanelTabSkeleton />}>
          {integrationsTab}
        </Suspense>
      ),
    },
  ];

  return (
    <div className={cn("flex h-full min-h-0 flex-col overflow-hidden", className)}>
      <div
        className="flex shrink-0 items-center justify-between gap-3 px-6 py-4"
        style={{
          borderBottom: "1px solid var(--color-border)",
          background: "var(--color-surface-alt)",
        }}
      >
        <h2
          className="text-lg font-semibold tracking-tight"
          style={{ color: "var(--color-text-primary)" }}
        >
          Settings
        </h2>
        {onClose && <PanelCloseButton onClose={onClose} />}
      </div>

      <DetailPanelTabs
        tabs={tabItems}
        resetKey="settings"
        layoutGroupId="settings-tabs"
        className="h-full min-h-0"
      />
    </div>
  );
}
