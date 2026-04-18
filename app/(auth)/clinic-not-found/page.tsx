import type { Metadata } from "next";
import { AuthPanelLeft } from "../_components/AuthPanelLeft";
import { MapPinOff } from "lucide-react";

export const metadata: Metadata = {
  title: "Clinic not found — Clinicforce",
  description:
    "This clinic workspace is not available on Clinicforce. Contact your administrator for access.",
};

export default function ClinicNotFoundPage() {
  const year = new Date().getFullYear();

  return (
    <div
      className="flex min-h-screen overflow-hidden"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      <AuthPanelLeft />

      <div
        className="w-full lg:w-1/2 flex flex-col min-h-screen p-8 sm:p-12 lg:p-14"
        style={{ background: "var(--color-surface)" }}
      >
        <div className="flex items-center gap-3 shrink-0 lg:hidden">
          <div
            className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0"
            style={{ background: "var(--color-ink)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- static mark from public/ */}
            <img
              src="/clinicforce-mark.png"
              alt="Clinicforce"
              className="size-9 object-contain"
            />
          </div>
          <span
            className="text-2xl font-bold tracking-tighter"
            style={{ color: "var(--color-text-primary)" }}
          >
            Clinicforce
          </span>
        </div>

        <div className="flex-1 flex flex-col justify-center min-h-0 py-8 lg:py-12 lg:px-10">
          <div className="w-full max-w-md mx-auto">

            <MapPinOff
              className="size-10 mb-8"
              style={{ color: "var(--color-text-muted)" }}
            />

            <div className="mb-12">
              <h2
                className="text-[1.875rem] font-extrabold tracking-tight mb-5 leading-tight"
                style={{ color: "var(--color-text-primary)" }}
              >
                This clinic isn&apos;t on Clinicforce yet.
              </h2>
              <div className="space-y-4">
                <p
                  className="text-sm font-medium leading-relaxed"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  If you&apos;re trying to access your clinic, double-check the URL or contact your administrator for the correct address.
                </p>
                <p
                  className="text-sm font-medium leading-relaxed"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  If you&apos;re looking to bring Clinicforce to your practice, we&apos;d love to help you get started.
                </p>
              </div>

              <div className="mt-8">
                {/* TODO: point to marketing landing page once one exists */}
                <a
                  href={process.env.NEXT_PUBLIC_APP_URL ?? "https://clinicforce.app"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 px-6 items-center justify-center text-xs font-bold rounded-[10px] transition-colors hover:opacity-80"
                  style={{
                    color: "var(--color-text-primary)",
                    border: "1px solid var(--color-border)",
                    background: "transparent",
                  }}
                >
                  Learn more about Clinicforce
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="fixed bottom-0 right-0 w-full lg:w-1/2 p-8 flex justify-between items-center pointer-events-none">
        <div
          className="text-[10px] uppercase tracking-[0.2em] font-bold"
          style={{ color: "var(--color-text-muted)" }}
        >
          © {year} Clinicforce
        </div>
        <div className="flex gap-6 pointer-events-auto">
          <a
            href="#"
            className="text-[10px] uppercase tracking-[0.2em] font-bold transition-colors hover:opacity-70"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Privacy
          </a>
          <a
            href="#"
            className="text-[10px] uppercase tracking-[0.2em] font-bold transition-colors hover:opacity-70"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Terms
          </a>
        </div>
      </footer>
    </div>
  );
}
