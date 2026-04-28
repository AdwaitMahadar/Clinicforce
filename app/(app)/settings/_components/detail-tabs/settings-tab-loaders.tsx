import {
  fetchSettingsDetailIntegrationsTabCached,
  fetchSettingsDetailTemplatesTabCached,
} from "@/lib/detail-tab-fetch-cache";

function SettingsTabPlaceholder({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="space-y-3 px-6 py-4">
      <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
        {title}
      </h3>
      <div
        className="flex min-h-48 items-center justify-center rounded-xl border border-dashed px-4 py-8 text-center text-sm"
        style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
      >
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

export async function SettingsTemplatesTabLoader() {
  const res = await fetchSettingsDetailTemplatesTabCached();
  if (!res.success) {
    return (
      <SettingsTabPlaceholder
        title="Templates"
        subtitle="You do not have access to this section."
      />
    );
  }
  return <SettingsTabPlaceholder title={res.data.title} subtitle={res.data.subtitle} />;
}

export async function SettingsIntegrationsTabLoader() {
  const res = await fetchSettingsDetailIntegrationsTabCached();
  if (!res.success) {
    return (
      <SettingsTabPlaceholder
        title="Integrations"
        subtitle="You do not have access to this section."
      />
    );
  }
  return <SettingsTabPlaceholder title={res.data.title} subtitle={res.data.subtitle} />;
}
