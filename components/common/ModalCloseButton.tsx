"use client";

/**
 * components/common/ModalCloseButton.tsx
 *
 * Tiny "use client" component for the modal X button.
 * Calls router.back() so intercepting modal routes restore the previous URL.
 * Used inside ModalShell and anywhere a "close = go back" button is needed.
 */

import { useRouter } from "next/navigation";

interface ModalCloseButtonProps {
  onClose?: () => void;
}

export function ModalCloseButton({ onClose }: ModalCloseButtonProps) {
  const router = useRouter();
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      router.back();
    }
  };
  return (
    <button
      onClick={handleClose}
      className="size-8 rounded-lg flex items-center justify-center transition-colors focus:outline-none"
      style={{ color: "var(--color-text-muted)" }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "var(--color-border)";
        (e.currentTarget as HTMLButtonElement).style.color      = "var(--color-text-primary)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
        (e.currentTarget as HTMLButtonElement).style.color      = "var(--color-text-muted)";
      }}
      aria-label="Close"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </button>
  );
}
