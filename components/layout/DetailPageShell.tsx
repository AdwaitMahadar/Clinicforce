/**
 * components/layout/DetailPageShell.tsx
 *
 * Full-page wrapper shared by all entity detail and create pages:
 *   patients/new, patients/view/[id]
 *   medicines/new, medicines/view/[id]
 *   appointments/new, appointments/view/[id]
 *
 * Provides:
 *   - Outer padding + flex column filling the viewport
 *   - Max-width content column (matches dashboard pages)
 *   - Breadcrumb line above the glass card
 *   - Glass card container that stretches to fill available height
 */

interface DetailPageShellProps {
  /** Breadcrumb string displayed above the card, e.g. "Patients › New Patient". */
  breadcrumb: string;
  children:   React.ReactNode;
}

export function DetailPageShell({ breadcrumb, children }: DetailPageShellProps) {
  return (
    <div className="p-8 h-full flex flex-col">
      <div className="max-w-[1700px] mx-auto w-full flex-1 min-h-0 flex flex-col">
        <p
          className="text-xs font-medium mb-6"
          style={{ color: "var(--color-text-muted)" }}
        >
          {breadcrumb}
        </p>

        <div
          className="flex-1 rounded-2xl overflow-hidden min-h-0"
          style={{
            background: "var(--color-glass-fill-data)",
            border:     "1px solid var(--color-border)",
            boxShadow:  "var(--shadow-card)",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
