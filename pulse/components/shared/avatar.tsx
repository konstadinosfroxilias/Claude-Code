import { cn, hashString, initials } from "@/lib/utils";

const HUES = [16, 48, 76, 152, 196, 262, 318];

/** Gradient-initials avatar — deterministic per name, no images needed. */
export function Avatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const hue = HUES[hashString(name) % HUES.length];
  return (
    <div
      aria-hidden
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white/90",
        className,
      )}
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 45% 38%), hsl(${(hue + 40) % 360} 55% 26%))`,
      }}
    >
      {initials(name)}
    </div>
  );
}
