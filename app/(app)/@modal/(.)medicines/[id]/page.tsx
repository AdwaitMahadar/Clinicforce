"use client";

/**
 * app/(app)/@modal/(.)medicines/[id]/page.tsx
 *
 * Intercepting modal route for medicine detail.
 *
 * This page renders when the user clicks a medicine row from
 * /medicines/dashboard (client-side navigation). Next.js intercepts the
 * /medicines/[id] URL and renders this component as an overlay, keeping
 * the underlying dashboard mounted and visible.
 *
 * On direct URL access or page refresh, the intercepting route is bypassed
 * and app/(app)/medicines/[id]/page.tsx is used instead.
 *
 * Interaction model:
 * - Backdrop click  → router.back() (restores URL to /medicines/dashboard)
 * - Close button    → router.back()
 * - Escape key      → router.back()
 */

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getMockMedicineDetail } from "@/mock/medicines/detail";
import { MedicineDetailPanel } from "@/app/(app)/medicines/_components/MedicineDetailPanel";

interface InterceptedMedicineModalProps {
  params: Promise<{ id: string }>;
}

export default function InterceptedMedicineModal({ params }: InterceptedMedicineModalProps) {
  const router = useRouter();
  const [medicine, setMedicine] = useState<ReturnType<typeof getMockMedicineDetail>>(null);

  // Unwrap params — Next.js 15 async params
  useEffect(() => {
    params.then(({ id }) => {
      setMedicine(getMockMedicineDetail(id));
    });
  }, [params]);

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  // Escape key to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [handleClose]);

  if (!medicine) return null;

  return (
    <>
      {/* ── Backdrop ─────────────────────────────────────────────── */}
      <div
        className="fixed inset-0 z-40"
        style={{
          background: "rgba(26, 26, 24, 0.35)",
          backdropFilter: "blur(3px)",
          WebkitBackdropFilter: "blur(3px)",
        }}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* ── Modal panel ──────────────────────────────────────────── */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-8"
        aria-modal="true"
        role="dialog"
        aria-label={`Edit ${medicine.name}`}
      >
        <div
          className="pointer-events-auto rounded-2xl overflow-hidden flex flex-col animate-in fade-in-0 zoom-in-95 duration-200"
          style={{
            width: "min(92vw, 1650px)",
            height: "min(90vh, 1080px)",
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            boxShadow:
              "0 24px 64px -12px rgba(0,0,0,0.18), 0 8px 24px -4px rgba(0,0,0,0.08)",
          }}
        >
          <MedicineDetailPanel mode="edit" medicine={medicine} onClose={handleClose} />
        </div>
      </div>
    </>
  );
}
