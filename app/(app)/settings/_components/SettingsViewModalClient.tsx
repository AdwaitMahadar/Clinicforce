"use client";

import { useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { SettingsViewPayload } from "@/types/settings";
import { SettingsPanel } from "./SettingsPanel";

type Props = {
  payload: SettingsViewPayload;
  templatesTab: ReactNode;
  integrationsTab: ReactNode;
};

/**
 * Intercepting `/settings` modal: `onClose` is `router.back()` so the matrix page
 * behind the dialog keeps its URL state.
 */
export function SettingsViewModalClient({ payload, templatesTab, integrationsTab }: Props) {
  const router = useRouter();
  const onClose = useCallback(() => router.back(), [router]);

  return (
    <SettingsPanel
      payload={payload}
      templatesTab={templatesTab}
      integrationsTab={integrationsTab}
      onClose={onClose}
    />
  );
}
