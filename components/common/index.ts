// ─── Primitives (wrap Shadcn components) ─────────────────────────────────────
export { InitialsBadge } from "./InitialsBadge";
export { StatusBadge }   from "./StatusBadge";
export type { AppStatus } from "./StatusBadge";

// ─── Data display ─────────────────────────────────────────────────────────────
export { StatCard }  from "./StatCard";
export { DataTable } from "./DataTable";
export type { ColumnDef } from "./DataTable";
export { EventLog }  from "./EventLog";
export type { LogEvent } from "./EventLog";

// ─── Table controls ───────────────────────────────────────────────────────────
export { TableFilterBar } from "./TableFilterBar";
export type { FilterColumn, ActiveFilter } from "./TableFilterBar";
export { TablePagination } from "./TablePagination";

// ─── Calendar components ──────────────────────────────────────────────────────
export { MonthView }            from "./MonthView";
export { TimeGridView }         from "./TimeGridView";
export { AppointmentEventCard } from "./AppointmentEventCard";

// ─── Forms ───────────────────────────────────────────────────────────────────
export { DetailForm } from "./DetailForm";
export type {
  DetailFormHandle,
  DetailFormProps,
  FormFieldDescriptor,
  SelectOption,
  CustomField,
} from "./DetailForm";

export { DetailSidebar } from "./DetailSidebar";
export type { DetailSidebarProps, DetailSidebarTab } from "./DetailSidebar";

export { DetailPanel } from "./DetailPanel";
export type { DetailPanelProps } from "./DetailPanel";

// ─── Overlays ─────────────────────────────────────────────────────────────────
export { ModalShell }       from "./ModalShell";
export type { ModalShellProps, ModalSize } from "./ModalShell";
export { ModalCloseButton } from "./ModalCloseButton";

// ─── Documents ────────────────────────────────────────────────────────────────
export { DocumentCard } from "./DocumentCard";
export type { DocumentCardProps } from "./DocumentCard";
export { UploadDocumentDialog } from "./UploadDocumentDialog";
export type { UploadDocumentDialogProps } from "./UploadDocumentDialog";

