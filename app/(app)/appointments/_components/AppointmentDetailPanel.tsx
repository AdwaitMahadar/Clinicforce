"use client";

/**
 * app/(app)/appointments/_components/AppointmentDetailPanel.tsx
 *
 * DetailPanel + DetailForm (Details tab) + Documents / Appointments tabs + sidebar (patient summary + activity log).
 * Post-mutation exit: useDetailExit (modal onClose from AppointmentViewModalClient / NewAppointmentModalClient).
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useFormContext, useWatch, type DefaultValues } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useDetailExit } from "@/lib/hooks/use-detail-exit";
import { toast } from "sonner";
import { Calendar, ClipboardList, X } from "lucide-react";
import { AlertDialog as AlertDialogPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { DetailPanel, DetailForm, PanelCloseButton } from "@/components/common";
import type { DetailFormHandle } from "@/components/common/DetailForm";
import type { FormFieldDescriptor } from "@/components/common/DetailForm";
import { StatusBadge } from "@/components/common/StatusBadge";
import type {
  AppointmentCreateInitialValues,
  AppointmentDetailCore,
  AppointmentSelectOption,
} from "@/types/appointment";
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
import { AppointmentPatientSummaryCard } from "./AppointmentPatientSummaryCard";

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
  appointment: AppointmentDetailCore;
  doctorOptions: AppointmentSelectOption[];
  /** Async RSC tab bodies from the route — streamed inside `DetailPanel` `Suspense`. */
  documentsTab: ReactNode;
  appointmentsTab: ReactNode;
  /** Omitted when the session role lacks `viewPrescriptions` (no server prefetch for that slice). */
  prescriptionsTab?: ReactNode;
  onClose?: () => void;
};

type CreateProps = {
  mode: "create";
  appointment?: never;
  doctorOptions: AppointmentSelectOption[];
  onClose?: () => void;
  initialValues?: AppointmentCreateInitialValues;
};

type AppointmentDetailPanelProps = EditProps | CreateProps;

const APPOINTMENT_LIST_HREF = "/appointments/dashboard";

// ─── Component ────────────────────────────────────────────────────────────────

export function AppointmentDetailPanel(props: AppointmentDetailPanelProps) {
  const { doctorOptions, onClose } = props;
  const isCreate = props.mode === "create";
  const appointment = !isCreate ? props.appointment : undefined;
  const documentsTabSlot = props.mode === "edit" ? props.documentsTab : undefined;
  const appointmentsTabSlot = props.mode === "edit" ? props.appointmentsTab : undefined;
  const prescriptionsTabSlot = props.mode === "edit" ? props.prescriptionsTab : undefined;
  const initialValues = isCreate ? props.initialValues : undefined;
  const router = useRouter();
  const { exitAfterMutation } = useDetailExit({
    listHref: APPOINTMENT_LIST_HREF,
    onClose,
  });
  const formRef  = useRef<DetailFormHandle | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteDialogPending, setDeleteDialogPending] = useState(false);
  const { user } = useAppSession();
  const isStaff = user.type === "staff";
  const canViewClinicalNotes = usePermission("viewClinicalNotes");
  const canViewAppointmentTitle = usePermission("viewAppointmentTitle");
  const canViewPrescriptions = usePermission("viewPrescriptions");

  const showAppointmentFeeField = isCreate
    ? !isStaff
    : !isStaff || appointment!.status === "completed";
  const appointmentFeeReadOnly =
    isStaff && !isCreate && appointment!.status === "completed";
  const showHeaderFeeLine =
    !isCreate && (!isStaff || appointment!.status === "completed");

  const createDefaults = useMemo(() => {
    const base = {
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
    } as unknown as DefaultValues<CreateAppointmentInput>;
    if (!initialValues) return base;
    return {
      ...base,
      patientId: initialValues.patientId ?? base.patientId,
      doctorId: initialValues.doctorId ?? base.doctorId,
      category: initialValues.category ?? base.category,
      visitType: initialValues.visitType ?? base.visitType,
    } as unknown as DefaultValues<CreateAppointmentInput>;
  }, [initialValues]);

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
        exitAfterMutation();
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
        exitAfterMutation();
      } else {
        toast.error(result.error ?? "Failed to update appointment.");
      }
    }
  };

  const handleOpenDeleteDialog = useCallback(() => {
    setDeleteDialogOpen(true);
  }, []);

  const handleConfirmDeleteAppointment = useCallback(async () => {
    if (!appointment) return;
    setDeleteDialogPending(true);
    try {
      const result = await deleteAppointment(appointment.id);
      if (result.success) {
        setDeleteDialogOpen(false);
        toast.success("Appointment cancelled.");
        exitAfterMutation();
      } else {
        toast.error(result.error ?? "Failed to cancel appointment.");
      }
    } finally {
      setDeleteDialogPending(false);
    }
  }, [appointment, exitAfterMutation]);

  const handleConfirmCancelAppointmentStatus = useCallback(async () => {
    if (!appointment) return;
    setDeleteDialogPending(true);
    try {
      const result = await updateAppointment({
        id: appointment.id,
        status: "cancelled",
      });
      if (result.success) {
        setDeleteDialogOpen(false);
        toast.success("Appointment cancelled.");
        exitAfterMutation();
      } else {
        toast.error(result.error ?? "Failed to update appointment.");
      }
    } finally {
      setDeleteDialogPending(false);
    }
  }, [appointment, exitAfterMutation]);

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
      : initialValues?.patientDisplayLabel;
    const patientComboboxDisabled = !isCreate || Boolean(initialValues?.patientId);
    const patientField: FormFieldDescriptor<CreateAppointmentInput | UpdateAppointmentInput> = {
      name: "patientId",
      label: "Patient",
      type: "custom",
      colSpan: 2,
      renderControl: (field) => (
        <AppointmentPatientCombobox
          field={field}
          disabled={patientComboboxDisabled}
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
    initialValues,
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
    <>
      <DetailPanel
        header={header}
        formRef={formRef}
        form={form}
        detailsTabIcon={ClipboardList}
        documentsTab={documentsTabSlot}
        appointmentsTab={appointmentsTabSlot}
        prescriptionsTab={
          canViewPrescriptions ? prescriptionsTabSlot : undefined
        }
        sidebarTop={
          !isCreate ? (
            <AppointmentPatientSummaryCard summary={appointment!.patientSummary} />
          ) : undefined
        }
        events={!isCreate ? appointment!.activityLog : []}
        hasMoreEvents={!isCreate ? appointment!.activityLogHasMore : false}
        entityType="appointment"
        entityId={!isCreate ? appointment!.id : ""}
        isCreate={isCreate}
        onCancel={onClose ?? (() => router.back())}
        onDelete={!isCreate ? handleOpenDeleteDialog : undefined}
        submitLabel={isCreate ? "Create Appointment" : "Save Changes"}
        deleteLabel="Delete appointment"
      />

      {!isCreate && (
        <AlertDialogPrimitive.Root
          open={deleteDialogOpen}
          onOpenChange={(open) => {
            if (open) {
              setDeleteDialogOpen(true);
            } else if (!deleteDialogPending) {
              setDeleteDialogOpen(false);
            }
          }}
        >
          <AlertDialogPrimitive.Portal>
            <AlertDialogPrimitive.Overlay
              className={cn(
                "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
                deleteDialogPending && "pointer-events-none"
              )}
              onPointerDown={(e) => {
                if (deleteDialogPending) return;
                if (e.target === e.currentTarget) {
                  setDeleteDialogOpen(false);
                }
              }}
            />
            <AlertDialogPrimitive.Content
              className={cn(
                "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 outline-none sm:max-w-lg"
              )}
            >
              <div className="relative flex items-start justify-between gap-3">
                <AlertDialogPrimitive.Title
                  className="text-lg font-semibold leading-none pr-10"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  Delete appointment?
                </AlertDialogPrimitive.Title>
                <AlertDialogPrimitive.Cancel asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={deleteDialogPending}
                    className="absolute right-0 top-0 shrink-0"
                    aria-label="Close"
                  >
                    <X className="size-4" />
                  </Button>
                </AlertDialogPrimitive.Cancel>
              </div>
              <AlertDialogPrimitive.Description
                className="text-sm"
                style={{ color: "var(--color-text-secondary)" }}
              >
                This will permanently remove the appointment from the system. Or would you like to mark it as cancelled instead?
              </AlertDialogPrimitive.Description>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={deleteDialogPending}
                  onClick={() => void handleConfirmCancelAppointmentStatus()}
                >
                  Cancel appointment
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={deleteDialogPending}
                  onClick={() => void handleConfirmDeleteAppointment()}
                >
                  Delete
                </Button>
              </div>
            </AlertDialogPrimitive.Content>
          </AlertDialogPrimitive.Portal>
        </AlertDialogPrimitive.Root>
      )}
    </>
  );
}
