"use client";

import Link from "next/link";
import { Heart, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import type { Studio } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import { useLiveQuery } from "@/lib/hooks/use-live-query";
import { getServices } from "@/lib/services";
import { CoverArt } from "@/components/shared/cover-art";
import { Badge } from "@/components/ui/badge";
import { RatingChip } from "@/components/member/bits";
import { DistanceLabel } from "@/components/shared/distance-label";
import { cn } from "@/lib/utils";

export function StudioCard({
  studio,
  userId,
  compact,
  className,
}: {
  studio: Studio;
  userId: string | null;
  compact?: boolean;
  className?: string;
}) {
  const { t, pick } = useI18n();

  const { data: neighborhoods } = useLiveQuery(
    (svc) => svc.catalog.listNeighborhoods(),
    [],
  );
  const { data: categories } = useLiveQuery(
    (svc) => svc.catalog.listCategories(),
    [],
  );
  const { data: isFav, refetch } = useLiveQuery(
    (svc) =>
      userId
        ? svc.catalog.isFavorite(userId, studio.id)
        : Promise.resolve(false),
    [userId, studio.id],
  );

  const nb = neighborhoods?.find((n) => n.id === studio.neighborhoodId);

  const toggleFav = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!userId) return;
    const nowFav = await getServices().catalog.toggleFavorite(
      userId,
      studio.id,
    );
    refetch();
    toast(nowFav ? t("favorites.added") : t("favorites.removed"));
  };

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className={className}
    >
      <Link
        href={`/member/studios/${studio.id}`}
        className="group block overflow-hidden rounded-lg border border-line bg-surface shadow-card outline-none transition-colors hover:border-line-strong focus-visible:outline-2 focus-visible:outline-volt"
      >
        <CoverArt
          categoryId={studio.categoryIds[0]}
          seed={studio.artSeed}
          label={studio.name}
          className={compact ? "h-28" : "h-36 sm:h-44"}
        >
          <div className="absolute left-3 top-3 flex gap-1.5">
            {studio.featured && (
              <Badge variant="volt" className="backdrop-blur-sm">
                PULSE Choice
              </Badge>
            )}
          </div>
          <button
            type="button"
            onClick={toggleFav}
            aria-label={t("nav.favorites")}
            aria-pressed={!!isFav}
            className="absolute right-2 top-2 flex size-11 items-center justify-center rounded-full bg-black/35 backdrop-blur-sm transition-all hover:scale-110 sm:right-3 sm:top-3 sm:size-8"
          >
            <Heart
              className={cn(
                "size-4 transition-colors",
                isFav ? "fill-bad text-bad" : "text-white/85",
              )}
            />
          </button>
        </CoverArt>

        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="display truncate text-[15px] text-hi group-hover:text-volt transition-colors">
              {studio.name}
            </h3>
            <RatingChip rating={studio.rating} />
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-low">
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3" />
              {nb ? pick(nb.name) : ""}
            </span>
            {/* Renders only when location permission was granted. */}
            <DistanceLabel to={{ lat: studio.lat, lng: studio.lng }} />
          </p>
          {!compact && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {studio.categoryIds.map((catId) => {
                const cat = categories?.find((c) => c.id === catId);
                return cat ? (
                  <Badge key={catId} variant="neutral">
                    {pick(cat.name)}
                  </Badge>
                ) : null;
              })}
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
