// ─── Primitives (wrap Shadcn components) ─────────────────────────────────────
export { InitialsBadge } from "./InitialsBadge";
export { StatusBadge }   from "./StatusBadge";
export type { AppStatus } from "./StatusBadge";

// ─── Data display ─────────────────────────────────────────────────────────────
export { StatCard }  from "./StatCard";
export { DataTable } from "./DataTable";
export type { ColumnDef } from "./DataTable";

// ─── Table controls ───────────────────────────────────────────────────────────
export { TableFilterBar } from "./TableFilterBar";
export type { FilterColumn, ActiveFilter } from "./TableFilterBar";
export { TablePagination } from "./TablePagination";
export { TableDashboardLayout } from "./TableDashboardLayout";
export type { TableDashboardLayoutProps } from "./TableDashboardLayout";

// ─── Calendar components ──────────────────────────────────────────────────────
export { MonthView }            from "./MonthView";
export { TimeGridView }         from "./TimeGridView";
export { AppointmentEventCard } from "./AppointmentEventCard";

// ─── Forms ───────────────────────────────────────────────────────────────────
export { AsyncSearchCombobox } from "./AsyncSearchCombobox";
export type {
  AsyncSearchComboboxFetchFn,
  AsyncSearchComboboxProps,
} from "./AsyncSearchCombobox";
export { DetailForm } from "./DetailForm";
export type {
  DetailFormHandle,
  DetailFormProps,
  FormFieldDescriptor,
  SelectOption,
  CustomField,
} from "./DetailForm";

export { DetailSidebar } from "./DetailSidebar";
export type { DetailSidebarProps } from "./DetailSidebar";

export { DetailPanelTabs } from "./DetailPanelTabs";
export type { DetailPanelTabsProps, DetailPanelTabItem } from "./DetailPanelTabs";

export { DetailPanel } from "./DetailPanel";
export type { DetailPanelProps } from "./DetailPanel";

// ─── Overlays ─────────────────────────────────────────────────────────────────
export { ModalShell }       from "./ModalShell";
export type { ModalShellProps, ModalSize } from "./ModalShell";
export { ModalCloseButton } from "./ModalCloseButton";
export { PanelCloseButton } from "./PanelCloseButton";

// ─── Page-level placeholders ──────────────────────────────────────────────────
export { ReportsComingSoon } from "./ReportsComingSoon";

// ─── Documents ────────────────────────────────────────────────────────────────
export { DocumentCard } from "./DocumentCard";
export type { DocumentCardProps } from "./DocumentCard";
export { UploadDocumentDialog } from "./UploadDocumentDialog";
export type { UploadDocumentDialogProps } from "./UploadDocumentDialog";
export { DocumentsTab } from "./DocumentsTab";
export type { DocumentsTabProps } from "./DocumentsTab";
export { AppointmentListTab } from "./AppointmentListTab";
export type { AppointmentListTabProps } from "./AppointmentListTab";
export { PrescriptionsTab } from "./PrescriptionsTab";
export type { PrescriptionsTabProps } from "./PrescriptionsTab";
export { PatientPrescriptionsTab } from "./PatientPrescriptionsTab";
export type { PatientPrescriptionsTabProps } from "./PatientPrescriptionsTab";

