import { cn, hashString } from "@/lib/utils";
import type { CategoryId } from "@/lib/types";

/**
 * Deterministic editorial cover art — no external images, always premium.
 * Each category owns a palette; the seed varies angle/glow so every studio
 * gets a distinct, stable cover.
 */
const PALETTES: Record<CategoryId, { from: string; to: string; glow: string }> =
  {
    pilates: { from: "#241a2e", to: "#7a5477", glow: "#e5aec7" },
    crossfit: { from: "#2b150e", to: "#a4491f", glow: "#ffb37a" },
    boxing: { from: "#250f1c", to: "#8e3247", glow: "#ff8ba0" },
    ems: { from: "#0c1f30", to: "#2a6f96", glow: "#7fd4ff" },
    yoga: { from: "#12241f", to: "#41755c", glow: "#9fe3bf" },
    hiit: { from: "#1c1230", to: "#5d3fae", glow: "#b79bff" },
  };

export function CoverArt({
  categoryId,
  seed,
  label,
  className,
  children,
}: {
  categoryId: CategoryId;
  seed: string | number;
  label?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const p = PALETTES[categoryId] ?? PALETTES.hiit;
  const h = typeof seed === "number" ? seed : hashString(seed);
  const angle = 115 + (h % 90); // 115°–205°
  const glowX = 15 + (h % 70);
  const glowY = 10 + ((h >> 3) % 55);
  const initial = (label ?? "").trim().charAt(0).toUpperCase();

  return (
    <div
      aria-hidden
      className={cn("grain relative overflow-hidden", className)}
      style={{
        background: `radial-gradient(120% 90% at ${glowX}% ${glowY}%, ${p.glow}33 0%, transparent 55%), linear-gradient(${angle}deg, ${p.from} 0%, ${p.to} 100%)`,
      }}
    >
      {/* contour rings */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.16]"
        viewBox="0 0 400 240"
        preserveAspectRatio="xMidYMid slice"
      >
        {[52, 92, 136, 184, 236].map((r) => (
          <circle
            key={r}
            cx={glowX * 4}
            cy={glowY * 2.4}
            r={r}
            fill="none"
            stroke="white"
            strokeWidth="1"
          />
        ))}
      </svg>
      {initial && (
        <span
          className="display pointer-events-none absolute -bottom-5 -right-1 select-none text-[7rem] leading-none text-white/10"
          style={{ letterSpacing: "-0.05em" }}
        >
          {initial}
        </span>
      )}
      {children}
    </div>
  );
}
