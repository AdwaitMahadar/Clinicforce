import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In — Clinicforce",
  description: "Sign in to your Clinicforce clinic management portal.",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
