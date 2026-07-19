import { cn } from "@/lib/utils";

export function Progress({
  value,
  max = 100,
  className,
  barClassName,
}: {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-3", className)}
    >
      <div
        className={cn(
          "h-full rounded-full bg-volt transition-all duration-500",
          barClassName,
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
