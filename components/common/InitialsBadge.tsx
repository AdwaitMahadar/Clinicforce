import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/** Deterministic hue from a string — same name always maps to the same colour. */
function hashToHue(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Bias away from muddy reds/browns near 0° and 360°
  return Math.abs(hash) % 300 + 30;
}

/** "John Doe" → "JD", "Alice" → "AL" */
function toInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const SIZE: Record<string, { avatar: string; text: string }> = {
  sm: { avatar: "size-7",  text: "text-[10px]" },
  md: { avatar: "size-8",  text: "text-xs"     },
  lg: { avatar: "size-10", text: "text-sm"     },
};

interface InitialsBadgeProps {
  /** Full name — used for both initials and colour derivation */
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Thin wrapper over Shadcn `Avatar` that auto-generates initials and a
 * deterministic background colour from the `name` prop.
 *
 * @example <InitialsBadge name="Jane Smith" size="md" />
 */
export function InitialsBadge({ name, size = "md", className }: InitialsBadgeProps) {
  const initials = toInitials(name);
  const hue = hashToHue(name);
  const { avatar, text } = SIZE[size];

  return (
    <Avatar
      className={cn("rounded-lg border flex-shrink-0", avatar, className)}
      style={{
        background: `hsl(${hue} 60% 90%)`,
        borderColor: `hsl(${hue} 40% 82%)`,
      }}
    >
      <AvatarFallback
        className={cn("rounded-lg bg-transparent font-bold", text)}
        style={{ color: `hsl(${hue} 50% 30%)` }}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
