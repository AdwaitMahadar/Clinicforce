"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  collapsed?: boolean;
}

export function NavItem({ href, icon, label, collapsed }: NavItemProps) {
  const pathname = usePathname();
  // Match first segment: /patients/dashboard → "patients"
  const segment = href.split("/")[1];
  const isActive = pathname.startsWith(`/${segment}`);

  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
        isActive
          ? "bg-white/80 text-[var(--color-text-primary)] shadow-sm border border-white/60 font-semibold"
          : "text-[var(--color-text-secondary)] hover:bg-black/[0.03] hover:text-[var(--color-text-primary)]",
        collapsed && "justify-center px-0"
      )}
    >
      <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
        {icon}
      </span>
      {!collapsed && <span className="whitespace-nowrap">{label}</span>}
    </Link>
  );
}
