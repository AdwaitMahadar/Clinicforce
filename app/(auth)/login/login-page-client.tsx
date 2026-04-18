"use client";

import { Suspense, useState } from "react";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { signIn } from "@/lib/auth/client";
import { loginSchema, type LoginFormValues } from "@/lib/validators/auth";
import { ClinicBrandMark } from "@/components/common/ClinicBrandMark";
import { AuthPanelLeft } from "../_components/AuthPanelLeft";
export type LoginClinicBrand = {
  name: string;
  logoUrl: string;
};



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
      const result = await signIn.email({
        email: data.email,
        password: data.password,
        callbackURL: returnUrl,
      });

      if (result.error) {
        const status = (result.error as { status?: number }).status;
        const serverOrOrigin =
          status == null || status >= 500 || status === 403;
        toast.error(
          serverOrOrigin
            ? "Something went wrong. Please try again."
            : "Invalid credentials. Please try again.",
        );
        setIsLoading(false);
        return;
      }

      const payload = result.data as { user?: unknown } | null | undefined;
      const signedIn =
        payload?.user != null && typeof payload.user === "object";
      if (!signedIn) {
        toast.error("Invalid credentials. Please try again.");
        setIsLoading(false);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
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

export interface LoginPageClientProps {
  clinicBrand: LoginClinicBrand | null;
}

export function LoginPageClient({ clinicBrand }: LoginPageClientProps) {
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
        {clinicBrand ? (
          <div className="relative z-10 hidden lg:flex items-center gap-3 shrink-0 min-h-0">
            <ClinicBrandMark
              clinicName={clinicBrand.name}
              clinicLogoUrl={clinicBrand.logoUrl}
              className="w-10 h-10 rounded-[10px]"
            />
            <span
              className="text-2xl font-bold tracking-tighter truncate min-w-0"
              style={{ color: "var(--color-text-primary)" }}
            >
              {clinicBrand.name}
            </span>
          </div>
        ) : null}

        <div className="flex-1 flex flex-col justify-center min-h-0 py-8 lg:py-12 lg:px-10">
          <div className="w-full max-w-md mx-auto">
            <div
              className={cn(
                "lg:hidden flex items-center gap-3",
                clinicBrand ? "mb-8" : "mb-14"
              )}
            >
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

            {clinicBrand ? (
              <div className="lg:hidden flex items-center gap-3 mb-12">
                <ClinicBrandMark
                  clinicName={clinicBrand.name}
                  clinicLogoUrl={clinicBrand.logoUrl}
                  className="w-10 h-10 rounded-[10px]"
                />
                <span
                  className="text-xl font-bold tracking-tighter truncate min-w-0"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {clinicBrand.name}
                </span>
              </div>
            ) : null}

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
