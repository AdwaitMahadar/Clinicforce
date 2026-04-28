import {
  fetchSettingsDetailIntegrationsTabCached,
  fetchSettingsDetailTemplatesTabCached,
} from "@/lib/detail-tab-fetch-cache";
import { ParallelTabDataPrefetch } from "@/lib/parallel-tab-data-prefetch";

/**
 * Parallel warm-up for Settings non–General tabs (Templates, Integrations).
 * Compose beside `loadSettingsViewData` on `/settings` routes (step 4).
 */
export async function SettingsDetailPrefetchGroup() {
  return (
    <ParallelTabDataPrefetch
      slices={[
        {
          key: "templates",
          prefetch: () => fetchSettingsDetailTemplatesTabCached(),
        },
        {
          key: "integrations",
          prefetch: () => fetchSettingsDetailIntegrationsTabCached(),
        },
      ]}
    />
  );
}
