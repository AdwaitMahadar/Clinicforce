"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  CalendarDays,
  Users,
  Pill,
  BarChart2,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  MoreVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TOP_NAV_ITEMS = [
  { href: "/home/dashboard",         label: "Home",         icon: Home },
  { href: "/appointments/dashboard", label: "Appointments", icon: CalendarDays },
  { href: "/patients/dashboard",     label: "Patients",     icon: Users },
  { href: "/medicines/dashboard",    label: "Medicines",    icon: Pill },
];

const SIDEBAR_VIEWS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "reports",   label: "Reports",   icon: BarChart2 },
];

interface SideNavProps {
  /** User info from session — passed from server component */
  userName?: string;
  userRole?: string;
}

export function SideNav({ userName = "Dr. Jenkins", userRole = "Surgeon" }: SideNavProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  // Current entity segment: /patients/dashboard → "patients"
  const entitySegment = pathname.split("/")[1] ?? "home";

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside
      className={cn(
        "h-full flex flex-col z-10 transition-all duration-300 flex-shrink-0",
        collapsed ? "w-20" : "w-60"
      )}
    >
      {/* ── Logo / Brand row ── */}
      <div className="pt-5 pb-2 px-3">
        <div
          className={cn(
            "flex items-center rounded-xl p-1.5 transition-all",
            collapsed ? "justify-center" : "justify-between",
            "bg-white/40 border border-white/60 shadow-sm"
          )}
          style={{ backdropFilter: "blur(8px)" }}
        >
          {!collapsed && (
            <div className="flex items-center gap-2 pl-1">
              <div
                className="size-7 rounded-md flex items-center justify-center shadow-sm flex-shrink-0"
                style={{ background: "var(--color-ink)", color: "var(--color-ink-fg)" }}
              >
                <span className="text-xs font-bold">CF</span>
              </div>
              <span className="text-sm font-bold tracking-tight text-[var(--color-text-primary)] whitespace-nowrap">
                Clinicforce
              </span>
            </div>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="size-8 rounded-lg flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-black/5 transition-colors flex-shrink-0"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen size={17} strokeWidth={2} />
            ) : (
              <PanelLeftClose size={17} strokeWidth={2} />
            )}
          </button>
        </div>
      </div>

      {/* ── Nav links ── */}
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
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-white/80 text-[var(--color-text-primary)] shadow-sm border border-white/50 font-semibold"
                  : "text-[var(--color-text-secondary)] hover:bg-black/[0.03] hover:text-[var(--color-text-primary)]",
                collapsed && "justify-center px-0"
              )}
            >
              <Icon size={18} strokeWidth={2} className="flex-shrink-0" />
              {!collapsed && <span className="whitespace-nowrap">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* ── User profile ── */}
      <div className="p-3 mt-auto">
        <div
          className={cn(
            "flex items-center gap-3 px-2 py-2 rounded-xl cursor-pointer transition-colors",
            "bg-white/40 border border-white/60 shadow-sm hover:bg-white/60",
            collapsed && "justify-center"
          )}
          style={{ backdropFilter: "blur(8px)" }}
        >
          {/* Avatar */}
          <div
            className="size-9 rounded-lg flex items-center justify-center text-xs font-bold text-[var(--color-text-primary)] flex-shrink-0 border border-white shadow-sm"
            style={{ background: "var(--color-surface-alt)" }}
          >
            {initials}
          </div>

          {!collapsed && (
            <>
              <div className="overflow-hidden flex-1">
                <p className="text-sm font-semibold truncate text-[var(--color-text-primary)] max-w-[110px]">
                  {userName}
                </p>
                <p className="text-[10px] text-[var(--color-text-muted)] truncate">
                  {userRole}
                </p>
              </div>
              <button className="ml-auto text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] flex-shrink-0">
                <MoreVertical size={14} />
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
