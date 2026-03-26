"use client";

/**
 * Intercepting-route modal shell built on shadcn `Dialog` (Radix).
 *
 * - Controlled as always open (`open={true}`); closing runs `onClose` or `router.back()`.
 * - Focus trap, scroll lock, focus restoration, and dialog ARIA are handled by Radix.
 * - Size presets: `modal-shell-sizes.ts` (shared with `ModalDetailSkeleton`).
 *
 * Does not edit `components/ui/dialog.tsx` — composes `Dialog`, `DialogPortal`,
 * `DialogOverlay`, `DialogTitle`, and Radix `DialogPrimitive.Content`.
 */

import { useCallback } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Dialog as DialogPrimitive } from "radix-ui";

import {
  Dialog,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import {
  MODAL_SHELL_SIZE_MAP,
  type ModalSize,
} from "@/components/common/modal-shell-sizes";

export type { ModalSize };

export interface ModalShellProps {
  children: ReactNode;
  /** Accessible name; also rendered as a screen-reader-only `DialogTitle`. */
  label?: string;
  size?: ModalSize;
  width?: string;
  height?: string;
  onClose?: () => void;
  closeOnEscape?: boolean;
  closeOnBackdropClick?: boolean;
  panelClassName?: string;
}

export function ModalShell({
  children,
  label,
  size = "xl",
  width,
  height,
  onClose,
  closeOnEscape = true,
  closeOnBackdropClick = true,
  panelClassName = "",
}: ModalShellProps) {
  const router = useRouter();

  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    } else {
      router.back();
    }
  }, [onClose, router]);

  const onOpenChange = useCallback(
    (open: boolean) => {
      if (!open) handleClose();
    },
    [handleClose]
  );

  const resolvedSize = MODAL_SHELL_SIZE_MAP[size];
  const resolvedWidth = width ?? resolvedSize.width;
  const resolvedHeight = height ?? resolvedSize.height;

  const titleText = label ?? "Dialog";

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay
          className={cn(
            "bg-(--color-modal-overlay) backdrop-blur-[3px] [-webkit-backdrop-filter:blur(3px)]"
          )}
        />
        <DialogPrimitive.Content
          onOpenAutoFocus={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => {
            if (!closeOnEscape) e.preventDefault();
          }}
          onPointerDownOutside={(e) => {
            if (!closeOnBackdropClick) e.preventDefault();
          }}
          onInteractOutside={(e) => {
            if (!closeOnBackdropClick) e.preventDefault();
          }}
          className={cn(
            "fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-4rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl outline-none duration-200",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            panelClassName
          )}
          style={{
            width: resolvedWidth,
            height: resolvedHeight,
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            boxShadow: "var(--shadow-modal)",
          }}
        >
          <DialogTitle className="sr-only">{titleText}</DialogTitle>
          {children}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
