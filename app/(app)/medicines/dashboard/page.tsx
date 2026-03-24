/**
 * app/(app)/medicines/dashboard/page.tsx
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
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  TableFilterBar,
  TablePagination,
} from "@/components/common";
import type { FilterColumn } from "@/components/common";
import { MedicinesTable } from "../_components/MedicinesTable";
import { getMedicines } from "@/lib/actions/medicines";
import type { MedicineRow } from "@/types/medicine";
import Link from "next/link";

const PAGE_SIZE = 10;



const MEDICINE_FILTER_COLUMNS: FilterColumn[] = [
  {
    key: "category",
    label: "Category",
    type: "select",
    options: [
      { label: "Antibiotics",   value: "Antibiotics"   },
      { label: "Painkillers",   value: "Painkillers"   },
      { label: "Diabetes Care", value: "Diabetes Care" },
      { label: "Antihistamines",value: "Antihistamines"},
      { label: "Vitamins",      value: "Vitamins"      },
      { label: "Cardiovascular",value: "Cardiovascular"},
    ],
  },
  { key: "form", label: "Form", type: "text" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function MedicinesDashboardPage({ searchParams }: PageProps) {
  const sp       = await searchParams;
  const search   = typeof sp.search   === "string" ? sp.search   : undefined;
  const category = typeof sp.category === "string" ? sp.category : undefined;
  const form     = typeof sp.form     === "string" ? sp.form     : undefined;
  const page     = typeof sp.page     === "string" ? Math.max(1, parseInt(sp.page, 10) || 1) : 1;

  const result = await getMedicines({ search, category, form, page, pageSize: PAGE_SIZE });

  if (!result.success) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: MedicineRow[] = (result.data.rows as any[]).map((r: any): MedicineRow => ({
    id:       r.id,
    name:     r.name,
    category: r.category ?? "—",
    brand:    r.brand    ?? "—",
    lastUsed: r.lastPrescribedDate
      ? format(new Date(r.lastPrescribedDate), "MMM d, yyyy")
      : "Never",
    icon:     "pill",
    status:   r.isActive ? "active" : "inactive",
  }));
  const total = result.data.total;

  return (
    <div className="p-8 h-full flex flex-col gap-5">
      <div className="max-w-[1700px] mx-auto w-full flex flex-col gap-5 flex-1 min-h-0">
        <PageHeader
          title="Medicines"
          subtitle="Manage the clinic's medicine and prescription inventory."
          actions={
            <Link href="/medicines/new">
              <Button
                className="gap-2 shadow-sm"
                style={{ background: "var(--color-ink)", color: "var(--color-ink-fg)" }}
              >
                <Plus size={15} />
                New Medicine
              </Button>
            </Link>
          }
        />

        <TableFilterBar
          searchPlaceholder="Search by name, brand, or category..."
          filterColumns={MEDICINE_FILTER_COLUMNS}
        />

        <div className="flex-1 min-h-0">
          <MedicinesTable data={rows} />
        </div>

        <TablePagination totalRows={total} pageSize={PAGE_SIZE} entityLabel="medicine" />
      </div>
    </div>
  );
}
