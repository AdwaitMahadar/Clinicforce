import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { getSession } from "@/lib/auth/session";
import { USER_TYPE_LABELS } from "@/lib/constants/user";
import { NuqsAdapter } from "nuqs/adapters/next/app";

interface AppLayoutProps {
  children: React.ReactNode;
  /**
   * The @modal parallel route slot.
   * Renders the intercepting modal when active; default.tsx returns null otherwise.
   */
  modal: React.ReactNode;
}

export default async function AppLayout({ children, modal }: AppLayoutProps) {
  let session: Awaited<ReturnType<typeof getSession>>;
  try {
    session = await getSession();
  } catch {
    redirect("/login");
  }

  const displayName =
    [session.user.firstName, session.user.lastName]
      .map((s) => s?.trim())
      .filter(Boolean)
      .join(" ") || session.user.email;

  const userTypeLabel = USER_TYPE_LABELS[session.user.type];

  return (
    <AppShell modal={modal} userDisplayName={displayName} userTypeLabel={userTypeLabel}>
      <NuqsAdapter>{children}</NuqsAdapter>
    </AppShell>
  );
}
