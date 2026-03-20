"use client";

/**
 * app/(app)/appointments/_components/AppointmentDetailPanel.tsx
 *
 * Uses DetailForm in SECTIONED mode:
 *
 *   ┌─ Section 1 (30%) ─┬─ Section 2 (flex-1) ─┬─ rightSlot (35%, edit only) ─┐
 *   │ Primary Info       │ Timeline & Notes      │ Documents + Activity Log      │
 *   └────────────────────┴───────────────────────┴───────────────────────────────┘
 *   │ [Cancel Appt]                          [Cancel]  [Create / Save Changes]   │
 *   └──────────────────────────────────────────────────────────────────────────── ┘
 *
 * Create mode: 2 sections only (no rightSlot, Section 2 expands to fill).
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Calendar, FileText, ImageIcon, Plus, Upload } from "lucide-react";
import { format, parseISO } from "date-fns";
import { DetailForm } from "@/components/common/DetailForm";
import type { FormFieldDescriptor, FormSection } from "@/components/common/DetailForm";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EventLog } from "@/components/common/EventLog";
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

// ─── Col 3: Documents + Activity Log (read-only, outside the form) ────────────

function AppointmentSidePanel({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- reserved for document list wiring
  appointment,
  logEvents,
}: {
  appointment: AppointmentDetail;
  logEvents: { title: string; body: string; time: string; unread: boolean }[];
}) {
  return (
    <div className="flex flex-col overflow-hidden" style={{ width: "35%", flexShrink: 0 }}>

      {/* Documents */}
      <div
        className="flex flex-col border-b p-6 overflow-y-auto"
        style={{ borderColor: "var(--color-border)", flex: "0 0 50%" }}
      >
        <div className="flex items-center justify-between mb-4">
          <p
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: "var(--color-text-muted)" }}
          >
            Documents
          </p>
          <button
            type="button"
            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-colors"
            style={{ background: "var(--color-ink)", color: "var(--color-ink-fg)" }}
          >
            <Upload size={12} />
            Upload
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div
            className="flex items-start gap-2 p-2.5 rounded-lg border transition-colors cursor-pointer"
            style={{ borderColor: "var(--color-border)", background: "var(--color-surface-alt)" }}
          >
            <div className="p-1.5 rounded" style={{ background: "var(--color-red-bg)", color: "var(--color-red)" }}>
              <FileText size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: "var(--color-text-primary)" }}>Lab_Results.pdf</p>
              <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>2.4 MB · Today</p>
            </div>
          </div>

          <div
            className="flex items-start gap-2 p-2.5 rounded-lg border transition-colors cursor-pointer"
            style={{ borderColor: "var(--color-border)", background: "var(--color-surface-alt)" }}
          >
            <div className="p-1.5 rounded" style={{ background: "var(--color-blue-bg)", color: "var(--color-blue)" }}>
              <ImageIcon size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: "var(--color-text-primary)" }}>X-Ray_Chest.jpg</p>
              <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>5.1 MB · Yesterday</p>
            </div>
          </div>

          <div
            className="flex flex-col items-center justify-center p-2.5 rounded-lg border border-dashed transition-colors cursor-pointer"
            style={{ borderColor: "var(--color-border)" }}
          >
            <Plus size={18} style={{ color: "var(--color-text-muted)" }} />
            <span className="text-[10px] mt-1 font-medium" style={{ color: "var(--color-text-muted)" }}>Add File</span>
          </div>
        </div>
      </div>

      {/* Activity Log */}
      <div
        className="flex flex-col overflow-hidden"
        style={{ flex: "0 0 50%", background: "var(--color-surface-alt)" }}
      >
        <div className="px-6 pt-5 pb-3 flex-shrink-0">
          <p
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: "var(--color-text-muted)" }}
          >
            Activity Log
          </p>
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-5">
          <EventLog events={logEvents} maxHeight="100%" className="h-full" />
        </div>
      </div>
    </div>
  );
}

// ─── Blank defaults for create mode ──────────────────────────────────────────

const EMPTY_VALUES: CreateAppointmentInput = {
  title:              "",
  patientId:          "",
  doctorId:           "",
  type:               "general",
  status:             "scheduled",
  date:               new Date().toISOString().slice(0, 10),
  duration:           30,
  scheduledStartTime: "",
  scheduledEndTime:   "",
  actualCheckIn:      "",
  actualCheckOut:     "",
  description:        "",
  notes:              "",
};

// ─── Field definitions (primary fields built with dynamic picker options) ──────

function buildPrimaryFields(
  patientOptions: { label: string; value: string }[],
  doctorOptions: { label: string; value: string }[]
): FormFieldDescriptor<CreateAppointmentInput | UpdateAppointmentInput>[] {
  return [
    {
      name:        "patientId",
      label:       "Patient",
      type:        "select",
      colSpan:     2,
      placeholder: "Select a patient...",
      options:     patientOptions,
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
      colSpan:      2,
      placeholder:  "e.g. Annual Physical Examination",
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
      name:     "date",
      label:    "Date",
      type:     "date",
      colSpan:  1,
    },
    {
      name:    "duration",
      label:   "Duration",
      type:    "select",
      colSpan: 1,
      options: APPOINTMENT_DURATIONS.map((d) => ({ label: d.label, value: d.value })),
    },
    {
      name:        "notes",
      label:       "Description",
      type:        "textarea",
      colSpan:     2,
      rows:        5,
      placeholder: "Add visit details or reason for appointment...",
    },
  ];
}

const TIMELINE_FIELDS: FormFieldDescriptor<CreateAppointmentInput | UpdateAppointmentInput>[] = [
  { name: "scheduledStartTime", label: "Scheduled Start", type: "time", colSpan: 1 },
  { name: "scheduledEndTime",   label: "Scheduled End",   type: "time", colSpan: 1 },
  { name: "actualCheckIn",      label: "Actual Check-in",  type: "time", colSpan: 1 },
  { name: "actualCheckOut",     label: "Actual Check-out", type: "time", colSpan: 1 },
  {
    name: "notes",
    label: "Clinical Notes",
    type: "custom",
    colSpan: 2,
    renderControl: (field) => <ClinicalNotesControl field={field} />,
  },
];

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

  const [patientOptions, setPatientOptions] = useState<{ label: string; value: string }[]>([]);
  const [doctorOptions, setDoctorOptions] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    void Promise.all([getActivePatients(), getActiveDoctors()]).then(
      ([patientsRes, doctorsRes]) => {
        if (patientsRes.success && patientsRes.data) {
          setPatientOptions(
            patientsRes.data.map((p) => ({
              label: `${p.firstName} ${p.lastName} (#PT-${p.chartId})`,
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
        date:               appointment!.date.slice(0, 10),
        duration:           appointment!.duration,
        scheduledStartTime: appointment!.scheduledStartTime ?? "",
        scheduledEndTime:   appointment!.scheduledEndTime   ?? "",
        actualCheckIn:      appointment!.actualCheckIn      ?? "",
        actualCheckOut:     appointment!.actualCheckOut     ?? "",
        description:         appointment!.description ?? "",
        notes:              appointment!.notes ?? "",
      };

  const handleSubmit = async (values: CreateAppointmentInput | UpdateAppointmentInput) => {
    if (isCreate) {
      const v = values as CreateAppointmentInput;
      const dateStr = `${v.date}T${v.scheduledStartTime || "00:00"}:00`;
      const result = await createAppointment({
        ...v,
        date:     dateStr,
        duration: typeof v.duration === "string" ? Number(v.duration) : v.duration,
        description: v.description ?? "",
        notes:    v.notes ?? "",
      });
      if (result.success) {
        toast.success("Appointment scheduled successfully.");
        onClose?.();
      } else {
        toast.error(result.error ?? "Failed to create appointment.");
      }
    } else {
      const v = values as UpdateAppointmentInput;
      const dateValue = v.date
        ? `${v.date}T${v.scheduledStartTime || "00:00"}:00`
        : undefined;
      const result = await updateAppointment({
        id:                 v.id!,
        title:              v.title,
        patientId:          v.patientId,
        doctorId:           v.doctorId,
        type:               v.type,
        status:             v.status,
        date:               dateValue,
        duration:           v.duration !== undefined
          ? (typeof v.duration === "string" ? Number(v.duration) : v.duration)
          : undefined,
        scheduledStartTime: v.scheduledStartTime || undefined,
        scheduledEndTime:   v.scheduledEndTime   || undefined,
        actualCheckIn:      v.actualCheckIn      || undefined,
        actualCheckOut:     v.actualCheckOut     || undefined,
        description:        v.description || undefined,
        notes:              v.notes || undefined,
      });
      if (result.success) {
        toast.success("Appointment updated successfully.");
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
    } else {
      toast.error(result.error ?? "Failed to cancel appointment.");
    }
  }, [appointment, onClose]);

  // Header subtitle
  const headerSubtitle = isCreate
    ? "Fill in the details to schedule a new appointment"
    : (() => {
        try {
          const dateStr = appointment!.date
            ? format(parseISO(appointment!.date), "EEE, MMM d, yyyy")
            : "";
          const time = appointment!.scheduledStartTime
            ? ` · ${appointment!.scheduledStartTime}`
            : "";
          return `${dateStr}${time}`;
        } catch { return ""; }
      })();

  // Event log for the side panel
  const logEvents = !isCreate
    ? appointment!.activityLog.map((e) => ({
        title:  e.action,
        body:   e.detail ? `${e.detail} · ${e.actor}` : e.actor,
        time:   e.timestamp,
        unread: e.color !== "muted",
      }))
    : [];

  // Section config — Section 2 width is "auto" (flex-1) so it naturally
  // expands to fill space when Col 3 is absent (create mode).
  const sections: FormSection<CreateAppointmentInput | UpdateAppointmentInput>[] = [
    {
      title:       "Primary Information",
      width:       "30%",
      borderRight: true,
      fields:      buildPrimaryFields(patientOptions, doctorOptions),
    },
    {
      title:       "Timeline & Notes",
      background:  "var(--color-surface-alt)",
      borderRight: !isCreate,
      fields:      TIMELINE_FIELDS,
    },
  ];

  return (
    <div className="flex flex-col h-full">

      {/* ── Header ────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface-alt)" }}
      >
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
      </div>

      {/* ── Body + Footer — delegated to DetailForm ────────────────── */}
      <DetailForm<CreateAppointmentInput | UpdateAppointmentInput>
        schema={isCreate ? createAppointmentSchema : updateAppointmentSchema}
        defaultValues={defaultValues}
        sections={sections}
        rightSlot={
          !isCreate
            ? <AppointmentSidePanel appointment={appointment!} logEvents={logEvents} />
            : undefined
        }
        onSubmit={handleSubmit}
        onDelete={!isCreate ? handleDelete : undefined}
        onCancel={onClose ?? (() => router.back())}
        submitLabel={isCreate ? "Create Appointment" : "Save Changes"}
        deleteLabel="Cancel Appointment"
        successMessage={
          isCreate
            ? "Appointment scheduled successfully."
            : "Appointment updated successfully."
        }
      />
    </div>
  );
}
