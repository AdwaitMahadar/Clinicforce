/**
 * components/common/ReportsComingSoon.tsx
 *
 * Placeholder shown in all Reports views while reporting features are pending.
 * Accepts per-section title and subtitle via props so one component serves
 * all four reports stubs (home, patients, medicines, appointments).
 */

import { PageHeader } from "@/components/layout/PageHeader";

interface ReportsComingSoonProps {
  title:    string;
  subtitle: string;
}

export function ReportsComingSoon({ title, subtitle }: ReportsComingSoonProps) {
  return (
    <div className="p-8 h-full">
      <div className="max-w-[1700px] mx-auto w-full">
        <PageHeader title={title} subtitle={subtitle} />
        <div
          className="flex items-center justify-center h-64 rounded-xl border-2 border-dashed"
          style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
        >
          <p className="text-sm">Reports — coming in Phase 3</p>
        </div>
      </div>
    </div>
  );
}
