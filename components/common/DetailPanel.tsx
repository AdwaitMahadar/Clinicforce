"use client";

/**
 * Shared shell for entity detail views: header, tabbed content column, optional
 * activity sidebar, footer actions.
 * Non-Details tab bodies are wrapped in `Suspense` so async RSC tab loaders can stream.
 * Colours via CSS variables only — see globals.css.
 */

import { Suspense, type ReactNode, type RefObject } from "react";
import { CalendarDays, FileText, Pill, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DetailFormHandle } from "@/components/common/DetailForm";
import { DetailSidebar } from "@/components/common/DetailSidebar";
import { DetailPanelTabs, type DetailPanelTabItem } from "@/components/common/DetailPanelTabs";
import { DetailPanelTabSkeleton } from "@/components/common/skeletons";
import type { ActivityLogEntry } from "@/types/activity-log";
import { cn } from "@/lib/utils";
import { usePermission } from "@/lib/auth/session-context";

export interface DetailPanelProps {
  header: ReactNode;
  formRef: RefObject<DetailFormHandle | null>;
  /** Primary "Details" tab body (usually `<DetailForm />`). */
  form: ReactNode;
  /** Optional icon for the Details tab when multiple tabs are shown. */
  detailsTabIcon?: LucideIcon;
  /**
   * Documents tab — only rendered when the user has `viewDetailSidebar`
   * (admin/doctor); same visibility rules as the former sidebar Documents tab.
   */
  documentsTab?: React.ReactNode;
  /**
   * Appointments tab — same RBAC gate as `documentsTab` (via `viewDetailSidebar`).
   */
  appointmentsTab?: ReactNode;
  /**
   * Prescriptions tab — admin/doctor only (`viewPrescriptions`); not passed for staff.
   */
  prescriptionsTab?: ReactNode;
  events?: ActivityLogEntry[];
  /** Whether the server returned more activity log entries beyond the initial page. */
  hasMoreEvents?: boolean;
  /**
   * Entity type for activity log pagination — forwarded to DetailSidebar.
   * Required when the sidebar is visible (edit mode, admin/doctor).
   */
  entityType?: "patient" | "appointment" | "medicine" | "document" | "user";
  /** Entity ID for activity log pagination — forwarded to DetailSidebar. */
  entityId?: string;
  /** Optional stack above the activity log in the right column (appointment patient summary). */
  sidebarTop?: ReactNode;
  /** When true, sidebar column is hidden and the content column is full width. */
  isCreate?: boolean;
  /**
   * Save button: if provided, called on Save click; otherwise `formRef.current?.submit()` is used.
   */
  onSave?: () => void | Promise<void>;
  onCancel?: () => void;
  onDelete?: () => void | Promise<void>;
  submitLabel?: string;
  cancelLabel?: string;
  deleteLabel?: string;
  className?: string;
}

export function DetailPanel({
  header,
  formRef,
  form,
  detailsTabIcon,
  documentsTab,
  appointmentsTab,
  prescriptionsTab,
  events = [],
  hasMoreEvents = false,
  entityType,
  entityId,
  sidebarTop,
  isCreate = false,
  onSave,
  onCancel,
  onDelete,
  submitLabel = "Save Changes",
  cancelLabel = "Cancel",
  deleteLabel = "Delete",
  className,
}: DetailPanelProps) {
  const canViewSidebar = usePermission("viewDetailSidebar");
  const canViewPrescriptions = usePermission("viewPrescriptions");
  const noSidebar = isCreate || !canViewSidebar;

  const showDocumentsTab = Boolean(canViewSidebar && documentsTab);
  const showAppointmentsTab = Boolean(canViewSidebar && appointmentsTab);
  const showPrescriptionsTab = Boolean(canViewPrescriptions && prescriptionsTab);

  const tabItems: DetailPanelTabItem[] = [
    {
      key: "details",
      label: "Details",
      icon: detailsTabIcon,
      content: form,
    },
  ];
  if (showDocumentsTab) {
    tabItems.push({
      key: "documents",
      label: "Documents",
      icon: FileText,
      content: (
        <Suspense fallback={<DetailPanelTabSkeleton />}>
          <div className="px-6 py-4">{documentsTab}</div>
        </Suspense>
      ),
    });
  }
  if (showAppointmentsTab) {
    tabItems.push({
      key: "appointments",
      label: "Appointments",
      icon: CalendarDays,
      content: (
        <Suspense fallback={<DetailPanelTabSkeleton />}>
          <div className="px-6 py-4">{appointmentsTab}</div>
        </Suspense>
      ),
    });
  }
  if (showPrescriptionsTab) {
    tabItems.push({
      key: "prescriptions",
      label: "Prescriptions",
      icon: Pill,
      content: (
        <Suspense fallback={<DetailPanelTabSkeleton />}>
          <div className="px-6 py-4">{prescriptionsTab}</div>
        </Suspense>
      ),
    });
  }

  const layoutGroupId = `detail-tabs-${entityType ?? "entity"}-${entityId ?? "new"}`;
  const tabResetKey = `${isCreate ? "create" : "view"}-${entityId ?? ""}`;

  const handleSave = () => {
    if (onSave) {
      void onSave();
    } else {
      void formRef.current?.submit();
    }
  };

  return (
    <div
      className={cn("flex h-full min-h-0 flex-col overflow-hidden", className)}
    >
      <div
        className="flex shrink-0 items-center justify-between px-6 py-4"
        style={{
          borderBottom: "1px solid var(--color-border)",
          background: "var(--color-surface-alt)",
        }}
      >
        {header}
      </div>

      <div className="flex min-h-0 flex-1 flex-row overflow-hidden">
        <div
          className={cn(
            "flex min-h-0 flex-col overflow-hidden",
            noSidebar ? "w-full min-w-0 flex-1" : "min-w-0 flex-1"
          )}
          style={
            !noSidebar
              ? { borderRight: "1px solid var(--color-border)" }
              : undefined
          }
        >
          <DetailPanelTabs
            tabs={tabItems}
            resetKey={tabResetKey}
            layoutGroupId={layoutGroupId}
            className="h-full min-h-0"
          />
        </div>

        {!noSidebar && (
          <div
            className="min-h-0 w-[min(26.25rem,36vw)] max-w-[390px] shrink-0"
            style={{ minWidth: 0 }}
          >
            <DetailSidebar
              topSlot={sidebarTop}
              entries={events}
              initialHasMore={hasMoreEvents}
              entityType={entityType ?? "patient"}
              entityId={entityId ?? ""}
            />
          </div>
        )}
      </div>

      <div
        className="flex shrink-0 items-center justify-between px-6 py-4"
        style={{ borderTop: "1px solid var(--color-border)" }}
      >
        {onDelete ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void onDelete()}
            className="gap-2 text-sm"
            style={{ color: "var(--color-red)" }}
          >
            <Trash2 size={14} />
            {deleteLabel}
          </Button>
        ) : (
          <div />
        )}

        <div className="flex gap-3">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
            >
              {cancelLabel}
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            className="gap-2"
            style={{
              background: "var(--color-ink)",
              color: "var(--color-ink-fg)",
            }}
          >
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
