import { TopNav } from "./TopNav";
import { SideNav } from "./SideNav";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Left sidebar */}
      <SideNav />

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
    </div>
  );
}
