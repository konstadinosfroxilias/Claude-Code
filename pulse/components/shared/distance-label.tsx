"use client";

import { Footprints, Car } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useGeo } from "@/lib/stores/geo";
import {
  estimateTravel,
  formatDistance,
  haversineMeters,
  type Coords,
} from "@/lib/geo/distance";
import { cn } from "@/lib/utils";

/**
 * Renders "12 min walk · 900 m" for a destination — and renders NOTHING at
 * all unless location permission was granted. There is no placeholder and no
 * estimated fallback: a member who declined simply never sees a distance.
 */
export function DistanceLabel({
  to,
  className,
  withIcon = true,
}: {
  to: Coords;
  className?: string;
  withIcon?: boolean;
}) {
  const { t, lang } = useI18n();
  const { coords } = useGeo();
  if (!coords) return null;

  const meters = haversineMeters(coords, to);
  const travel = estimateTravel(meters);
  const Icon = travel.mode === "walk" ? Footprints : Car;
  const travelText = t(
    travel.mode === "walk" ? "distance.walkShort" : "distance.driveShort",
    { time: travel.minutes },
  );

  return (
    <span
      className={cn("inline-flex items-center gap-1 whitespace-nowrap", className)}
    >
      {withIcon && <Icon className="size-3 shrink-0" aria-hidden />}
      <span className="tnum">
        {t("distance.withDistance", {
          travel: travelText,
          dist: formatDistance(meters, lang),
        })}
      </span>
    </span>
  );
}
