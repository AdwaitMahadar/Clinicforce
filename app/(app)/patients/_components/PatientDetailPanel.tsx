"use client";

/**
 * app/(app)/patients/_components/PatientDetailPanel.tsx
 *
 * DetailPanel + DetailForm (Details tab) + Documents / Appointments tabs + activity sidebar.
 *
 *   mode="view"   — editable form + sidebar
 *   mode="create" — new patient form; no sidebar
 */

import { useRef, useState, type ReactNode } from "react";
import type { DefaultValues } from "react-hook-form";
import { useRouter } from "next/navigation";
import { differenceInYears, isValid, parseISO } from "date-fns";
import { UserRound } from "lucide-react";
import { AlertDialog as AlertDialogPrimitive } from "radix-ui";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { InitialsBadge, StatusBadge, DetailPanel, DetailForm, PanelCloseButton } from "@/components/common";
import type { DetailFormHandle } from "@/components/common/DetailForm";
import type { FormFieldDescriptor } from "@/components/common/DetailForm";
import type { PatientDetailCore } from "@/types/patient";
import {
  createPatientSchema,
  updatePatientSchema,
  PATIENT_GENDERS,
  type CreatePatientInput,
  type UpdatePatientInput,
} from "@/lib/validators/patient";
import { PATIENT_BLOOD_GROUPS } from "@/lib/constants/patient";
import {
  createPatient,
  updatePatient,
  deactivatePatient,
} from "@/lib/actions/patients";
import { useDetailExit } from "@/lib/hooks/use-detail-exit";
import { usePermission } from "@/lib/auth/session-context";
import { PatientDobAgeSync } from "./PatientDobAgeSync";

// ─── Props ────────────────────────────────────────────────────────────────────

type PatientDetailPanelProps =
  | { mode: "create"; onClose?: () => void }
  | {
      mode: "view";
      patient: PatientDetailCore;
      documentsTab: ReactNode;
      appointmentsTab: ReactNode;
      prescriptionsTab?: ReactNode;
      onClose?: () => void;
    };

// ─── Gender / blood options for DetailForm selects ─────────────────────────────

const GENDER_OPTION_LABEL: Record<(typeof PATIENT_GENDERS)[number], string> = {
  male:   "Male",
  female: "Female",
  other:  "Other",
};

const GENDER_SELECT_OPTIONS = PATIENT_GENDERS.map((value) => ({
  value,
  label: GENDER_OPTION_LABEL[value],
}));

const BLOOD_GROUP_OPTIONS = PATIENT_BLOOD_GROUPS.map((b) => ({
  label: b,
  value: b,
}));

function patientGenderToForm(g: PatientDetailCore["gender"]): "male" | "female" | "other" {
  const lower = String(g).toLowerCase();
  if (lower === "male") return "male";
  if (lower === "female") return "female";
  if (lower === "other") return "other";
  if (g === "Prefer not to say") return "other";
  return "other";
}

/** Display-only age for the form (derived from stored DOB until the user edits). */
function ageStringFromBirthIso(iso: string | undefined): string {
  const t = iso?.trim();
  if (!t) return "";
  try {
    const d = parseISO(t.slice(0, 10));
    if (!isValid(d)) return "";
    return String(differenceInYears(new Date(), d));
  } catch {
    return "";
  }
}

// ─── Field grid (matches previous create form layout: 2-column grid) ─────────

const PATIENT_FIELDS: FormFieldDescriptor<CreatePatientInput>[] = [
  { name: "firstName", label: "First Name", type: "text", placeholder: "Michael" },
  { name: "lastName", label: "Last Name", type: "text", placeholder: "Ross" },
  {
    name: "address",
    label: "Address",
    type: "text",
    colSpan: 2,
    placeholder: "123 Maple Avenue, Springfield, IL 62704",
  },
  { name: "dateOfBirth", label: "Date of Birth", type: "date" },
  {
    name: "age",
    label: "Age",
    type: "number",
    placeholder: "Years",
  },
  {
    name: "gender",
    label: "Gender",
    type: "select",
    colSpan: 2,
    constrainControlToHalfRow: true,
    options: GENDER_SELECT_OPTIONS,
  },
  {
    name: "phone",
    label: "Phone",
    type: "text",
    placeholder: "(555) 123-4567",
  },
  {
    name: "email",
    label: "Email",
    type: "email",
    placeholder: "patient@example.com",
  },
  {
    name: "bloodGroup",
    label: "Blood Group",
    type: "select",
    placeholder: "—",
    options: BLOOD_GROUP_OPTIONS,
  },
  {
    name: "allergies",
    label: "Allergies",
    type: "text",
    placeholder: "e.g. Penicillin, Peanuts (or leave blank)",
  },
  {
    name: "emergencyContactName",
    label: "Contact Name",
    type: "text",
    placeholder: "Sarah Ross (Wife)",
  },
  {
    name: "emergencyContactPhone",
    label: "Contact Phone",
    type: "text",
    placeholder: "(555) 987-6543",
  },
  {
    name: "pastHistoryNotes",
    label: "Patient's Past History",
    type: "textarea",
    rows: 12,
    colSpan: 2,
    className: "min-h-[220px]",
    placeholder:
      "Relevant medical history, referrals, or background for clinical context…",
  },
];

const EMPTY_CREATE: DefaultValues<CreatePatientInput> = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  age: undefined,
  gender: "male",
  address: "",
  bloodGroup: undefined,
  allergies: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  pastHistoryNotes: "",
};

// ─── Main component ───────────────────────────────────────────────────────────

const PATIENT_LIST_HREF = "/patients/dashboard";

export function PatientDetailPanel(props: PatientDetailPanelProps) {
  const { onClose } = props;
  const router = useRouter();
  const { exitAfterMutation } = useDetailExit({
    listHref: PATIENT_LIST_HREF,
    onClose,
  });
  const formRef = useRef<DetailFormHandle | null>(null);
  const [reactivateDialogOpen, setReactivateDialogOpen] = useState(false);
  const [pendingReactivateValues, setPendingReactivateValues] =
    useState<UpdatePatientInput | null>(null);

  const isCreate = props.mode === "create";
  const patient = props.mode === "view" ? props.patient : undefined;
  const documentsTabSlot = props.mode === "view" ? props.documentsTab : undefined;
  const appointmentsTabSlot = props.mode === "view" ? props.appointmentsTab : undefined;
  const prescriptionsTabSlot = props.mode === "view" ? props.prescriptionsTab : undefined;
  const canViewClinicalNotes = usePermission("viewClinicalNotes");
  const canViewPrescriptions = usePermission("viewPrescriptions");
  const visibleFields = canViewClinicalNotes
    ? PATIENT_FIELDS
    : PATIENT_FIELDS.filter((f) => f.name !== "pastHistoryNotes");

  const viewDefaultValues: UpdatePatientInput | null = patient
    ? ({
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        phone: patient.phone,
        dateOfBirth: patient.dateOfBirthIso ?? "",
        age: (() => {
          const s = ageStringFromBirthIso(patient.dateOfBirthIso);
          return s === "" ? undefined : Number(s);
        })(),
        gender: patientGenderToForm(patient.gender),
        address: patient.address,
        bloodGroup: patient.bloodGroup
          ? (patient.bloodGroup as UpdatePatientInput["bloodGroup"])
          : undefined,
        allergies: patient.allergies ?? "",
        emergencyContactName: patient.emergencyContactName,
        emergencyContactPhone: patient.emergencyContactPhone,
        pastHistoryNotes: patient.pastHistoryNotes ?? "",
      } satisfies UpdatePatientInput)
    : null;

  const handleSubmitCreate = async (values: CreatePatientInput) => {
    const result = await createPatient(values);
    if (result.success) {
      toast.success("Patient registered successfully.");
      exitAfterMutation();
    } else {
      toast.error(result.error ?? "Failed to register patient.");
    }
  };

  const handleSubmitUpdate = async (values: UpdatePatientInput) => {
    if (!patient?.isActive) {
      setPendingReactivateValues(values);
      setReactivateDialogOpen(true);
      return;
    }
    const result = await updatePatient(values);
    if (result.success) {
      toast.success("Patient updated successfully.");
      exitAfterMutation();
    } else {
      toast.error(result.error ?? "Failed to update patient.");
    }
  };

  const handleConfirmReactivateAndSave = async () => {
    if (!pendingReactivateValues || !patient) return;
    const result = await updatePatient({
      ...pendingReactivateValues,
      isActive: true,
    });
    if (result.success) {
      setReactivateDialogOpen(false);
      setPendingReactivateValues(null);
      toast.success("Patient reactivated and updated successfully.");
      exitAfterMutation();
    } else {
      toast.error(result.error ?? "Failed to update patient.");
    }
  };

  const handleDeactivate = async () => {
    if (!patient) return;
    const result = await deactivatePatient(patient.id);
    if (result.success) {
      toast.success("Patient deactivated.");
      exitAfterMutation();
    } else {
      toast.error(result.error ?? "Failed to deactivate patient.");
    }
  };

  // ── CREATE MODE ────────────────────────────────────────────────────────────
  if (isCreate) {
    const header = (
      <>
        <div>
          <h2 className="text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            New Patient
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            Fill in the details below to register a new patient record.
          </p>
        </div>
        {onClose && <PanelCloseButton onClose={onClose} />}
      </>
    );

    const form = (
      <DetailForm<CreatePatientInput>
        ref={formRef}
        schema={createPatientSchema}
        defaultValues={EMPTY_CREATE}
        fields={visibleFields}
        insideForm={<PatientDobAgeSync />}
        onSubmit={handleSubmitCreate}
      />
    );

    return (
      <DetailPanel
        header={header}
        formRef={formRef}
        form={form}
        isCreate
        onCancel={onClose ?? (() => router.back())}
        submitLabel="Save Patient"
      />
    );
  }

  // ── VIEW MODE ──────────────────────────────────────────────────────────────
  if (!patient || !viewDefaultValues) return null;

  const fullName = `${patient.firstName} ${patient.lastName}`;

  const header = (
    <>
      <div className="flex items-center gap-4">
        <InitialsBadge name={fullName} size="lg" />
        <div>
          <h2 className="text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>{fullName}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="font-mono text-xs px-2 py-0.5 rounded-md"
              style={{ background: "var(--color-surface-alt)", color: "var(--color-text-muted)", border: "1px solid var(--color-border)" }}
            >
              {patient.chartId}
            </span>
            <StatusBadge status={patient.status} />
          </div>
        </div>
      </div>
      {onClose && <PanelCloseButton onClose={onClose} />}
    </>
  );

  const form = (
    <DetailForm<UpdatePatientInput>
      ref={formRef}
      schema={updatePatientSchema}
      defaultValues={viewDefaultValues}
      fields={visibleFields as FormFieldDescriptor<UpdatePatientInput>[]}
      insideForm={<PatientDobAgeSync />}
      onSubmit={handleSubmitUpdate}
    />
  );

  return (
    <>
      <DetailPanel
        header={header}
        formRef={formRef}
        form={form}
        detailsTabIcon={UserRound}
        documentsTab={documentsTabSlot}
        appointmentsTab={appointmentsTabSlot}
        prescriptionsTab={
          canViewPrescriptions ? prescriptionsTabSlot : undefined
        }
        events={patient.activityLog}
        hasMoreEvents={patient.activityLogHasMore}
        entityType="patient"
        entityId={patient.id}
        isCreate={false}
        onCancel={onClose ?? (() => router.back())}
        onDelete={
          !patient?.isActive ? undefined : () => void handleDeactivate()
        }
        deleteLabel="Deactivate Patient"
        submitLabel="Save Changes"
      />

      <AlertDialogPrimitive.Root
        open={reactivateDialogOpen}
        onOpenChange={(open) => {
          setReactivateDialogOpen(open);
          if (!open) setPendingReactivateValues(null);
        }}
      >
        <AlertDialogPrimitive.Portal>
          <AlertDialogPrimitive.Overlay
            className={cn(
              "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50"
            )}
          />
          <AlertDialogPrimitive.Content
            className={cn(
              "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 outline-none sm:max-w-lg"
            )}
          >
            <AlertDialogPrimitive.Title className="sr-only">
              Confirm reactivation
            </AlertDialogPrimitive.Title>
            <AlertDialogPrimitive.Description
              className="text-sm"
              style={{ color: "var(--color-text-primary)" }}
            >
              This patient is currently inactive. Saving these changes will
              reactivate them. Do you want to continue?
            </AlertDialogPrimitive.Description>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <AlertDialogPrimitive.Cancel asChild>
                <Button type="button" variant="outline" size="sm">
                  Cancel
                </Button>
              </AlertDialogPrimitive.Cancel>
              <Button
                type="button"
                size="sm"
                style={{
                  background: "var(--color-ink)",
                  color: "var(--color-ink-fg)",
                }}
                onClick={() => void handleConfirmReactivateAndSave()}
              >
                Confirm
              </Button>
            </div>
          </AlertDialogPrimitive.Content>
        </AlertDialogPrimitive.Portal>
      </AlertDialogPrimitive.Root>
    </>
  );
}
