"use client";

import { Skeleton } from "@/components/ui/skeleton";
import {
  MODAL_SHELL_SIZE_MAP,
  type ModalSize,
} from "@/components/common/modal-shell-sizes";
import { usePermission } from "@/lib/auth/session-context";

export type ModalDetailSkeletonVariant = "detail" | "create";

export interface ModalDetailPanelBodySkeletonProps {
  /**
   * Controls the **header** shape only:
   * - `detail` — view/edit header: avatar circle + name + badge chips.
   * - `create` — create header: title text + subtitle line.
   *
   * The **body** layout (form-only vs. form + sidebar) is derived from
   * `usePermission("viewDetailSidebar")`, mirroring `DetailPanel`'s own logic.
   * Staff always receives the full-width form skeleton regardless of variant.
   *
   * @default "detail"
   */
  variant?: ModalDetailSkeletonVariant;
}

const borderBottom = { borderBottom: "1px solid var(--color-border)" } as const;
const borderTop = { borderTop: "1px solid var(--color-border)" } as const;
const borderRight = { borderRight: "1px solid var(--color-border)" } as const;
const headerBg = { background: "var(--color-surface-alt)" } as const;

function CreateFormSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden px-6 py-4">
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    </div>
  );
}

function DetailFormAndSidebarSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-row overflow-hidden">
      <div
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
        style={borderRight}
      >
        <div
          className="flex shrink-0 gap-6 px-6 pt-3 pb-3"
          style={{ ...borderBottom, ...headerBg }}
        >
          <Skeleton className="h-4 w-16 rounded" />
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-4 w-28 rounded" />
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-6 py-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex min-h-0 w-[min(26.25rem,36vw)] max-w-[390px] shrink-0 flex-col gap-3 overflow-hidden px-3 pb-4 pt-4">
        <Skeleton className="h-32 w-full shrink-0 rounded-xl" />
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <Skeleton className="h-3 w-24 shrink-0" />
          <Skeleton className="min-h-0 flex-1 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

/**
 * Inner content skeleton only — matches `DetailPanel` (header / body / footer).
 * Use inside `ModalShell` as the `<Suspense>` fallback for intercepting modal routes
 * so the backdrop and panel mount once; only this region swaps when data resolves.
 *
 * No backdrop, no outer panel chrome, no enter animation.
 */
export function ModalDetailPanelBodySkeleton({
  variant = "detail",
}: ModalDetailPanelBodySkeletonProps) {
  const isCreate = variant === "create";
  const canViewSidebar = usePermission("viewDetailSidebar");
  // Mirror DetailPanel's exact logic: hide sidebar when creating OR when role
  // lacks viewDetailSidebar (staff). Keeps skeleton layout in sync with the
  // content that replaces it after data loads.
  const noSidebar = isCreate || !canViewSidebar;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div
        className="flex shrink-0 items-center justify-between px-6 py-4"
        style={{ ...borderBottom, ...headerBg }}
      >
        {isCreate ? (
          <>
            <div className="min-w-0 space-y-2">
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-3 w-72 max-w-full" />
            </div>
            <Skeleton className="h-9 w-9 shrink-0 rounded-md" />
          </>
        ) : (
          <>
            <div className="flex min-w-0 items-center gap-4">
              <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
              <div className="min-w-0 space-y-2">
                <Skeleton className="h-7 w-56 max-w-full" />
                <div className="flex flex-wrap items-center gap-2">
                  <Skeleton className="h-5 w-24 rounded-md" />
                  <Skeleton className="h-5 w-16 rounded-md" />
                </div>
              </div>
            </div>
            <Skeleton className="h-9 w-9 shrink-0 rounded-md" />
          </>
        )}
      </div>

      {noSidebar ? (
        <CreateFormSkeleton />
      ) : (
        <DetailFormAndSidebarSkeleton />
      )}

      <div
        className="flex shrink-0 items-center justify-end gap-3 px-6 py-4"
        style={borderTop}
      >
        <Skeleton className="h-9 w-20 rounded-md" />
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>
    </div>
  );
}

// ─── Full modal stack (legacy / rare use) ───────────────────────────────────

export interface ModalDetailSkeletonProps {
  /**
   * Must match the `ModalShell` `size` on the loaded page (`lg` for create modals, `xl` for detail).
   * @default "xl"
   */
  size?: ModalSize;
  variant?: ModalDetailSkeletonVariant;
}

/**
 * Standalone full-screen modal skeleton (backdrop + panel + animation).
 * Intercepting routes should prefer `ModalShell` + `ModalDetailPanelBodySkeleton` instead
 * to avoid double backdrop / double animation.
 */
export function ModalDetailSkeleton({
  size = "xl",
  variant = "detail",
}: ModalDetailSkeletonProps) {
  const { width, height } = MODAL_SHELL_SIZE_MAP[size];

  const backdropStyle = {
    background: "rgba(26, 26, 24, 0.35)",
    backdropFilter: "blur(3px)",
    WebkitBackdropFilter: "blur(3px)",
  } as const;

  const panelChrome = {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    boxShadow:
      "0 24px 64px -12px rgba(0,0,0,0.18), 0 8px 24px -4px rgba(0,0,0,0.08)",
  } as const;

  return (
    <>
      <div className="fixed inset-0 z-40" style={backdropStyle} aria-hidden />
      <div
        className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-8"
        aria-busy
        role="dialog"
        aria-label="Loading"
      >
        <div
          className="pointer-events-auto flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl animate-in fade-in-0 zoom-in-95 duration-200"
          style={{
            width,
            height,
            ...panelChrome,
          }}
        >
          <ModalDetailPanelBodySkeleton variant={variant} />
        </div>
      </div>
    </>
  );
}
