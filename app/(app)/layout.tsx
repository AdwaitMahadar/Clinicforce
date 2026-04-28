import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { getSession } from "@/lib/auth/session";
import { AppSessionProvider } from "@/lib/auth/session-context";
import { buildClinicLogoPublicUrl } from "@/lib/clinic/build-clinic-logo-url";
import { ClinicAppearanceProvider } from "@/lib/clinic/clinic-appearance-context";
import {
  SIDEBAR_COLLAPSED_COOKIE_NAME,
  parseSidebarCollapsedCookie,
} from "@/lib/constants/sidebar";
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

  const clinicLogoUrl = buildClinicLogoPublicUrl(
    session.user.clinicSubdomain,
    session.user.clinic.settings.logoUpdatedAt
  );

  const cookieStore = await cookies();
  const initialCollapsed = parseSidebarCollapsedCookie(
    cookieStore.get(SIDEBAR_COLLAPSED_COOKIE_NAME)?.value
  );

  const { primaryColor, secondaryColor } = session.user.clinic.settings;
  const { theme: initialTheme } = session.user.preferences;

  return (
    <ClinicAppearanceProvider
      initialTheme={initialTheme}
      initialPrimary={primaryColor}
      initialSecondary={secondaryColor}
    >
      <AppSessionProvider
        user={{
          type: session.user.type,
          firstName: session.user.firstName,
          lastName: session.user.lastName,
          email: session.user.email,
          clinicName: session.user.clinicName,
        }}
      >
        <AppShell
          modal={modal}
          userDisplayName={displayName}
          userTypeLabel={userTypeLabel}
          avatarSeed={session.user.id}
          initialCollapsed={initialCollapsed}
          clinicName={session.user.clinicName}
          clinicLogoUrl={clinicLogoUrl}
        >
          <NuqsAdapter>{children}</NuqsAdapter>
        </AppShell>
      </AppSessionProvider>
    </ClinicAppearanceProvider>
  );
}
