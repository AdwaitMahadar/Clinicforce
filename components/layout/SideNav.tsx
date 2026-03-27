"use client";

import { useCallback, useEffect, useState } from "react";
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
import {
  SIDEBAR_COLLAPSED_COOKIE_NAME,
  SIDEBAR_COLLAPSED_MAX_AGE_SECONDS,
} from "@/lib/constants/sidebar";
import { InitialsBadge } from "@/components/common/InitialsBadge";
import { Skeleton } from "@/components/ui/skeleton";

const SIDEBAR_VIEWS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "reports",   label: "Reports",   icon: BarChart2 },
];

/** Allowed `face` values for DiceBear open-peeps — excludes aggressive or unprofessional expressions. */
const DICEBEAR_OPEN_PEEPS_FACE_ALLOWLIST =
  "calm,smile,smileBig,serious,driven,cute,solemn,awe,cheeky,concerned,contempt,eatingHappy,explaining,eyesClosed,lovingGrin1,lovingGrin2,smileLOL,smileTeethGap,suspicious,tired,blank";

function dicebearAvataaarsUrl(seed: string): string {
  return `https://api.dicebear.com/7.x/open-peeps/svg?seed=${encodeURIComponent(seed)}&skinColor=FFDBB4,EDB98A,D08B5B,AE5D29&backgroundColor=B6E3F4,C0AEDE,D1D4F9,FFD5DC,FFDFBF,B5EAD7,F8C8D4,C7E8CA&face=${DICEBEAR_OPEN_PEEPS_FACE_ALLOWLIST}`;
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
  /** `session.user.id` — stable seed for the sidebar DiceBear avatar */
  avatarSeed: string;
  /** From `sidebar-collapsed` cookie via `(app)/layout` — avoids width flash on refresh */
  initialCollapsed: boolean;
  /** From `getSession()` — clinic header label */
  clinicName: string;
  /** Public URL for `{subdomain}/assets/logo/logo.png` */
  clinicLogoUrl: string;
}

type ClinicLogoState = "loading" | "ready" | "failed";

/**
 * Loading: `Skeleton` in a `size-9 rounded-lg` slot; `<img>` is mounted with `opacity-0` so the
 * browser fetches immediately (not `display:none`). Ready: logo only. Failed: `InitialsBadge` only
 * (image unmounted — no broken icon).
 *
 * Cached images may decode before `onLoad` is attached; the img ref checks `complete` +
 * `naturalWidth` on mount to transition to ready immediately.
 */
function ClinicBrandMark({
  clinicName,
  clinicLogoUrl,
}: {
  clinicName: string;
  clinicLogoUrl: string;
}) {
  const [state, setState] = useState<ClinicLogoState>("loading");

  useEffect(() => {
    setState("loading");
  }, [clinicLogoUrl]);

  const clinicLogoImgRef = useCallback((img: HTMLImageElement | null) => {
    if (!img) return;
    if (img.complete && img.naturalWidth > 0) {
      setState((s) => (s === "loading" ? "ready" : s));
    }
  }, []);

  return (
    <div
      className="relative size-9 shrink-0 overflow-hidden rounded-lg"
      aria-busy={state === "loading"}
    >
      {state === "loading" && (
        <Skeleton
          className="pointer-events-none absolute inset-0 z-[2] size-full rounded-lg"
          aria-hidden
        />
      )}
      {state !== "failed" && (
        // eslint-disable-next-line @next/next/no-img-element -- external tenant logo URL
        <img
          ref={clinicLogoImgRef}
          key={clinicLogoUrl}
          src={clinicLogoUrl}
          alt=""
          loading="eager"
          decoding="async"
          className={cn(
            "absolute inset-0 size-9 rounded-lg object-contain",
            state === "loading" && "z-0 opacity-0",
            state === "ready" && "z-[1] opacity-100"
          )}
          onLoad={() => setState("ready")}
          onError={() => setState("failed")}
        />
      )}
      {state === "failed" && (
        <InitialsBadge
          name={clinicName}
          size="md"
          className="absolute inset-0 z-[1] size-9 shrink-0 rounded-lg"
        />
      )}
    </div>
  );
}

function writeSidebarCollapsedCookie(collapsed: boolean) {
  const v = collapsed ? "1" : "0";
  document.cookie = `${SIDEBAR_COLLAPSED_COOKIE_NAME}=${v}; Path=/; Max-Age=${SIDEBAR_COLLAPSED_MAX_AGE_SECONDS}; SameSite=Lax`;
}

export function SideNav({
  userDisplayName,
  userTypeLabel,
  avatarSeed,
  initialCollapsed,
  clinicName,
  clinicLogoUrl,
}: SideNavProps) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [isHovered, setIsHovered] = useState(false);
  const pathname = usePathname();

  const setCollapsedPersisted = useCallback((next: boolean) => {
    setCollapsed(next);
    writeSidebarCollapsedCookie(next);
  }, []);

  const entitySegment = pathname.split("/")[1] ?? "home";

  const avatarUrl = dicebearAvataaarsUrl(avatarSeed);

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
      className="size-9 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 border border-white shadow-sm p-0"
      aria-label="Open account menu"
    >
      <img src={avatarUrl} alt="" className="size-full object-cover" />
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
            <div className="flex items-center gap-2 pl-1.5 min-w-0">
              <ClinicBrandMark
                key={clinicLogoUrl}
                clinicName={clinicName}
                clinicLogoUrl={clinicLogoUrl}
              />
              <span className="text-sm font-bold tracking-tight text-[var(--color-text-primary)] whitespace-nowrap truncate">
                {clinicName}
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
                    onClick={() => setCollapsedPersisted(false)}
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
                    className="size-9 rounded-lg shadow-sm flex-shrink-0 overflow-hidden flex items-center justify-center"
                  >
                    <ClinicBrandMark
                      key={clinicLogoUrl}
                      clinicName={clinicName}
                      clinicLogoUrl={clinicLogoUrl}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <button
              onClick={() => setCollapsedPersisted(true)}
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
              <div className="size-9 rounded-lg overflow-hidden flex-shrink-0 border border-white shadow-sm flex items-center justify-center">
                <img src={avatarUrl} alt="" className="size-full object-cover" />
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
