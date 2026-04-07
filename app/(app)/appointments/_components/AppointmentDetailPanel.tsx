"use client";

/**
 * app/(app)/appointments/_components/AppointmentDetailPanel.tsx
 *
 * DetailPanel + DetailForm (flat fields) + DetailSidebar (documents tab + activity log).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFormContext, useWatch, type DefaultValues } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Calendar, CalendarDays, FileText, Upload } from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  DocumentCard,
  UploadDocumentDialog,
  DetailPanel,
  DetailForm,
  PanelCloseButton,
} from "@/components/common";
import type { DetailFormHandle } from "@/components/common/DetailForm";
import type { FormFieldDescriptor } from "@/components/common/DetailForm";
import { StatusBadge } from "@/components/common/StatusBadge";
import type { AppointmentDetail, AppointmentSelectOption } from "@/types/appointment";
import {
  createAppointmentSchema,
  updateAppointmentSchema,
  APPOINTMENT_CATEGORIES,
  APPOINTMENT_VISIT_TYPES,
  APPOINTMENT_CATEGORY_LABELS,
  APPOINTMENT_VISIT_TYPE_LABELS,
  APPOINTMENT_STATUSES,
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_DURATIONS,
  type CreateAppointmentInput,
  type UpdateAppointmentInput,
} from "@/lib/validators/appointment";
import { DEFAULT_APPOINTMENT_DURATION_MINUTES } from "@/lib/constants/appointment";
import { formatAppointmentHeading } from "@/lib/utils/format-appointment-heading";
import { formatAppointmentFeeInr } from "@/lib/utils/format-appointment-fee";
import {
  createAppointment,
  updateAppointment,
  deleteAppointment,
} from "@/lib/actions/appointments";
import { useAppSession, usePermission } from "@/lib/auth/session-context";
import { formatPatientChartId } from "@/lib/utils/chart-id";
import { AppointmentPatientCombobox } from "./AppointmentPatientCombobox";

/** True when the fee input represents a positive amount (triggers auto-complete in edit). */
function feeInputHasPositiveAmount(raw: unknown): boolean {
  if (raw === "" || raw === null || raw === undefined) return false;
  const n = typeof raw === "number" ? raw : Number(String(raw).trim());
  return Number.isFinite(n) && n > 0;
}

/**
 * Edit mode only: when fee goes from empty/zero → positive and status is not completed,
 * set status to completed and toast. Uses RHF context (via DetailForm `insideForm`).
 */
function FeeAutoCompleteStatusEffect({ isCreate }: { isCreate: boolean }) {
  const { control, setValue, getValues } = useFormContext<
    CreateAppointmentInput | UpdateAppointmentInput
  >();
  /** `useWatch` subscribes to updates; `watch("fee")` alone does not re-render this component (RHF v7). */
  const fee = useWatch({
    control,
    name: "fee",
    disabled: isCreate,
  });
  const initializedRef = useRef(false);
  const prevHadPositiveFeeRef = useRef(false);

  useEffect(() => {
    if (isCreate) return;

    const nowPositive = feeInputHasPositiveAmount(fee);

    if (!initializedRef.current) {
      initializedRef.current = true;
      prevHadPositiveFeeRef.current = nowPositive;
      return;
    }

    const hadPositiveBefore = prevHadPositiveFeeRef.current;
    prevHadPositiveFeeRef.current = nowPositive;

    if (!hadPositiveBefore && nowPositive) {
      const status = getValues("status") as UpdateAppointmentInput["status"];
      if (status !== "completed") {
        setValue("status", "completed", { shouldDirty: true, shouldValidate: true });
        toast.success("Status set to Completed because a fee was added.");
      }
    }
  }, [fee, isCreate, setValue, getValues]);

  return null;
}

// ─── Appointment status styles (sidebar list; mirrors PatientDetailPanel) ─────

const APPT_STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  scheduled: { bg: "var(--color-amber-bg)",   text: "var(--color-amber)",   border: "var(--color-amber-border)"   },
  completed: { bg: "var(--color-blue-bg)",    text: "var(--color-blue)",    border: "var(--color-blue-border)"    },
  cancelled: { bg: "var(--color-red-bg)",     text: "var(--color-red)",     border: "var(--color-red-border)"     },
  "no-show": { bg: "var(--color-purple-bg)",  text: "var(--color-purple)",  border: "var(--color-purple-border)" },
};

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

      {appointment.patientDocuments.length === 0 ? (
        <p className="text-xs text-center py-6" style={{ color: "var(--color-text-muted)" }}>
          No documents for this patient yet.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {appointment.patientDocuments.map((doc) => (
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

// ─── Sidebar tab: Patient appointments ────────────────────────────────────────

function AppointmentPatientAppointmentsTab({
  appointment,
}: {
  appointment: AppointmentDetail;
}) {
  const router = useRouter();
  const rows = appointment.patientAppointments;

  if (rows.length === 0) {
    return (
      <p className="text-sm text-center py-10" style={{ color: "var(--color-text-muted)" }}>
        No other appointments for this patient.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((appt) => {
        const isCurrent = appt.id === appointment.id;
        const s = APPT_STATUS_STYLES[appt.status] ?? APPT_STATUS_STYLES.completed;
        const cardStyle = {
          background: "var(--color-surface)",
          border: "1px solid",
          borderColor: isCurrent ? "var(--color-blue-border)" : "var(--color-border)",
          opacity: appt.status === "cancelled" ? 0.7 : 1,
        } as const;
        const inner = (
          <>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <p
                    className="text-sm font-bold truncate"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {appt.heading}
                  </p>
                  {isCurrent && (
                    <span
                      className="text-[9px] font-semibold uppercase tracking-wide shrink-0 px-1.5 py-0.5 rounded"
                      style={{
                        background: "var(--color-blue-bg)",
                        color: "var(--color-blue)",
                        border: "1px solid var(--color-blue-border)",
                      }}
                    >
                      Current
                    </span>
                  )}
                </div>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                  {appt.doctor}
                </p>
              </div>
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-md whitespace-nowrap shrink-0 capitalize"
                style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}
              >
                {appt.status}
              </span>
            </div>
            <div
              className="flex items-center gap-4 text-xs"
              style={{ color: "var(--color-text-secondary)" }}
            >
              <span className="flex items-center gap-1">
                <CalendarDays size={12} /> {appt.date}
              </span>
              <span>{appt.time}</span>
            </div>
          </>
        );
        if (isCurrent) {
          return (
            <div
              key={appt.id}
              className="w-full text-left flex flex-col gap-2 p-3 rounded-xl cursor-default transition-all"
              style={cardStyle}
              aria-current="page"
            >
              {inner}
            </div>
          );
        }
        return (
          <button
            key={appt.id}
            type="button"
            onClick={() => router.push(`/appointments/view/${appt.id}`)}
            className="w-full text-left flex flex-col gap-2 p-3 rounded-xl cursor-pointer transition-all"
            style={cardStyle}
          >
            {inner}
          </button>
        );
      })}
    </div>
  );
}

// ─── Field definitions (DetailForm 2-column grid; pickers filled at runtime) ───

function buildAppointmentFormFields(
  doctorOptions: AppointmentSelectOption[],
  includeNotes: boolean,
  includeTitle: boolean,
  showFee: boolean,
  feeReadOnly: boolean
): FormFieldDescriptor<CreateAppointmentInput | UpdateAppointmentInput>[] {
  const all: FormFieldDescriptor<CreateAppointmentInput | UpdateAppointmentInput>[] = [
    {
      name:        "doctorId",
      label:       "Assigned Doctor",
      type:        "select",
      colSpan:     2,
      placeholder: "Select a doctor...",
      options:     doctorOptions,
      selectContentClassName:
        "max-h-[min(13.5rem,var(--radix-select-content-available-height))]",
    },
    ...(includeTitle
      ? [
          {
            name:        "title" as const,
            label:       "Title",
            type:        "text" as const,
            colSpan:     2 as const,
            placeholder: "e.g. Post-surgery checkup",
          } satisfies FormFieldDescriptor<CreateAppointmentInput | UpdateAppointmentInput>,
        ]
      : []),
    {
      name:    "category",
      label:   "Category",
      type:    "select",
      colSpan: 1,
      options: APPOINTMENT_CATEGORIES.map((c) => ({
        label: APPOINTMENT_CATEGORY_LABELS[c],
        value: c,
      })),
    },
    {
      name:    "visitType",
      label:   "Visit type",
      type:    "select",
      colSpan: 1,
      options: APPOINTMENT_VISIT_TYPES.map((v) => ({
        label: APPOINTMENT_VISIT_TYPE_LABELS[v],
        value: v,
      })),
    },
    {
      name:    "scheduledDate",
      label:   "Date",
      type:    "date",
      colSpan: 1,
    },
    { name: "scheduledTime", label: "Scheduled start", type: "time", colSpan: 1 },
    {
      name:    "duration",
      label:   "Duration",
      type:    "select",
      colSpan: 1,
      options: APPOINTMENT_DURATIONS.map((d) => ({ label: d.label, value: d.value })),
    },
    ...(showFee
      ? [
          {
            name:        "fee" as const,
            label:       "Fee",
            type:        "number" as const,
            colSpan:     1 as const,
            prefix:      "₹",
            placeholder: "Appointment Fee",
            step:        "0.01",
            min:         "0",
            readOnly:    feeReadOnly,
          } satisfies FormFieldDescriptor<CreateAppointmentInput | UpdateAppointmentInput>,
        ]
      : []),
    { name: "actualCheckIn", label: "Actual time", type: "time", colSpan: 2 },
    {
      name:    "status",
      label:   "Status",
      type:    "select",
      colSpan: 2,
      options: APPOINTMENT_STATUSES.map((s) => ({ label: APPOINTMENT_STATUS_LABELS[s], value: s })),
    },
    {
      name:        "description",
      label:       "Description",
      type:        "textarea",
      colSpan:     2,
      rows:        5,
      placeholder: "Add visit details or reason for appointment...",
    },
    {
      name: "notes",
      label: "Clinical Notes",
      type: "custom",
      colSpan: 2,
      renderControl: (field) => <ClinicalNotesControl field={field} />,
    },
  ];
  return includeNotes ? all : all.filter((f) => f.name !== "notes");
}

// ─── Props ────────────────────────────────────────────────────────────────────

type EditProps = {
  mode: "edit";
  appointment: AppointmentDetail;
  doctorOptions: AppointmentSelectOption[];
  onClose?: () => void;
};

type CreateProps = {
  mode: "create";
  appointment?: never;
  doctorOptions: AppointmentSelectOption[];
  onClose?: () => void;
};

type AppointmentDetailPanelProps = EditProps | CreateProps;

// ─── Component ────────────────────────────────────────────────────────────────

export function AppointmentDetailPanel({
  mode = "edit",
  appointment,
  doctorOptions,
  onClose,
}: AppointmentDetailPanelProps) {
  const isCreate = mode === "create";
  const router   = useRouter();
  const formRef  = useRef<DetailFormHandle | null>(null);
  const { user } = useAppSession();
  const isStaff = user.type === "staff";
  const canViewClinicalNotes = usePermission("viewClinicalNotes");
  const canViewAppointmentTitle = usePermission("viewAppointmentTitle");

  const showAppointmentFeeField = isCreate
    ? !isStaff
    : !isStaff || appointment!.status === "completed";
  const appointmentFeeReadOnly =
    isStaff && !isCreate && appointment!.status === "completed";
  const showHeaderFeeLine =
    !isCreate && (!isStaff || appointment!.status === "completed");

  const createDefaults = useMemo(
    () =>
      ({
        title: "",
        patientId: "",
        doctorId: "",
        category: "general",
        visitType: "general",
        status: "scheduled",
        scheduledDate: format(new Date(), "yyyy-MM-dd"),
        scheduledTime: format(new Date(), "HH:mm"),
        duration: DEFAULT_APPOINTMENT_DURATION_MINUTES,
        fee: "",
        actualCheckIn: "",
        description: "",
        notes: "",
      }) as unknown as DefaultValues<CreateAppointmentInput>,
    []
  );

  const defaultValues = (
    isCreate
      ? createDefaults
      : {
          id:            appointment!.id,
          title:         appointment!.title ?? "",
          patientId:     appointment!.patientId,
          doctorId:      appointment!.doctorId,
          category:      appointment!.category as UpdateAppointmentInput["category"],
          visitType:     appointment!.visitType as UpdateAppointmentInput["visitType"],
          status:        appointment!.status as UpdateAppointmentInput["status"],
          scheduledDate: appointment!.scheduledDate ?? "",
          scheduledTime: appointment!.scheduledTime ?? "",
          duration:      appointment!.duration,
          fee:           appointment!.fee != null ? String(appointment!.fee) : "",
          actualCheckIn: appointment!.actualCheckIn ?? "",
          description:   appointment!.description ?? "",
          notes:         appointment!.notes ?? "",
        }
  ) as unknown as DefaultValues<CreateAppointmentInput | UpdateAppointmentInput>;

  const handleSubmit = async (values: CreateAppointmentInput | UpdateAppointmentInput) => {
    if (isCreate) {
      const v = values as CreateAppointmentInput;
      const result = await createAppointment({
        ...v,
        duration: typeof v.duration === "string" ? Number(v.duration) : v.duration,
        fee: v.fee,
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
        category: v.category,
        visitType: v.visitType,
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
        fee: v.fee,
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
              {isCreate
                ? "New Appointment"
                : formatAppointmentHeading({
                    category:  appointment!.category,
                    visitType: appointment!.visitType,
                    title:     appointment!.title,
                  })}
            </h3>
            {!isCreate && (
              <StatusBadge status={appointment!.status} />
            )}
          </div>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            {headerSubtitle}
          </p>
          {!isCreate && (
            <p
              className="text-xs mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5"
              style={{ color: "var(--color-text-secondary)" }}
            >
              <span>
                Duration:{" "}
                <span style={{ color: "var(--color-text-primary)" }}>{appointment!.duration} min</span>
              </span>
              {showHeaderFeeLine && (
                <span>
                  Fee:{" "}
                  <span style={{ color: "var(--color-text-primary)" }}>
                    {formatAppointmentFeeInr(appointment!.fee)}
                  </span>
                </span>
              )}
            </p>
          )}
        </div>
      </div>
      {onClose && <PanelCloseButton onClose={onClose} />}
    </>
  );

  const formFields = useMemo((): FormFieldDescriptor<
    CreateAppointmentInput | UpdateAppointmentInput
  >[] => {
    const patientLockedLabel = !isCreate
      ? `${appointment!.patientName} (${formatPatientChartId(appointment!.patientChartId)})`
      : undefined;
    const patientField: FormFieldDescriptor<CreateAppointmentInput | UpdateAppointmentInput> = {
      name: "patientId",
      label: "Patient",
      type: "custom",
      colSpan: 2,
      renderControl: (field) => (
        <AppointmentPatientCombobox
          field={field}
          disabled={!isCreate}
          disabledDisplayLabel={patientLockedLabel}
        />
      ),
    };
    return [
      patientField,
      ...buildAppointmentFormFields(
        doctorOptions,
        canViewClinicalNotes,
        canViewAppointmentTitle,
        showAppointmentFeeField,
        appointmentFeeReadOnly
      ),
    ];
  }, [
    appointment,
    doctorOptions,
    isCreate,
    canViewClinicalNotes,
    canViewAppointmentTitle,
    showAppointmentFeeField,
    appointmentFeeReadOnly,
  ]);

  const form = (
    <DetailForm<CreateAppointmentInput | UpdateAppointmentInput>
      ref={formRef}
      schema={isCreate ? createAppointmentSchema : updateAppointmentSchema}
      defaultValues={defaultValues}
      fields={formFields}
      onSubmit={handleSubmit}
      insideForm={<FeeAutoCompleteStatusEffect isCreate={isCreate} />}
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
              {
                label: "Appointments",
                icon: CalendarDays,
                content: (
                  <AppointmentPatientAppointmentsTab appointment={appointment!} />
                ),
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
