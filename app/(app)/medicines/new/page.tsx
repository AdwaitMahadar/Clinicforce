/**
 * app/(app)/medicines/new/page.tsx
 *
 * Full-page fallback for adding a new medicine.
 * Shown on direct URL access / refresh of /medicines/new.
 * When navigated to via the "Add Medicine" button (client-side),
 * the @modal intercepting route takes over instead.
 */

import { MedicineDetailPanel } from "../_components/MedicineDetailPanel";

export default function NewMedicinePage() {
  return (
    <div className="p-8 h-full flex flex-col">
      <div className="max-w-[1700px] mx-auto w-full flex-1 min-h-0 flex flex-col">
        <p
          className="text-xs font-medium mb-6"
          style={{ color: "var(--color-text-muted)" }}
        >
          Medicines › New Medicine
        </p>

        <div
          className="flex-1 rounded-2xl overflow-hidden min-h-0"
          style={{
            background: "var(--color-glass-fill-data)",
            border: "1px solid var(--color-border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <MedicineDetailPanel mode="create" />
        </div>
      </div>
    </div>
  );
}
