"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart2,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  MoreVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { navPillSpring, sidebarLogoSwapSpring } from "./nav-motion";
import { signOut } from "@/lib/auth/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const SIDEBAR_VIEWS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "reports",   label: "Reports",   icon: BarChart2 },
];

function initialsFromDisplayName(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0][0];
    const b = parts[1][0];
    if (a && b) return `${a}${b}`.toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

function AccountMenu({ trigger }: { trigger: React.ReactNode }) {
  const router = useRouter();

  const handleLogout = () => {
    void signOut().then(() => {
      router.push("/login");
      router.refresh();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" sideOffset={6}>
        <DropdownMenuItem disabled>Settings</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={handleLogout}>
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface SideNavProps {
  /** Display name from session (layout) — full name or email fallback */
  userDisplayName: string;
  /** Label from `USER_TYPE_LABELS` (Administrator / Doctor / Staff) */
  userTypeLabel: string;
}

export function SideNav({ userDisplayName, userTypeLabel }: SideNavProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const pathname = usePathname();

  const entitySegment = pathname.split("/")[1] ?? "home";

  const initials = initialsFromDisplayName(userDisplayName);

  const kebabTrigger = (
    <button
      type="button"
      className="flex items-center justify-center size-8 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-black/5 transition-colors flex-shrink-0 mr-0.5"
      aria-label="Open account menu"
    >
      <MoreVertical size={18} strokeWidth={2} />
    </button>
  );

  const collapsedAvatarTrigger = (
    <button
      type="button"
      className="size-9 rounded-lg flex items-center justify-center text-sm font-bold text-[var(--color-text-primary)] flex-shrink-0 border border-white shadow-sm"
      style={{ background: "var(--color-surface-alt)" }}
      aria-label="Open account menu"
    >
      {initials}
    </button>
  );

  return (
    <aside
      className={cn(
        "h-full flex flex-col z-10 transition-all duration-200 flex-shrink-0",
        collapsed ? "w-20" : "w-60"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* ── Logo / Brand row ── */}
      <div className="pt-4 pb-2 px-3">
        <div
          className={cn(
            "flex items-center rounded-xl p-1 transition-all h-12",
            collapsed ? "justify-center" : "justify-between",
            "bg-white/40 border border-white/60 shadow-sm"
          )}
          style={{ backdropFilter: "blur(8px)" }}
        >
          {!collapsed && (
            <div className="flex items-center gap-2 pl-1.5">
              <div
                className="size-9 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0"
                style={{ background: "var(--color-ink)", color: "var(--color-ink-fg)" }}
              >
                <span className="text-sm font-bold tracking-tight">CF</span>
              </div>
              <span className="text-sm font-bold tracking-tight text-[var(--color-text-primary)] whitespace-nowrap">
                Clinicforce
              </span>
            </div>
          )}

          {collapsed ? (
            <div className="relative size-9 flex items-center justify-center">
              <AnimatePresence mode="wait">
                {isHovered ? (
                  <motion.button
                    key="expand-btn"
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    transition={sidebarLogoSwapSpring}
                    onClick={() => setCollapsed(false)}
                    className="absolute inset-0 rounded-lg flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-black/5 transition-colors"
                    title="Expand sidebar"
                  >
                    <PanelLeftOpen size={18} strokeWidth={2} />
                  </motion.button>
                ) : (
                  <motion.div
                    key="logo-badge"
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    transition={sidebarLogoSwapSpring}
                    className="size-9 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0"
                    style={{ background: "var(--color-ink)", color: "var(--color-ink-fg)" }}
                  >
                    <span className="text-sm font-bold tracking-tight">CF</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <button
              onClick={() => setCollapsed(true)}
              className="size-9 rounded-lg flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-black/5 transition-colors flex-shrink-0"
              title="Collapse sidebar"
            >
              <PanelLeftClose size={18} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      <nav className="flex-1 px-3 mt-3 space-y-1 overflow-hidden hover:overflow-y-auto">
        {SIDEBAR_VIEWS.map(({ key, label, icon: Icon }) => {
          const href = `/${entitySegment}/${key}`;
          const isActive = pathname === href || pathname.startsWith(`/${entitySegment}/${key}`);
          return (
            <Link
              key={key}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150",
                isActive
                  ? "text-[var(--color-text-primary)] font-semibold"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
                collapsed && "justify-center px-0"
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="side-nav-pill"
                  className="absolute inset-0 rounded-lg"
                  style={{
                    background: "rgba(255,255,255,0.80)",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 0 0 1px rgba(255,255,255,0.50)",
                  }}
                  transition={navPillSpring}
                />
              )}
              <Icon size={18} strokeWidth={2} className="relative z-10 flex-shrink-0" />
              {!collapsed && <span className="relative z-10 whitespace-nowrap">{label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 mt-auto mb-2">
        <div
          className={cn(
            "flex items-center gap-2.5 px-1.5 py-1 rounded-xl transition-colors h-12",
            "bg-white/40 border border-white/60 shadow-sm",
            collapsed ? "justify-center" : ""
          )}
          style={{ backdropFilter: "blur(8px)" }}
        >
          {collapsed ? (
            <AccountMenu trigger={collapsedAvatarTrigger} />
          ) : (
            <>
              <div
                className="size-9 rounded-lg flex items-center justify-center text-sm font-bold text-[var(--color-text-primary)] flex-shrink-0 border border-white shadow-sm"
                style={{ background: "var(--color-surface-alt)" }}
              >
                {initials}
              </div>
              <div className="overflow-hidden flex-1 pl-0.5 min-w-0">
                <p className="text-sm font-semibold truncate text-[var(--color-text-primary)] mb-0.5 leading-none">
                  {userDisplayName}
                </p>
                <p className="text-[10px] text-[var(--color-text-muted)] truncate leading-none">
                  {userTypeLabel}
                </p>
              </div>
              <AccountMenu trigger={kebabTrigger} />
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
