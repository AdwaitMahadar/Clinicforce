"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { HexColorPicker } from "react-colorful";
import { AlertDialog as AlertDialogPrimitive } from "radix-ui";
import { motion, LayoutGroup } from "framer-motion";
import {
  ImageIcon,
  Monitor,
  Moon,
  Pencil,
  Palette,
  Sun,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ClinicBrandMark } from "@/components/common/ClinicBrandMark";
import { useClinicAppearance } from "@/lib/clinic/clinic-appearance-context";
import { usePermission } from "@/lib/auth/session-context";
import { navPillSpring } from "@/components/layout/nav-motion";
import { cn } from "@/lib/utils";
import type { SettingsViewPayload } from "@/types/settings";
import type { UserPreferencesJson } from "@/types/clinic-settings";
import {
  confirmClinicLogoUpload,
  deleteClinicLogo,
  getClinicLogoUploadPresignedUrl,
  resetClinicColorsToDefault,
  setClinicThemeColorDefaults,
  updateClinicSettingsColors,
  updateUserTheme,
} from "@/lib/actions/settings";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
type ThemeChoice = UserPreferencesJson["theme"];

const THEME_SEGMENTS: {
  id: ThemeChoice;
  label: string;
  Icon: LucideIcon;
}[] = [
  { id: "light", label: "Light", Icon: Sun },
  { id: "dark", label: "Dark", Icon: Moon },
  { id: "system", label: "System", Icon: Monitor },
];

function SectionHeader({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Icon
        className="size-4 shrink-0"
        style={{ color: "var(--color-text-secondary)" }}
        aria-hidden
      />
      <h3
        className="text-sm font-semibold tracking-tight"
        style={{ color: "var(--color-text-primary)" }}
      >
        {title}
      </h3>
    </div>
  );
}

function ThemeSegmentedControl({
  value,
  disabled,
  onSelect,
}: {
  value: ThemeChoice;
  disabled?: boolean;
  onSelect: (v: ThemeChoice) => void;
}) {
  return (
    <LayoutGroup id="settings-theme-segments">
      <div
        className="flex h-12 w-full max-w-md items-center gap-1 rounded-xl px-1.5 py-1"
        style={{
          background: "var(--color-glass-fill)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid var(--color-glass-border)",
          boxShadow: "var(--shadow-nav)",
        }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-0.5">
          {THEME_SEGMENTS.map((seg) => {
            const active = value === seg.id;
            const SegIcon = seg.Icon;
            return (
              <button
                key={seg.id}
                type="button"
                disabled={disabled}
                onClick={() => onSelect(seg.id)}
                className={cn(
                  "relative flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors duration-150 sm:px-3",
                  active
                    ? "font-semibold text-[var(--color-text-primary)]"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                )}
              >
                {active && (
                  <motion.span
                    layoutId="settings-theme-pill"
                    className="absolute inset-0 rounded-lg"
                    style={{
                      background: "white",
                      boxShadow:
                        "0 1px 3px rgba(0,0,0,0.10), 0 0 0 1px var(--color-border)",
                    }}
                    transition={navPillSpring}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <SegIcon className="size-[18px] shrink-0" strokeWidth={2} aria-hidden />
                  <span className="hidden sm:inline">{seg.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </LayoutGroup>
  );
}

function normalizeHex6(hex: string): string {
  const t = hex.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(t)) return t.toUpperCase();
  return t;
}

function ClinicColorSwatchCard({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  const applyHex = useCallback(
    (raw: string) => {
      const n = normalizeHex6(raw);
      if (/^#[0-9A-Fa-f]{6}$/.test(n)) {
        onChange(n);
        setDraft(n);
      }
    },
    [onChange]
  );

  const safePickerColor = /^#[0-9A-Fa-f]{6}$/i.test(draft) ? draft : value;

  const cardInner = (
    <>
      <div
        className="mb-2 h-12 w-full rounded-lg border"
        style={{
          borderColor: "var(--color-border)",
          backgroundColor: value,
        }}
      />
      <div className="flex items-center justify-between gap-2">
        <span
          className="text-xs font-medium"
          style={{ color: "var(--color-text-primary)" }}
        >
          {label}
        </span>
        {!disabled && (
          <Pencil
            className="size-3.5 shrink-0"
            style={{ color: "var(--color-text-muted)" }}
            aria-hidden
          />
        )}
      </div>
      <p
        className="mt-1 font-mono text-[11px] tabular-nums tracking-tight"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {normalizeHex6(value)}
      </p>
    </>
  );

  if (disabled) {
    return (
      <div
        className="flex min-w-[140px] flex-1 flex-col rounded-xl border p-3"
        style={{
          borderColor: "var(--color-border)",
          background: "var(--color-surface)",
        }}
      >
        {cardInner}
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex min-w-[140px] flex-1 flex-col rounded-xl border p-3 text-left transition-[box-shadow] outline-none",
            "hover:shadow-sm focus-visible:ring-[3px] focus-visible:ring-ring/50"
          )}
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-surface)",
          }}
        >
          {cardInner}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto max-w-[min(100vw-2rem,280px)] p-3" align="start">
        <div className="flex flex-col gap-3">
          <HexColorPicker
            className="w-full max-w-[220px] [&_.react-colorful__saturation]:rounded-t-md [&_.react-colorful__hue]:h-3"
            color={safePickerColor}
            onChange={(c) => applyHex(c)}
          />
          <Input
            value={draft}
            onChange={(e) => {
              const v = e.target.value;
              setDraft(v);
              if (/^#[0-9A-Fa-f]{6}$/.test(v)) applyHex(v);
            }}
            onBlur={() => {
              if (/^#[0-9A-Fa-f]{6}$/.test(draft.trim())) applyHex(draft.trim());
              else setDraft(value);
            }}
            className="font-mono text-xs"
            style={{ color: "var(--color-text-primary)" }}
            aria-label={`${label} hex value`}
            spellCheck={false}
          />
          <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
            Adjust hue and saturation above, or enter #RRGGBB.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function SettingsGeneralTab({ payload }: { payload: SettingsViewPayload }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [logoPending, setLogoPending] = useState(false);
  const [themeBusy, setThemeBusy] = useState(false);
  const [removeLogoOpen, setRemoveLogoOpen] = useState(false);

  const canEditColors = usePermission("editClinicThemeColors");
  const canSetColorDefaults = usePermission("setClinicThemeDefaults");
  const canManageLogo = usePermission("manageClinicLogo");

  const {
    theme,
    setThemeClient,
    setClinicPrimaryPreview,
    setClinicSecondaryPreview,
    resetClinicColorPreview,
    syncClinicColorsFromServer,
  } = useClinicAppearance();

  const [primary, setPrimary] = useState(payload.settings.primaryColor);
  const [secondary, setSecondary] = useState(payload.settings.secondaryColor);

  useEffect(() => {
    setPrimary(payload.settings.primaryColor);
    setSecondary(payload.settings.secondaryColor);
  }, [payload.settings.primaryColor, payload.settings.secondaryColor]);

  const colorsDirty =
    canEditColors &&
    (primary !== payload.settings.primaryColor || secondary !== payload.settings.secondaryColor);

  const onPrimaryPick = useCallback(
    (hex: string) => {
      setPrimary(hex);
      setClinicPrimaryPreview(hex);
    },
    [setClinicPrimaryPreview]
  );

  const onSecondaryPick = useCallback(
    (hex: string) => {
      setSecondary(hex);
      setClinicSecondaryPreview(hex);
    },
    [setClinicSecondaryPreview]
  );

  const handleCancelColors = useCallback(() => {
    resetClinicColorPreview();
    setPrimary(payload.settings.primaryColor);
    setSecondary(payload.settings.secondaryColor);
  }, [
    payload.settings.primaryColor,
    payload.settings.secondaryColor,
    resetClinicColorPreview,
  ]);

  const handleSaveColors = useCallback(() => {
    startTransition(async () => {
      const r = await updateClinicSettingsColors({
        primaryColor: primary,
        secondaryColor: secondary,
      });
      if (!r.success) {
        toast.error(r.error ?? "Could not save colors.");
        return;
      }
      syncClinicColorsFromServer(
        r.data.settings.primaryColor,
        r.data.settings.secondaryColor
      );
      toast.success("Clinic colors saved.");
      router.refresh();
    });
  }, [primary, secondary, router, syncClinicColorsFromServer]);

  const handleResetToDefault = useCallback(() => {
    startTransition(async () => {
      const r = await resetClinicColorsToDefault();
      if (!r.success) {
        toast.error(r.error ?? "Could not reset colors.");
        return;
      }
      const { primaryColor, secondaryColor } = r.data.settings;
      syncClinicColorsFromServer(primaryColor, secondaryColor);
      setPrimary(primaryColor);
      setSecondary(secondaryColor);
      toast.success("Colors reset to the clinic default.");
      router.refresh();
    });
  }, [router, syncClinicColorsFromServer]);

  const handleSetAsDefault = useCallback(() => {
    startTransition(async () => {
      const r = await setClinicThemeColorDefaults();
      if (!r.success) {
        toast.error(r.error ?? "Could not update defaults.");
        return;
      }
      toast.success("Current colors saved as the new default.");
      router.refresh();
    });
  }, [router]);

  const pickTheme = useCallback(
    async (next: ThemeChoice) => {
      const prev = theme;
      setThemeClient(next);
      setThemeBusy(true);
      try {
        const r = await updateUserTheme({ theme: next });
        if (!r.success) {
          toast.error(r.error ?? "Could not save theme.");
          setThemeClient(prev);
          return;
        }
        toast.success("Theme preference updated.");
        router.refresh();
      } finally {
        setThemeBusy(false);
      }
    },
    [router, setThemeClient, theme]
  );

  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleLogoFile = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      if (file.type !== "image/png") {
        toast.error("Logo must be a PNG file.");
        return;
      }
      if (file.size > MAX_LOGO_BYTES) {
        toast.error("Logo must be 2 MB or smaller.");
        return;
      }
      setLogoPending(true);
      try {
        const presign = await getClinicLogoUploadPresignedUrl({ fileSize: file.size });
        if (!presign.success) {
          toast.error(presign.error ?? "Could not start upload.");
          return;
        }
        let putRes: Response;
        try {
          putRes = await fetch(presign.data.uploadUrl, {
            method: "PUT",
            body: file,
            headers: { "Content-Type": "image/png" },
          });
        } catch {
          toast.error("Upload to storage failed.");
          return;
        }
        if (!putRes.ok) {
          toast.error("Upload to storage failed.");
          return;
        }
        const conf = await confirmClinicLogoUpload();
        if (!conf.success) {
          toast.error(conf.error ?? "Could not confirm upload.");
          return;
        }
        toast.success("Logo updated.");
        router.refresh();
      } finally {
        setLogoPending(false);
      }
    },
    [router]
  );

  const handleConfirmRemoveLogo = useCallback(async () => {
    setLogoPending(true);
    try {
      const r = await deleteClinicLogo();
      if (!r.success) {
        toast.error(r.error ?? "Could not remove logo.");
        return;
      }
      toast.success("Logo removed.");
      setRemoveLogoOpen(false);
      router.refresh();
    } finally {
      setLogoPending(false);
    }
  }, [router]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 space-y-0 overflow-y-auto px-6 pt-10 pb-4">
        {/* My preferences */}
        <section className="space-y-3 pb-8">
          <SectionHeader icon={UserRound} title="My preferences" />
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Interface theme for your account. Applies immediately.
          </p>
          <ThemeSegmentedControl
            value={theme}
            disabled={themeBusy || pending}
            onSelect={(v) => void pickTheme(v)}
          />
        </section>

        <div
          className="border-t"
          style={{ borderColor: "var(--color-border)" }}
          aria-hidden
        />

        {/* Clinic colors */}
        <section className="space-y-4 py-8">
          <SectionHeader icon={Palette} title="Clinic colors" />
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            {canEditColors
              ? "Adjust the primary and secondary accent colors for all clinic users."
              : "You can view the clinic colors. Only admins and doctors can edit them."}
          </p>

          <div className="flex flex-wrap gap-3">
            <ClinicColorSwatchCard
              label="Primary"
              value={canEditColors ? primary : payload.settings.primaryColor}
              onChange={onPrimaryPick}
              disabled={!canEditColors || pending}
            />
            <ClinicColorSwatchCard
              label="Secondary"
              value={canEditColors ? secondary : payload.settings.secondaryColor}
              onChange={onSecondaryPick}
              disabled={!canEditColors || pending}
            />
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--color-text-muted)" }}
            >
              Preview
            </span>
            <div
              className="inline-flex items-center gap-1.5"
              aria-hidden
            >
              <div
                className="h-2.5 w-6 shrink-0 rounded-sm"
                style={{ background: "var(--color-clinic-primary)" }}
              />
              <div
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: "var(--color-clinic-primary)" }}
              />
              <div
                className="h-2.5 w-6 shrink-0 rounded-sm"
                style={{ background: "var(--color-clinic-secondary)" }}
              />
              <div
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: "var(--color-clinic-secondary)" }}
              />
            </div>
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Stored defaults:{" "}
              <span className="font-mono tabular-nums">
                {payload.settings.defaultPrimaryColor}
              </span>
              {" · "}
              <span className="font-mono tabular-nums">
                {payload.settings.defaultSecondaryColor}
              </span>
            </span>
          </div>

          {canEditColors && (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => void handleResetToDefault()}
              >
                Reset to default
              </Button>
              {canSetColorDefaults && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={pending}
                  onClick={() => void handleSetAsDefault()}
                >
                  Set current as default
                </Button>
              )}
            </div>
          )}
        </section>

        {canManageLogo ? (
          <>
            <div
              className="border-t"
              style={{ borderColor: "var(--color-border)" }}
              aria-hidden
            />

            <section className="space-y-4 pt-8 pb-2">
              <SectionHeader icon={ImageIcon} title="Clinic logo" />
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                PNG only, up to 2 MB. Shown in the sidebar and login screen.
              </p>
              <div className="flex flex-wrap items-start gap-4">
                <ClinicBrandMark
                  clinicName={payload.clinicName}
                  clinicLogoUrl={payload.clinicLogoUrl}
                  className="size-16 shrink-0 rounded-lg"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  {!payload.settings.logoUpdatedAt ? (
                    <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                      No logo uploaded — initials shown as fallback.
                    </p>
                  ) : (
                    <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                      Logo file is active for this clinic.
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png"
                      className="hidden"
                      onChange={(e) => void handleLogoFile(e)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={logoPending}
                      onClick={() => logoInputRef.current?.click()}
                    >
                      <Upload className="size-4" aria-hidden />
                      {logoPending ? "Working…" : "Upload logo"}
                    </Button>
                    {payload.settings.logoUpdatedAt ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={logoPending}
                        onClick={() => setRemoveLogoOpen(true)}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>
          </>
        ) : null}
      </div>

      {canEditColors && (
        <div
          className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t px-6 py-3"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-surface-alt)",
          }}
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending || !colorsDirty}
            onClick={handleCancelColors}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={pending || !colorsDirty}
            onClick={handleSaveColors}
          >
            Save colors
          </Button>
        </div>
      )}

      <AlertDialogPrimitive.Root open={removeLogoOpen} onOpenChange={setRemoveLogoOpen}>
        <AlertDialogPrimitive.Portal>
          <AlertDialogPrimitive.Overlay
            className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50"
            onPointerDown={(e) => {
              if (logoPending) return;
              if (e.target === e.currentTarget) setRemoveLogoOpen(false);
            }}
          />
          <AlertDialogPrimitive.Content
            className="bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 outline-none sm:max-w-lg"
          >
            <div className="relative flex items-start justify-between gap-3">
              <AlertDialogPrimitive.Title
                className="text-lg font-semibold leading-none pr-10"
                style={{ color: "var(--color-text-primary)" }}
              >
                Remove clinic logo?
              </AlertDialogPrimitive.Title>
              <AlertDialogPrimitive.Cancel asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={logoPending}
                  className="absolute right-0 top-0 shrink-0"
                  aria-label="Close"
                >
                  <X className="size-4" />
                </Button>
              </AlertDialogPrimitive.Cancel>
            </div>
            <AlertDialogPrimitive.Description
              className="text-sm"
              style={{ color: "var(--color-text-secondary)" }}
            >
              The logo file will be deleted from storage. Initials will show until a new logo is
              uploaded.
            </AlertDialogPrimitive.Description>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={logoPending}
                onClick={() => setRemoveLogoOpen(false)}
              >
                Keep logo
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={logoPending}
                onClick={() => void handleConfirmRemoveLogo()}
              >
                Remove
              </Button>
            </div>
          </AlertDialogPrimitive.Content>
        </AlertDialogPrimitive.Portal>
      </AlertDialogPrimitive.Root>
    </div>
  );
}
