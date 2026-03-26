/**
 * app/(app)/patients/dashboard/page.tsx
 *
 * Pure async Server Component. Reads searchParams from the URL
 * (managed by TableFilterBar + TablePagination via nuqs), calls the
 * server action directly, and renders the full page UI.
 *
 * No "use client", no useState, no useEffect, no client shell.
 */

import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  TableFilterBar,
  TablePagination,
} from "@/components/common";
import type { FilterColumn } from "@/components/common";
import { PatientsTable } from "../_components/PatientsTable";
import { getPatients } from "@/lib/actions/patients";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants/app";
import type { PatientRow } from "@/types/patient";



const PATIENT_FILTER_COLUMNS: FilterColumn[] = [
  {
    key: "status",
    label: "Status",
    type: "select",
    options: [
      { label: "Active",   value: "active"   },
      { label: "Inactive", value: "inactive" },
    ],
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PatientsDashboardPage({ searchParams }: PageProps) {
  const sp     = await searchParams;
  const search = typeof sp.search === "string" ? sp.search : undefined;
  const status = typeof sp.status === "string"
    ? (sp.status as "active" | "inactive")
    : undefined;
  const page   = typeof sp.page   === "string" ? Math.max(1, parseInt(sp.page, 10) || 1) : 1;

  const result = await getPatients({ search, status, page, pageSize: DEFAULT_PAGE_SIZE });

  if (!result.success) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: PatientRow[] = (result.data.rows as any[]).map((r: any): PatientRow => ({
    id:             r.id,
    chartId:        r.chartId as number,
    firstName:      r.firstName,
    lastName:       r.lastName,
    email:          r.email ?? "",
    phone:          r.phone ?? "",
    lastVisit:      r.lastVisit
      ? format(new Date(r.lastVisit), "MMM d, yyyy")
      : "No visits",
    assignedDoctor: r.assignedDoctor ?? "—",
    /** List rows from `getPatients` carry `status` only — `isActive` is not on the payload. */
    status:         r.status,
  }));
  const total = result.data.total;

  return (
    <div className="p-8 h-full flex flex-col gap-5">
      <div className="max-w-[1700px] mx-auto w-full flex flex-col gap-5 flex-1 min-h-0">
        <PageHeader
          title="Patients Directory"
          subtitle="Manage patient records, history, and active treatments."
          actions={
            <Link href="/patients/new">
              <Button
                className="gap-2 shadow-sm"
                style={{ background: "var(--color-ink)", color: "var(--color-ink-fg)" }}
              >
                <Plus size={15} />
                New Patient
              </Button>
            </Link>
          }
        />

        <TableFilterBar
          searchPlaceholder="Search by name, ID, or phone number..."
          filterColumns={PATIENT_FILTER_COLUMNS}
        />

        <div className="flex-1 min-h-0">
          <PatientsTable data={rows} />
        </div>

        <TablePagination totalRows={total} pageSize={DEFAULT_PAGE_SIZE} entityLabel="patient" />
      </div>
    </div>
  );
}
