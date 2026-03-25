"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Activity, ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { signIn } from "@/lib/auth/client";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().default(false),
});

type LoginFormValues = z.infer<typeof loginSchema>;

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

function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") ?? "/home/dashboard";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      await signIn.email({
        email: data.email,
        password: data.password,
        callbackURL: returnUrl,
        fetchOptions: {
          onError: (ctx) => {
            toast.error(
              ctx.error.message ?? "Invalid credentials. Please try again."
            );
            setIsLoading(false);
          },
        },
      });
    } catch {
      toast.error("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Email */}
      <div>
        <label
          htmlFor="email"
          className="block text-[11px] uppercase tracking-widest font-bold mb-2 px-1"
          style={{ color: "var(--color-text-muted)" }}
        >
          Email Address
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="name@clinic.com"
          {...register("email")}
          className="w-full h-12 px-4 rounded-[10px] outline-none transition-all duration-200 placeholder:opacity-40 focus:ring-2"
          style={{
            background: "var(--color-surface-alt)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text-primary)",
          }}
        />
        {errors.email && (
          <p
            className="mt-1 text-xs px-1"
            style={{ color: "var(--color-red)" }}
          >
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Password */}
      <div>
        <div className="flex justify-between items-center mb-2 px-1">
          <label
            htmlFor="password"
            className="block text-[11px] uppercase tracking-widest font-bold"
            style={{ color: "var(--color-text-muted)" }}
          >
            Password
          </label>
          <a
            href="#"
            className="text-[11px] uppercase tracking-widest font-bold transition-colors hover:opacity-70"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Forgot?
          </a>
        </div>
        <div className="relative">
          <input
            id="password"
            autoComplete="current-password"
            placeholder="••••••••"
            {...register("password")}
            type={showPassword ? "text" : "password"}
            className="w-full h-12 pl-4 pr-12 rounded-[10px] outline-none transition-all duration-200 placeholder:opacity-40 focus:ring-2"
            style={{
              background: "var(--color-surface-alt)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-primary)",
            }}
          />
          <button
            type="button"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[var(--color-green)]"
            style={{ color: "var(--color-text-muted)" }}
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((v) => !v)}
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" aria-hidden />
            ) : (
              <Eye className="w-4 h-4" aria-hidden />
            )}
          </button>
        </div>
        {errors.password && (
          <p
            className="mt-1 text-xs px-1"
            style={{ color: "var(--color-red)" }}
          >
            {errors.password.message}
          </p>
        )}
      </div>

      {/* Remember me */}
      <div className="flex items-center">
        <input
          id="remember-me"
          type="checkbox"
          {...register("rememberMe")}
          className="h-4 w-4 rounded"
          style={{ accentColor: "var(--color-ink)" }}
        />
        <label
          htmlFor="remember-me"
          className="ml-2 block text-xs font-medium"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Keep session active for 30 days
        </label>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full h-12 font-bold rounded-[10px] flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
        style={{
          background: "var(--color-ink)",
          color: "var(--color-ink-fg)",
        }}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Signing In…
          </>
        ) : (
          <>
            Sign In
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
}

export default function LoginPage() {
  const year = new Date().getFullYear();

  return (
    <div
      className="flex min-h-screen overflow-hidden"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      {/* ── Left Panel: Brand ──────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-1/2 relative flex-col min-h-0 p-14 overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, var(--color-surface) 0%, var(--color-surface-alt) 100%)",
        }}
      >
        {/* Subtle grain overlay using SVG turbulence */}
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

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3 shrink-0">
          <div
            className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0"
            style={{ background: "var(--color-ink)" }}
          >
            <Activity className="w-5 h-5" style={{ color: "var(--color-ink-fg)" }} />
          </div>
          <span
            className="text-2xl font-bold tracking-tighter"
            style={{ color: "var(--color-text-primary)" }}
          >
            Clinicforce
          </span>
        </div>

        {/* Hero + testimonial — vertically centered band */}
        <div className="relative z-10 flex-1 flex flex-col justify-center py-12 min-h-0">
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

        {/* Bottom meta */}
        <div className="relative z-10 flex gap-10 shrink-0 pt-4">
          <div className="flex flex-col">
            <span
              className="text-[11px] uppercase tracking-widest font-bold mb-1"
              style={{ color: "var(--color-text-muted)" }}
            >
              Version
            </span>
            <span
              className="text-xs"
              style={{ color: "var(--color-text-secondary)" }}
            >
              v1.0.0 MVP
            </span>
          </div>
          <div className="flex flex-col">
            <span
              className="text-[11px] uppercase tracking-widest font-bold mb-1"
              style={{ color: "var(--color-text-muted)" }}
            >
              Security
            </span>
            <span
              className="text-xs"
              style={{ color: "var(--color-text-secondary)" }}
            >
              AES-256 Encrypted
            </span>
          </div>
        </div>
      </div>

      {/* ── Right Panel: Form ──────────────────────────────────── */}
      <div
        className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:px-24 lg:py-28"
        style={{ background: "var(--color-surface)" }}
      >
        <div className="w-full max-w-md">
          {/* Mobile logo — hidden on desktop */}
          <div className="lg:hidden flex items-center gap-3 mb-14">
            <div
              className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0"
              style={{ background: "var(--color-ink)" }}
            >
              <Activity className="w-5 h-5" style={{ color: "var(--color-ink-fg)" }} />
            </div>
            <span
              className="text-2xl font-bold tracking-tighter"
              style={{ color: "var(--color-text-primary)" }}
            >
              Clinicforce
            </span>
          </div>

          {/* Heading */}
          <div className="mb-12">
            <h2
              className="text-[1.875rem] font-extrabold tracking-tight mb-3 leading-tight"
              style={{ color: "var(--color-text-primary)" }}
            >
              Welcome back
            </h2>
            <p
              className="text-sm font-medium leading-relaxed"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Please enter your credentials to continue.
            </p>
          </div>

          {/* Form — wrapped in Suspense for useSearchParams */}
          <Suspense
            fallback={
              <div className="space-y-8">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="h-12 rounded-[10px] animate-pulse"
                    style={{ background: "var(--color-surface-alt)" }}
                  />
                ))}
              </div>
            }
          >
            <LoginForm />
          </Suspense>
        </div>
      </div>

      {/* ── Footer ────────────────────────────────────────────── */}
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
