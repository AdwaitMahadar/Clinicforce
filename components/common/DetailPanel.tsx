"use client";

/**
 * Shared shell for entity detail views: header, form column, optional sidebar, footer actions.
 * Colours via CSS variables only — see globals.css.
 */

import type { ReactNode, RefObject } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DetailFormHandle } from "@/components/common/DetailForm";
import { DetailSidebar } from "@/components/common/DetailSidebar";
import type { DetailSidebarTab } from "@/components/common/DetailSidebar";
import type { ActivityLogEntry } from "@/types/activity-log";
import { cn } from "@/lib/utils";
import { usePermission } from "@/lib/auth/session-context";

export interface DetailPanelProps {
  header: ReactNode;
  formRef: RefObject<DetailFormHandle | null>;
  form: React.ReactNode;
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
  /** Passed to DetailSidebar; omitted or empty hides the tabbed top zone. */
  sidebarTabs?: DetailSidebarTab[];
  /** When true, sidebar column is hidden and the form column is full width. */
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
  events = [],
  hasMoreEvents = false,
  entityType,
  entityId,
  sidebarTabs,
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
  // Hide sidebar when in create mode OR when the user's role lacks sidebar access (staff).
  const noSidebar = isCreate || !canViewSidebar;

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
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
            {form}
          </div>
        </div>

        {!noSidebar && (
          <div
            className="min-h-0 w-[40%] max-w-[40%] shrink-0"
            style={{ minWidth: 0 }}
          >
            <DetailSidebar
              tabs={sidebarTabs}
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
