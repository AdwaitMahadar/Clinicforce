import { notFound } from "next/navigation";
import { loadSettingsViewData } from "@/app/(app)/settings/_lib/settings-view-data";
import { SettingsDetailPrefetchGroup } from "@/app/(app)/settings/_components/detail-tabs/settings-detail-prefetch-group";
import {
  SettingsIntegrationsTabLoader,
  SettingsTemplatesTabLoader,
} from "@/app/(app)/settings/_components/detail-tabs/settings-tab-loaders";
import { SettingsPanel } from "@/app/(app)/settings/_components/SettingsPanel";
import { SettingsViewModalClient } from "@/app/(app)/settings/_components/SettingsViewModalClient";

type Props = {
  /** When true, wraps the panel in the modal client (router.back close). */
  forModal?: boolean;
};

/**
 * Shared RSC for `/settings` full page and the intercepting modal: blocking data,
 * parallel prefetch, tab loaders.
 */
export async function SettingsViewContent({ forModal = false }: Props) {
  const payload = await loadSettingsViewData();
  if (!payload) notFound();

  const templatesTab = <SettingsTemplatesTabLoader />;
  const integrationsTab = <SettingsIntegrationsTabLoader />;

  return (
    <>
      <SettingsDetailPrefetchGroup />
      {forModal ? (
        <SettingsViewModalClient
          payload={payload}
          templatesTab={templatesTab}
          integrationsTab={integrationsTab}
        />
      ) : (
        <SettingsPanel
          payload={payload}
          templatesTab={templatesTab}
          integrationsTab={integrationsTab}
        />
      )}
    </>
  );
}
