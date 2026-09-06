"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Compass, Sprout } from "lucide-react";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { useLiveQuery } from "@/lib/hooks/use-live-query";
import { useGeo } from "@/lib/stores/geo";
import { haversineMeters } from "@/lib/geo/distance";
import type { DiscoverySuggestion, SessionView } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { CoverArt } from "@/components/shared/cover-art";
import { DistanceLabel } from "@/components/shared/distance-label";
import { CreditChip } from "@/components/member/bits";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * "Try something new" — variety as motivation. Untried categories first,
 * then new neighborhoods, then untried studios; ranked by distance when the
 * member shared their location (and shown without any distance otherwise).
 * Entirely optional: there is no streak, badge or nudge attached to it.
 */
export function TrySomethingNew({
  userId,
  onBook,
}: {
  userId: string;
  onBook: (view: SessionView) => void;
}) {
  const { t, pick } = useI18n();
  const { coords } = useGeo();
  const { data, loading } = useLiveQuery(
    (svc) =>
      svc.engagement.listDiscoveries(userId, { cityId: "thessaloniki", limit: 10 }),
    [userId],
  );
  const { data: categories } = useLiveQuery(
    (svc) => svc.catalog.listCategories(),
    [],
  );

  const ranked = useMemo(() => {
    const list = [...(data ?? [])];
    if (coords) {
      const rank = (r: DiscoverySuggestion["reason"]) =>
        r === "untried_category" ? 0 : 1;
      list.sort(
        (a, b) =>
          rank(a.reason) - rank(b.reason) ||
          haversineMeters(coords, { lat: a.studio.lat, lng: a.studio.lng }) -
            haversineMeters(coords, { lat: b.studio.lat, lng: b.studio.lng }),
      );
    }
    return list.slice(0, 6);
  }, [data, coords]);

  if (!loading && ranked.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="display flex items-center gap-2 text-lg text-hi">
            <Compass className="size-4.5 text-volt" />
            {t("discover.title")}
          </h2>
          <p className="mt-0.5 text-xs text-mid">{t("discover.sub")}</p>
        </div>
        <Link
          href="/member/explore"
          className="inline-flex h-11 shrink-0 items-center gap-1 pl-2 text-sm font-medium text-volt hover:text-volt-bright sm:h-auto sm:pl-0"
        >
          {t("common.seeAll")} <ArrowRight className="size-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-52 w-60 shrink-0" />
          ))}
        </div>
      ) : (
        <div
          className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1"
          // Animated cards keep a transform; contain:paint stops the rail
          // leaking its width into the page (see near-you.tsx).
          style={{ contain: "paint" }}
        >
          {ranked.map((d, i) => {
            const cat = categories?.find((c) => c.id === d.categoryId);
            const beginner = d.session?.classType.level === "beginner";
            const inner = (
              <>
                <CoverArt
                  categoryId={d.categoryId}
                  seed={d.studio.artSeed + 5}
                  label={d.studio.name}
                  className="h-24"
                >
                  <div className="absolute left-2.5 top-2.5">
                    <Badge variant="volt" className="backdrop-blur-sm">
                      {t(`discover.${d.reason}` as TranslationKey)}
                    </Badge>
                  </div>
                </CoverArt>
                <div className="flex flex-1 flex-col p-3.5">
                  <p className="truncate text-sm font-semibold text-hi">{d.studio.name}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-mid">
                    <span>{cat ? pick(cat.name) : d.categoryId}</span>
                    <DistanceLabel
                      to={{ lat: d.studio.lat, lng: d.studio.lng }}
                      className="text-low"
                    />
                  </p>
                  <div className="mt-auto pt-3">
                    {d.session ? (
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs text-mid">{d.session.classType.name}</p>
                          <p className="text-[11px] text-low tnum">
                            {t("discover.nextClass", {
                              time: formatDateTime(d.session.session.startsAt, "el"),
                            })}
                          </p>
                        </div>
                        <CreditChip cost={d.session.creditCost} size="sm" />
                      </div>
                    ) : (
                      <span className="text-xs text-low">{t("common.viewStudio")}</span>
                    )}
                    {beginner && (
                      <Badge variant="good" className="mt-2 gap-1">
                        <Sprout /> {t("discover.beginnerFriendly")}
                      </Badge>
                    )}
                  </div>
                </div>
              </>
            );
            const cls =
              "flex h-full w-60 shrink-0 flex-col overflow-hidden rounded-lg border border-line bg-surface text-left transition-colors hover:border-volt/40";
            return (
              <motion.div
                key={d.studio.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="w-60 shrink-0"
              >
                {d.session ? (
                  <button type="button" onClick={() => onBook(d.session!)} className={cls}>
                    {inner}
                  </button>
                ) : (
                  <Link href={`/member/studios/${d.studio.id}`} className={cls}>
                    {inner}
                  </Link>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </section>
  );
}
