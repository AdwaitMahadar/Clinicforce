import { AppShell } from "@/components/layout/AppShell";
import { NuqsAdapter } from "nuqs/adapters/next/app";

interface AppLayoutProps {
  children: React.ReactNode;
  /**
   * The @modal parallel route slot.
   * Renders the intercepting modal when active; default.tsx returns null otherwise.
   */
  modal: React.ReactNode;
}

export default function AppLayout({ children, modal }: AppLayoutProps) {
  return (
    <AppShell modal={modal}>
      <NuqsAdapter>{children}</NuqsAdapter>
    </AppShell>
  );
}
