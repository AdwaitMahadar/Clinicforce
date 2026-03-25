"use client";

/**
 * Global search palette — Dialog + cmdk Command, debounced `searchGlobal`,
 * entity-grouped results with navigation or presigned document open.
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { CalendarDays, Loader2, Pill, Users } from "lucide-react";
import { toast } from "sonner";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { searchGlobal } from "@/lib/actions/search";
import { getViewPresignedUrl } from "@/lib/actions/documents";
import { DOCUMENT_TYPE_LABELS, type DocumentType } from "@/lib/constants/document";
import type { GroupedSearchResults } from "@/types/search";
import { DocumentMimeTypeIcon } from "@/components/common/DocumentMimeTypeIcon";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatPatientChartId } from "@/lib/utils/chart-id";

const DEBOUNCE_MS = 300;

function documentTypeLabel(type: string): string {
  return DOCUMENT_TYPE_LABELS[type as DocumentType] ?? type;
}

function totalHits(data: GroupedSearchResults | null): number {
  if (!data) return 0;
  return (
    data.patients.length +
    data.appointments.length +
    data.medicines.length +
    data.documents.length
  );
}

export interface UniversalSearchProps {
  open: boolean;
  onClose: () => void;
}

export function UniversalSearch({ open, onClose }: UniversalSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GroupedSearchResults | null>(null);
  const [openingDocId, setOpeningDocId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setDebouncedQuery("");
      setResults(null);
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    if (debouncedQuery.length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void searchGlobal(debouncedQuery).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (res.success) {
        setResults(res.data);
      } else {
        toast.error(res.error ?? "Search failed.");
        setResults(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, open]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleDocumentOpen = useCallback(
    async (id: string) => {
      setOpeningDocId(id);
      try {
        const res = await getViewPresignedUrl(id);
        if (!res.success) {
          toast.error(res.error ?? "Could not open document.");
          return;
        }
        window.open(res.data.url, "_blank", "noopener,noreferrer");
        handleClose();
      } catch {
        toast.error("Could not open document.");
      } finally {
        setOpeningDocId(null);
      }
    },
    [handleClose]
  );

  const emptyAfterSearch =
    !loading &&
    debouncedQuery.length >= 2 &&
    results !== null &&
    totalHits(results) === 0;

  const showMinLengthHint = !loading && debouncedQuery.length < 2;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
      }}
    >
      <DialogContent
        className="overflow-hidden gap-0 p-0 sm:max-w-xl"
        showCloseButton
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Search</DialogTitle>
          <DialogDescription>
            Search patients, appointments, medicines, and documents.
          </DialogDescription>
        </DialogHeader>

        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Search patients, appointments, medicines, documents…"
            style={{
              color: "var(--color-text-primary)",
            }}
          />
          <CommandList
            className="overflow-x-hidden overflow-y-auto max-h-[min(55vh,360px)]"
          >
            {loading && (
              <div
                className="flex items-center justify-center gap-2 py-10 text-sm"
                style={{ color: "var(--color-text-muted)" }}
              >
                <Loader2 className="size-4 animate-spin shrink-0" aria-hidden />
                Searching…
              </div>
            )}

            {!loading && showMinLengthHint && (
              <div
                className="px-3 py-8 text-center text-sm"
                style={{ color: "var(--color-text-muted)" }}
              >
                Type something to search patients, appointments, medicines, or documents.
              </div>
            )}

            {!loading && emptyAfterSearch && (
              <div
                className="px-3 py-10 text-center text-sm"
                style={{ color: "var(--color-text-muted)" }}
              >
                No results found.
              </div>
            )}

            {!loading && results && results.patients.length > 0 && (
              <CommandGroup
                heading="Patients"
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
              >
                {results.patients.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={`patient-${p.id}`}
                    onSelect={() => {
                      router.push(`/patients/view/${p.id}`);
                      handleClose();
                    }}
                    className="cursor-pointer items-start gap-2 py-2.5"
                  >
                    <Users
                      className="mt-0.5 shrink-0"
                      size={18}
                      strokeWidth={2}
                      style={{ color: "var(--color-text-secondary)" }}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-sm font-medium truncate"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {p.firstName} {p.lastName}
                      </p>
                      <p
                        className="text-xs mt-0.5"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        {formatPatientChartId(p.chartId)}
                        {p.phone ? ` · ${p.phone}` : ""}
                      </p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {!loading && results && results.appointments.length > 0 && (
              <CommandGroup
                heading="Appointments"
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
              >
                {results.appointments.map((a) => {
                  let dateLabel = "—";
                  try {
                    dateLabel = format(parseISO(a.date), "EEE, MMM d, yyyy");
                  } catch {
                    /* ignore */
                  }
                  return (
                    <CommandItem
                      key={a.id}
                      value={`appointment-${a.id}`}
                      onSelect={() => {
                        router.push(`/appointments/view/${a.id}`);
                        handleClose();
                      }}
                      className="cursor-pointer items-start gap-2 py-2.5"
                    >
                      <CalendarDays
                        className="mt-0.5 shrink-0"
                        size={18}
                        strokeWidth={2}
                        style={{ color: "var(--color-text-secondary)" }}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-sm font-medium truncate"
                          style={{ color: "var(--color-text-primary)" }}
                        >
                          {a.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span
                            className="text-xs"
                            style={{ color: "var(--color-text-muted)" }}
                          >
                            {dateLabel}
                          </span>
                          <StatusBadge status={a.status} className="text-[10px] py-0 px-2" />
                        </div>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}

            {!loading && results && results.medicines.length > 0 && (
              <CommandGroup
                heading="Medicines"
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
              >
                {results.medicines.map((m) => {
                  const metaParts = [m.category, m.brand].filter(Boolean);
                  const meta =
                    metaParts.length === 2
                      ? `${metaParts[0]} . ${metaParts[1]}`
                      : metaParts.length === 1
                        ? metaParts[0]
                        : null;
                  return (
                    <CommandItem
                      key={m.id}
                      value={`medicine-${m.id}`}
                      onSelect={() => {
                        router.push(`/medicines/view/${m.id}`);
                        handleClose();
                      }}
                      className="cursor-pointer items-start gap-2 py-2.5"
                    >
                      <Pill
                        className="mt-0.5 shrink-0"
                        size={18}
                        strokeWidth={2}
                        style={{ color: "var(--color-text-secondary)" }}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-sm font-medium truncate"
                          style={{ color: "var(--color-text-primary)" }}
                        >
                          {m.name}
                        </p>
                        {meta && (
                          <p
                            className="text-xs mt-0.5 truncate"
                            style={{ color: "var(--color-text-muted)" }}
                          >
                            {meta}
                          </p>
                        )}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}

            {!loading && results && results.documents.length > 0 && (
              <CommandGroup
                heading="Documents"
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
              >
                {results.documents.map((d) => {
                  const displayTitle = d.title?.trim() || d.fileName;
                  const busy = openingDocId === d.id;
                  return (
                    <CommandItem
                      key={d.id}
                      value={`document-${d.id}`}
                      disabled={busy}
                      onSelect={() => {
                        void handleDocumentOpen(d.id);
                      }}
                      className="cursor-pointer items-start gap-2 py-2.5"
                    >
                      <DocumentMimeTypeIcon
                        mimeType={d.mimeType}
                        iconSize={16}
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-sm font-medium truncate"
                          style={{ color: "var(--color-text-primary)" }}
                        >
                          {displayTitle}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <Badge
                            variant="outline"
                            className="text-[10px] font-medium px-2 py-0 rounded-full"
                            style={{
                              background: "var(--color-surface-alt)",
                              color: "var(--color-text-secondary)",
                              borderColor: "var(--color-border)",
                            }}
                          >
                            {documentTypeLabel(d.type)}
                          </Badge>
                          {d.patientName && (
                            <span
                              className="text-xs truncate max-w-[12rem]"
                              style={{ color: "var(--color-text-muted)" }}
                            >
                              {d.patientName}
                            </span>
                          )}
                        </div>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
