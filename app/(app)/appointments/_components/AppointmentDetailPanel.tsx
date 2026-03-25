"use client";

/**
 * app/(app)/appointments/_components/AppointmentDetailPanel.tsx
 *
 * DetailPanel + DetailForm (flat fields) + DetailSidebar (documents tab + activity log).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Calendar, FileText, Upload } from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  DocumentCard,
  UploadDocumentDialog,
  DetailPanel,
  DetailForm,
} from "@/components/common";
import type { DetailFormHandle } from "@/components/common/DetailForm";
import type { FormFieldDescriptor } from "@/components/common/DetailForm";
import { StatusBadge } from "@/components/common/StatusBadge";
import type { AppointmentDetail } from "@/types/appointment";
import {
  createAppointmentSchema,
  updateAppointmentSchema,
  APPOINTMENT_TYPES,
  APPOINTMENT_TYPE_LABELS,
  APPOINTMENT_STATUSES,
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_DURATIONS,
  type CreateAppointmentInput,
  type UpdateAppointmentInput,
} from "@/lib/validators/appointment";
import {
  createAppointment,
  updateAppointment,
  deleteAppointment,
  getActivePatients,
  getActiveDoctors,
} from "@/lib/actions/appointments";
import { formatPatientChartId } from "@/lib/utils/chart-id";


// ─── Sub-components used in custom field renderers ────────────────────────────

/** Rich clinical-notes editor (mini toolbar + textarea) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ClinicalNotesControl({ field }: { field: any }) {
  return (
    <div
      className="flex flex-col rounded-md overflow-hidden border"
      style={{ borderColor: "var(--color-border)", minHeight: "220px" }}
    >
      {/* Mini toolbar */}
      <div
        className="flex items-center gap-1 px-3 py-2 border-b flex-shrink-0"
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
      >
        {["B", "I", "≡"].map((icon) => (
          <button
            key={icon}
            type="button"
            className="size-6 rounded flex items-center justify-center text-xs font-bold transition-colors hover:bg-[var(--color-border)]"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {icon}
          </button>
        ))}
        <div className="w-px h-4 mx-1" style={{ background: "var(--color-border)" }} />
        <button
          type="button"
          className="size-6 rounded flex items-center justify-center transition-colors hover:bg-[var(--color-border)]"
          style={{ color: "var(--color-text-secondary)" }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M2 6h8M6 2l4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      <textarea
        {...field}
        value={String(field.value ?? "")}
        placeholder="Start typing clinical notes..."
        className="flex-1 w-full p-3 text-sm resize-none focus:outline-none border-none"
        style={{
          background: "var(--color-surface)",
          color:      "var(--color-text-primary)",
          minHeight:  "180px",
        }}
      />
    </div>
  );
}

// ─── Close button ─────────────────────────────────────────────────────────────

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      className="size-8 rounded-lg flex items-center justify-center transition-colors focus:outline-none"
      style={{ color: "var(--color-text-muted)" }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "var(--color-border)";
        (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-primary)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
        (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-muted)";
      }}
      aria-label="Close"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </button>
  );
}

// ─── Documents tab (edit mode sidebar) ────────────────────────────────────────

function AppointmentDocumentsTab({ appointment }: { appointment: AppointmentDetail }) {
  const [uploadOpen, setUploadOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: "var(--color-text-muted)" }}
        >
          Documents
        </p>
        <button
          type="button"
          onClick={() => setUploadOpen(true)}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-colors"
          style={{ background: "var(--color-ink)", color: "var(--color-ink-fg)" }}
        >
          <Upload size={12} />
          Upload
        </button>
      </div>

      {appointment.documents.length === 0 ? (
        <p className="text-xs text-center py-6" style={{ color: "var(--color-text-muted)" }}>
          No documents for this visit yet.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {appointment.documents.map((doc) => (
            <DocumentCard key={doc.id} document={doc} className="min-h-[72px]" />
          ))}
        </div>
      )}

      <UploadDocumentDialog
        patientId={appointment.patientId}
        appointmentId={appointment.id}
        open={uploadOpen}
        onOpenChange={setUploadOpen}
      />
    </>
  );
}

// ─── Blank defaults for create mode ──────────────────────────────────────────

const EMPTY_VALUES: CreateAppointmentInput = {
  title:              "",
  patientId:          "",
  doctorId:           "",
  type:               "general",
  status:             "scheduled",
  scheduledDate:      new Date().toISOString().slice(0, 10),
  scheduledTime:      "",
  duration:           30,
  actualCheckIn:      "",
  description:        "",
  notes:              "",
};

// ─── Field definitions (single scrollable column; pickers filled at runtime) ───

function buildAppointmentFormFields(
  patientOptions: { label: string; value: string }[],
  doctorOptions: { label: string; value: string }[],
  patientSelectDisabled: boolean
): FormFieldDescriptor<CreateAppointmentInput | UpdateAppointmentInput>[] {
  return [
    {
      name:        "patientId",
      label:       "Patient",
      type:        "select",
      colSpan:     2,
      placeholder: "Select a patient...",
      options:     patientOptions,
      disabled:    patientSelectDisabled,
    },
    {
      name:        "doctorId",
      label:       "Assigned Doctor",
      type:        "select",
      colSpan:     2,
      placeholder: "Select a doctor...",
      options:     doctorOptions,
    },
    {
      name:        "title",
      label:       "Appointment Title",
      type:        "text",
      colSpan:     2,
      placeholder: "e.g. Annual Physical Examination",
    },
    {
      name:    "type",
      label:   "Type",
      type:    "select",
      colSpan: 2,
      options: APPOINTMENT_TYPES.map((t) => ({ label: APPOINTMENT_TYPE_LABELS[t], value: t })),
    },
    {
      name:    "status",
      label:   "Status",
      type:    "select",
      colSpan: 2,
      options: APPOINTMENT_STATUSES.map((s) => ({ label: APPOINTMENT_STATUS_LABELS[s], value: s })),
    },
    {
      name:    "scheduledDate",
      label:   "Date",
      type:    "date",
      colSpan: 1,
    },
    {
      name:    "duration",
      label:   "Duration",
      type:    "select",
      colSpan: 1,
      options: APPOINTMENT_DURATIONS.map((d) => ({ label: d.label, value: d.value })),
    },
    {
      name:        "description",
      label:       "Description",
      type:        "textarea",
      colSpan:     2,
      rows:        5,
      placeholder: "Add visit details or reason for appointment...",
    },
    { name: "scheduledTime", label: "Scheduled start", type: "time", colSpan: 1 },
    { name: "actualCheckIn", label: "Actual time", type: "time", colSpan: 1 },
    {
      name: "notes",
      label: "Clinical Notes",
      type: "custom",
      colSpan: 2,
      renderControl: (field) => <ClinicalNotesControl field={field} />,
    },
  ];
}

// ─── Props ────────────────────────────────────────────────────────────────────

type EditProps = {
  mode: "edit";
  appointment: AppointmentDetail;
  onClose?: () => void;
};

type CreateProps = {
  mode: "create";
  appointment?: never;
  onClose?: () => void;
};

type AppointmentDetailPanelProps = EditProps | CreateProps;

// ─── Component ────────────────────────────────────────────────────────────────

export function AppointmentDetailPanel({
  mode = "edit",
  appointment,
  onClose,
}: AppointmentDetailPanelProps) {
  const isCreate = mode === "create";
  const router   = useRouter();
  const formRef  = useRef<DetailFormHandle | null>(null);

  const [patientOptions, setPatientOptions] = useState<{ label: string; value: string }[]>([]);
  const [doctorOptions, setDoctorOptions] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    void Promise.all([getActivePatients(), getActiveDoctors()]).then(
      ([patientsRes, doctorsRes]) => {
        if (patientsRes.success && patientsRes.data) {
          setPatientOptions(
            patientsRes.data.map((p) => ({
              label: `${p.firstName} ${p.lastName} (${formatPatientChartId(p.chartId)})`,
              value: p.id,
            }))
          );
        }
        if (doctorsRes.success && doctorsRes.data) {
          setDoctorOptions(
            doctorsRes.data.map((d) => ({
              label: [d.firstName, d.lastName].filter(Boolean).join(" ") || d.name,
              value: d.id,
            }))
          );
        }
      }
    );
  }, []);

  const defaultValues: CreateAppointmentInput | UpdateAppointmentInput = isCreate
    ? EMPTY_VALUES
    : {
        id:                 appointment!.id,
        title:              appointment!.title,
        patientId:          appointment!.patientId,
        doctorId:           appointment!.doctorId,
        type:               appointment!.type as UpdateAppointmentInput["type"],
        status:             appointment!.status as UpdateAppointmentInput["status"],
        scheduledDate:      appointment!.scheduledDate ?? "",
        scheduledTime:      appointment!.scheduledTime ?? "",
        duration:           appointment!.duration,
        actualCheckIn:      appointment!.actualCheckIn ?? "",
        description:         appointment!.description ?? "",
        notes:              appointment!.notes ?? "",
      };

  const handleSubmit = async (values: CreateAppointmentInput | UpdateAppointmentInput) => {
    if (isCreate) {
      const v = values as CreateAppointmentInput;
      const result = await createAppointment({
        ...v,
        duration: typeof v.duration === "string" ? Number(v.duration) : v.duration,
        description: v.description ?? "",
        notes: v.notes ?? "",
      });
      if (result.success) {
        toast.success("Appointment scheduled successfully.");
        if (onClose) {
          onClose();
        } else {
          router.push("/appointments/dashboard");
        }
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to create appointment.");
      }
    } else {
      const v = values as UpdateAppointmentInput;
      const result = await updateAppointment({
        id: v.id!,
        title: v.title,
        doctorId: v.doctorId,
        type: v.type,
        status: v.status,
        scheduledDate: v.scheduledDate,
        scheduledTime: v.scheduledTime,
        duration:
          v.duration !== undefined
            ? typeof v.duration === "string"
              ? Number(v.duration)
              : v.duration
            : undefined,
        actualCheckIn: v.actualCheckIn,
        description: v.description || undefined,
        notes: v.notes || undefined,
      });
      if (result.success) {
        toast.success("Appointment updated successfully.");
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to update appointment.");
      }
    }
  };

  const handleDelete = useCallback(async () => {
    const result = await deleteAppointment(appointment!.id);
    if (result.success) {
      toast.success("Appointment cancelled.");
      onClose?.();
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to cancel appointment.");
    }
  }, [appointment, onClose, router]);

  // Header subtitle
  const headerSubtitle = isCreate
    ? "Fill in the details to schedule a new appointment"
    : (() => {
        try {
          const dateStr = appointment!.scheduledDate
            ? format(parseISO(appointment!.scheduledDate), "EEE, MMM d, yyyy")
            : "";
          const time = appointment!.scheduledTime
            ? ` · ${appointment!.scheduledTime}`
            : "";
          return `${dateStr}${time}`;
        } catch {
          return "";
        }
      })();

  // Event log for the sidebar
  const logEvents = !isCreate
    ? appointment!.activityLog.map((e) => ({
        title:  e.action,
        body:   e.detail ? `${e.detail} · ${e.actor}` : e.actor,
        time:   e.timestamp,
        unread: e.color !== "muted",
      }))
    : [];

  const header = (
    <>
      <div className="flex items-center gap-3">
        <div
          className="size-10 rounded-xl flex items-center justify-center border"
          style={{
            background:   "var(--color-blue-bg)",
            borderColor:  "var(--color-blue-border)",
            color:        "var(--color-blue)",
          }}
        >
          <Calendar className="size-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold" style={{ color: "var(--color-text-primary)" }}>
              {isCreate ? "New Appointment" : appointment!.title}
            </h3>
            {!isCreate && (
              <StatusBadge status={appointment!.status} />
            )}
          </div>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            {headerSubtitle}
          </p>
        </div>
      </div>
      {onClose && <CloseButton onClose={onClose} />}
    </>
  );

  const form = (
    <DetailForm<CreateAppointmentInput | UpdateAppointmentInput>
      ref={formRef}
      schema={isCreate ? createAppointmentSchema : updateAppointmentSchema}
      defaultValues={defaultValues}
      fields={buildAppointmentFormFields(
        patientOptions,
        doctorOptions,
        !isCreate
      )}
      onSubmit={handleSubmit}
    />
  );

  return (
    <DetailPanel
      header={header}
      formRef={formRef}
      form={form}
      events={logEvents}
      sidebarTabs={
        !isCreate
          ? [
              {
                label: "Documents",
                icon: FileText,
                content: <AppointmentDocumentsTab appointment={appointment!} />,
              },
            ]
          : undefined
      }
      isCreate={isCreate}
      onCancel={onClose ?? (() => router.back())}
      onDelete={!isCreate ? handleDelete : undefined}
      submitLabel={isCreate ? "Create Appointment" : "Save Changes"}
      deleteLabel="Cancel Appointment"
    />
  );
}
