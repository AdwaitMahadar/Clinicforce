import { TopNav } from "./TopNav";
import { SideNav } from "./SideNav";

interface AppShellProps {
  children: React.ReactNode;
  /** Rendered at the root of the shell — outside all overflow containers. Used for intercepting-route modals. */
  modal?: React.ReactNode;
  /** From `getSession()` in `app/(app)/layout.tsx` — shown in the sidebar user block. */
  userDisplayName: string;
  userTypeLabel: string;
  /** `session.user.id` — deterministic DiceBear avatar seed in `SideNav`. */
  avatarSeed: string;
  /** From `sidebar-collapsed` cookie in `(app)/layout.tsx` — first paint matches persisted width. */
  initialCollapsed: boolean;
  /** Clinic display name from `getSession()` — sidebar header. */
  clinicName: string;
  /** Public object URL for `{subdomain}/assets/logo/logo.png` — sidebar header. */
  clinicLogoUrl: string;
}

export function AppShell({
  children,
  modal,
  userDisplayName,
  userTypeLabel,
  avatarSeed,
  initialCollapsed,
  clinicName,
  clinicLogoUrl,
}: AppShellProps) {
  return (
    <div className="flex h-screen w-full overflow-hidden relative">
      {/* Left sidebar */}
      <SideNav
        userDisplayName={userDisplayName}
        userTypeLabel={userTypeLabel}
        avatarSeed={avatarSeed}
        initialCollapsed={initialCollapsed}
        clinicName={clinicName}
        clinicLogoUrl={clinicLogoUrl}
      />

      {/* Right — top nav + floating main card */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top navigation island */}
        <TopNav />

        {/* Floating main content card */}
        <div className="flex-1 overflow-hidden mx-4 mb-4">
          <div className="main-card h-full overflow-y-auto">
            {children}
          </div>
        </div>
      </div>

      {/* Modal portal — outside all overflow/scroll containers so position:fixed works correctly */}
      {modal}
    </div>
  );
}
