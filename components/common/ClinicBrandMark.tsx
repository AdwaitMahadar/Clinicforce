"use client";

import { InitialsBadge } from "@/components/common/InitialsBadge";
import { cn } from "@/lib/utils";

export interface ClinicBrandMarkProps {
  clinicName: string;
  clinicLogoUrl: string;
  /** Root wrapper — default matches sidebar (`size-9 rounded-lg`). */
  className?: string;
}

/**
 * Clinic logo as `background-image` over a permanent `InitialsBadge` — browser cache only;
 * failed or missing image leaves initials visible.
 */
export function ClinicBrandMark({
  clinicName,
  clinicLogoUrl,
  className,
}: ClinicBrandMarkProps) {
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-lg",
        className ?? "size-9"
      )}
    >
      <InitialsBadge
        name={clinicName}
        size="md"
        className="absolute inset-0 z-0 size-full shrink-0 rounded-lg"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] rounded-lg bg-contain bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${JSON.stringify(clinicLogoUrl)})` }}
      />
    </div>
  );
}
