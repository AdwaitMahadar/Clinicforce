import { Skeleton } from "@/components/ui/skeleton";
import {
  MODAL_SHELL_SIZE_MAP,
  type ModalSize,
} from "@/components/common/modal-shell-sizes";

export type ModalDetailSkeletonVariant = "detail" | "create";

export interface ModalDetailSkeletonProps {
  /**
   * Must match the `ModalShell` `size` on the loaded page (`lg` for create modals, `xl` for detail).
   * @default "xl"
   */
  size?: ModalSize;
  /**
   * `detail` — multi-column layout like edit/view panels with sidebar zones.
   * `create` — single-form two-column grid (matches `DetailPanel` create flows).
   * @default "detail"
   */
  variant?: ModalDetailSkeletonVariant;
}

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

function DetailVariantBody() {
  return (
    <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden">
      <div className="lg:col-span-4 space-y-4 overflow-y-auto min-h-0 pr-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
      <div className="lg:col-span-5 space-y-4 hidden lg:flex flex-col min-h-0">
        <Skeleton className="h-8 w-40 shrink-0" />
        <Skeleton className="flex-1 min-h-[240px] w-full rounded-xl" />
      </div>
      <div className="lg:col-span-3 space-y-4 hidden lg:flex flex-col min-h-0">
        <Skeleton className="h-36 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    </div>
  );
}

function CreateVariantBody() {
  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-y-auto pr-1">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
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

/**
 * Matches `ModalShell` panel dimensions while async modal pages load.
 * Use `size` + `variant` with the same values as the target route’s `ModalShell`.
 */
export function ModalDetailSkeleton({
  size = "xl",
  variant = "detail",
}: ModalDetailSkeletonProps) {
  const { width, height } = MODAL_SHELL_SIZE_MAP[size];

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
          className="pointer-events-auto rounded-2xl overflow-hidden flex flex-col gap-4 p-6 sm:p-8 w-full animate-in fade-in-0 zoom-in-95 duration-200"
          style={{
            width,
            height,
            ...panelChrome,
          }}
        >
          <div className="flex items-center justify-between gap-4 shrink-0">
            <Skeleton className="h-8 w-64 max-w-[70%]" />
            <Skeleton className="h-9 w-9 rounded-md shrink-0" />
          </div>
          {variant === "create" ? <CreateVariantBody /> : <DetailVariantBody />}
        </div>
      </div>
    </>
  );
}
