"use client";

import { useEffect, useState } from "react";

const TESTIMONIALS = [
  {
    quote:
      "Clinicforce has transformed how we manage our daily operations. It feels less like software and more like a precision instrument.",
    name: "Dr. Helena Vance",
    role: "Chief Medical Director",
    initials: "HV",
  },
  {
    quote:
      "Our front desk finally has one place for charts, documents, and scheduling. Onboarding new staff used to take weeks—now it takes days.",
    name: "Marcus Chen",
    role: "Practice Administrator",
    initials: "MC",
  },
  {
    quote:
      "I see my day at a glance and spend less time hunting for information between rooms. That clarity is worth every minute we saved.",
    name: "Dr. Priya Nair",
    role: "Family Physician",
    initials: "PN",
  },
  {
    quote:
      "We needed something serious about privacy without feeling clinical and cold. Clinicforce nails that balance for our team and our patients' data.",
    name: "Elena Ruiz",
    role: "Clinic Operations Lead",
    initials: "ER",
  },
] as const;

function TestimonialCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % TESTIMONIALS.length);
    }, 4500);
    return () => clearInterval(id);
  }, []);

  const current = TESTIMONIALS[index];

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Customer testimonials"
      aria-live="polite"
      className="p-6 rounded-[10px] inline-flex flex-col gap-4 max-w-md w-full"
      style={{
        background: "var(--color-glass-fill-card)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid var(--color-glass-border)",
      }}
    >
      <div className="flex gap-2 items-center" role="tablist" aria-label="Choose testimonial">
        {TESTIMONIALS.map((_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`Testimonial ${i + 1} of ${TESTIMONIALS.length}`}
            className="w-2 h-2 rounded-full transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-green)]"
            style={{
              background:
                i === index ? "var(--color-green)" : "var(--color-border)",
            }}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
      <p
        className="text-sm font-medium italic leading-relaxed"
        style={{ color: "var(--color-text-secondary)" }}
      >
        &ldquo;{current.quote}&rdquo;
      </p>
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
          style={{
            background: "var(--color-surface-alt)",
            color: "var(--color-text-primary)",
            border: "1px solid var(--color-border)",
          }}
        >
          {current.initials}
        </div>
        <div>
          <p
            className="text-xs font-bold"
            style={{ color: "var(--color-text-primary)" }}
          >
            {current.name}
          </p>
          <p
            className="text-[10px] uppercase tracking-widest"
            style={{ color: "var(--color-text-muted)" }}
          >
            {current.role}
          </p>
        </div>
      </div>
    </div>
  );
}

export function AuthPanelLeft() {
  return (
    <div
      className="hidden lg:flex lg:w-1/2 relative flex-col min-h-0 p-14 overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, var(--color-surface) 0%, var(--color-surface-alt) 100%)",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ opacity: 0.035 }}
        aria-hidden="true"
      >
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <filter id="grain">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.75"
              numOctaves="4"
              stitchTiles="stitch"
            />
          </filter>
          <rect width="100%" height="100%" filter="url(#grain)" />
        </svg>
      </div>

      <div className="relative z-10 flex items-center gap-3 shrink-0">
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

      <div className="relative z-10 flex-1 flex flex-col justify-center py-12 min-h-0 pl-16">
        <div className="max-w-lg w-full space-y-10">
          <div>
            <h1
              className="text-5xl font-black tracking-tight leading-[1.08] mb-6"
              style={{
                fontFamily: "var(--font-serif)",
                color: "var(--color-text-primary)",
              }}
            >
              Clinic management,{" "}
              <span
                className="italic font-extrabold"
                style={{ color: "var(--color-text-secondary)" }}
              >
                precisely
              </span>{" "}
              crafted.
            </h1>
            <p
              className="text-lg leading-relaxed font-medium"
              style={{ color: "var(--color-text-secondary)" }}
            >
              The complete management system for modern healthcare practices.
            </p>
          </div>

          <TestimonialCarousel />
        </div>
      </div>
    </div>
  );
}
