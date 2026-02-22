"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  CalendarDays,
  Users,
  Pill,
  Search,
  Bell,
  HelpCircle,
  LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const NAV_ITEMS = [
  { href: "/home/dashboard",         label: "Home",         icon: Home },
  { href: "/appointments/dashboard", label: "Appointments", icon: CalendarDays },
  { href: "/patients/dashboard",     label: "Patients",     icon: Users },
  { href: "/medicines/dashboard",    label: "Medicines",    icon: Pill },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <div className="w-full flex justify-between items-center py-4 px-4 z-30 relative flex-shrink-0">
      {/* Left placeholder — keeps island centered */}
      <div className="w-10 flex-shrink-0" />

      {/* ── Centered nav island ── */}
      <header className="flex-1 flex justify-center">
        <div
          className="flex items-center gap-1 px-1.5 py-1 rounded-xl"
          style={{
            background:           "var(--color-glass-fill)",
            backdropFilter:       "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border:               "1px solid var(--color-glass-border)",
            boxShadow:            "var(--shadow-nav)",
            height:               "44px",
          }}
        >
          {/* Nav links */}
          <div className="flex items-center gap-0.5 pr-1 mr-1 border-r border-[var(--color-border)]">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const segment = href.split("/")[1];
              const isActive = pathname.startsWith(`/${segment}`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150",
                    isActive
                      ? "text-[var(--color-text-primary)] font-semibold"
                      : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  )}
                >
                  {/* Sliding pill background — shared layoutId makes it animate between items */}
                  {isActive && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-lg"
                      style={{
                        background: "white",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.10), 0 0 0 1px var(--color-border)",
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 35,
                        mass: 0.6,
                      }}
                    />
                  )}

                  {/* Icon — always visible, sits above pill */}
                  <span className="relative z-10">
                    <Icon size={15} strokeWidth={2} />
                  </span>

                  {/* Label — only rendered when active, animates in */}
                  <AnimatePresence mode="wait">
                    {isActive && (
                      <motion.span
                        key={href}
                        className="relative z-10 overflow-hidden whitespace-nowrap"
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: "auto", opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{
                          width:   { type: "spring", stiffness: 500, damping: 35, mass: 0.6 },
                          opacity: { duration: 0.15, delay: 0.05 },
                        }}
                      >
                        {label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative flex items-center">
            <Search
              size={14}
              className="absolute left-2.5 text-[var(--color-text-muted)] pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search..."
              className="w-44 bg-[var(--color-surface-alt)]/60 border border-[var(--color-border)] rounded-lg py-1 pl-7 pr-3 text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:bg-white focus:border-[var(--color-text-muted)] transition-all h-8"
            />
          </div>
        </div>
      </header>

      {/* ── Right actions ── */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          className="size-9 rounded-lg flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors relative"
          style={{
            background:     "var(--color-glass-fill-sm)",
            border:         "1px solid var(--color-glass-border-sm)",
            backdropFilter: "blur(8px)",
          }}
          title="Notifications"
        >
          <Bell size={16} strokeWidth={2} />
          <span className="absolute top-2 right-2 size-1.5 bg-red-500 rounded-full ring-1 ring-white" />
        </button>

        <button
          className="size-9 rounded-lg flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          style={{
            background:     "var(--color-glass-fill-sm)",
            border:         "1px solid var(--color-glass-border-sm)",
            backdropFilter: "blur(8px)",
          }}
          title="Help"
        >
          <HelpCircle size={16} strokeWidth={2} />
        </button>

        <div className="h-5 w-px bg-[var(--color-border)]" />

        <div
          className="size-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--color-ink)", color: "var(--color-ink-fg)" }}
          title="App menu"
        >
          <LayoutGrid size={16} strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}
