"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await signIn.email({
      email,
      password,
      callbackURL: "/patients/dashboard",
    });

    if (error) {
      setError(error.message ?? "Invalid email or password.");
      setLoading(false);
      return;
    }

    router.push("/patients/dashboard");
  }

  return (
    <div className="w-full max-w-md">
      {/* Card */}
      <div
        style={{
          background: "var(--color-surface-0)",
          borderRadius: "1.25rem",
          boxShadow:
            "0 4px 6px -1px hsl(220 8% 10% / 0.08), 0 20px 60px -10px hsl(220 8% 10% / 0.12)",
          padding: "2.5rem",
          border: "1px solid var(--color-surface-200)",
        }}
      >
        {/* Logo / Brand */}
        <div style={{ marginBottom: "2rem", textAlign: "center" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "3rem",
              height: "3rem",
              borderRadius: "0.875rem",
              background:
                "linear-gradient(135deg, var(--color-brand-500), var(--color-brand-700))",
              marginBottom: "1rem",
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z" />
              <path d="M12 8v8" />
              <path d="M8 12h8" />
            </svg>
          </div>
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "1.75rem",
              fontWeight: 400,
              color: "var(--color-surface-900)",
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            Clinicforce
          </h1>
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--color-surface-500)",
              marginTop: "0.375rem",
            }}
          >
            Sign in to your clinic portal
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Error banner */}
          {error && (
            <div
              role="alert"
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "0.625rem",
                background: "hsl(0 84% 60% / 0.08)",
                border: "1px solid hsl(0 84% 60% / 0.2)",
                color: "var(--color-error)",
                fontSize: "0.875rem",
              }}
            >
              {error}
            </div>
          )}

          {/* Email */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <label
              htmlFor="email"
              style={{
                fontSize: "0.8125rem",
                fontWeight: 500,
                color: "var(--color-surface-700)",
              }}
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="doctor@clinic.com"
              style={{
                padding: "0.625rem 0.875rem",
                borderRadius: "0.625rem",
                border: "1.5px solid var(--color-surface-200)",
                background: "var(--color-surface-50)",
                fontSize: "0.9375rem",
                color: "var(--color-surface-900)",
                outline: "none",
                transition: "border-color 0.15s ease",
              }}
              onFocus={(e) =>
                (e.currentTarget.style.borderColor = "var(--color-brand-500)")
              }
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = "var(--color-surface-200)")
              }
            />
          </div>

          {/* Password */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <label
              htmlFor="password"
              style={{
                fontSize: "0.8125rem",
                fontWeight: 500,
                color: "var(--color-surface-700)",
              }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                padding: "0.625rem 0.875rem",
                borderRadius: "0.625rem",
                border: "1.5px solid var(--color-surface-200)",
                background: "var(--color-surface-50)",
                fontSize: "0.9375rem",
                color: "var(--color-surface-900)",
                outline: "none",
                transition: "border-color 0.15s ease",
              }}
              onFocus={(e) =>
                (e.currentTarget.style.borderColor = "var(--color-brand-500)")
              }
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = "var(--color-surface-200)")
              }
            />
          </div>

          {/* Submit */}
          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            style={{
              marginTop: "0.25rem",
              padding: "0.75rem",
              borderRadius: "0.625rem",
              border: "none",
              background: loading
                ? "var(--color-brand-300)"
                : "linear-gradient(135deg, var(--color-brand-500), var(--color-brand-700))",
              color: "white",
              fontSize: "0.9375rem",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "opacity 0.15s ease, transform 0.1s ease",
              letterSpacing: "0.01em",
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.opacity = "0.9";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {/* Footer note */}
        <p
          style={{
            marginTop: "1.5rem",
            textAlign: "center",
            fontSize: "0.8125rem",
            color: "var(--color-surface-400)",
          }}
        >
          For staff access only · Contact your admin for credentials
        </p>
      </div>
    </div>
  );
}
