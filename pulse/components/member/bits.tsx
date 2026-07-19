"use client";

import { Star, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";

/** The app-wide credit price chip. */
export function CreditChip({
  cost,
  size = "md",
  className,
}: {
  cost: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-volt/30 bg-volt/10 font-bold text-volt tnum",
        size === "sm" && "px-2 py-0.5 text-xs",
        size === "md" && "px-2.5 py-1 text-sm",
        size === "lg" && "px-3.5 py-1.5 text-base",
        className,
      )}
    >
      <Zap
        className={cn(
          "fill-current",
          size === "sm" ? "size-3" : size === "md" ? "size-3.5" : "size-4",
        )}
      />
      {cost}
      <span className="sr-only">{t("common.credits")}</span>
    </span>
  );
}

export function RatingChip({
  rating,
  count,
  className,
}: {
  rating: number;
  count?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-sm font-semibold text-hi tnum",
        className,
      )}
    >
      <Star className="size-3.5 fill-warn text-warn" />
      {rating.toFixed(1)}
      {count !== undefined && (
        <span className="font-normal text-low">({count})</span>
      )}
    </span>
  );
}

export function PeakBadge({ peak }: { peak: boolean }) {
  const { t } = useI18n();
  return peak ? (
    <Badge variant="warn">{t("common.peak")}</Badge>
  ) : (
    <Badge variant="good">{t("common.offPeak")}</Badge>
  );
}
