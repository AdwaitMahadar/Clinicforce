/**
 * Full-page fallback for Settings.
 * Shown on direct URL access or hard refresh of `/settings`. In-app links use
 * the `(.)settings` intercepting modal.
 */

import { SettingsViewContent } from "./_components/SettingsViewContent";
import { DetailPageShell } from "@/components/layout/DetailPageShell";

export default async function SettingsPage() {
  return (
    <DetailPageShell breadcrumb="Settings">
      <SettingsViewContent />
    </DetailPageShell>
  );
}
