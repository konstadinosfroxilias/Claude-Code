"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Clock, ShieldCheck, Users } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useLiveQuery } from "@/lib/hooks/use-live-query";
import { useGeo } from "@/lib/stores/geo";
import {
  estimateTravel,
  haversineMeters,
  type Coords,
} from "@/lib/geo/distance";
import type { SessionView, VisitCapStatus } from "@/lib/types";
import { cn, formatTime } from "@/lib/utils";
import { CreditChip } from "@/components/member/bits";
import { DistanceLabel } from "@/components/shared/distance-label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";

/** How far ahead "starting soon" looks. */
const WINDOW_HOURS = 6;

/**
 * Ranking score — lower is better.
 *
 * With location we blend "starts soon" and "close by" so the wake-up →
 * book flow surfaces the class you can actually reach in time. Without
 * location we fall back to pure start-time order (and render no distance).
 */
function score(view: SessionView, coords: Coords | null): number {
  const minutesAway = Math.max(
    0,
    (new Date(view.session.startsAt).getTime() - Date.now()) / 60_000,
  );
  if (!coords) return minutesAway;
  const meters = haversineMeters(coords, {
    lat: view.studio.lat,
    lng: view.studio.lng,
  });
  const travel = estimateTravel(meters);
  // Penalise classes you can't physically reach before they start.
  const unreachable = travel.minutes > minutesAway ? 240 : 0;
  return minutesAway + travel.minutes * 1.5 + unreachable;
}

export function NearYouSection({
  userId,
  onBook,
}: {
  userId: string;
  onBook: (view: SessionView) => void;
}) {
  const { t } = useI18n();
  const { coords } = useGeo();

  const { data: sessions, loading } = useLiveQuery(
    (svc) =>
      svc.catalog.listStartingSoon({
        cityId: "thessaloniki",
        withinHours: WINDOW_HOURS,
        limit: 12,
      }),
    [],
  );

  // Cap status per studio in the feed, so capped studios can be shown
  // disabled with the explainer rather than silently dropped.
  const studioIds = useMemo(
    () => [...new Set((sessions ?? []).map((s) => s.studio.id))].sort(),
    [sessions],
  );
  const { data: capMap } = useLiveQuery(
    async (svc) => {
      const entries = await Promise.all(
        studioIds.map(
          async (id) =>
            [id, await svc.booking.visitCapStatus(userId, id)] as const,
        ),
      );
      return Object.fromEntries(entries) as Record<string, VisitCapStatus>;
    },
    [userId, studioIds.join(",")],
  );

  const ranked = useMemo(
    () =>
      [...(sessions ?? [])]
        .sort((a, b) => score(a, coords) - score(b, coords))
        .slice(0, 6),
    [sessions, coords],
  );

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="display text-lg text-hi">
            {coords ? t("home.nearYouTitle") : t("home.nearYouTitleNoGeo")}
          </h2>
          <p className="mt-0.5 text-xs text-mid">
            {t("home.nearYouSub", { hours: WINDOW_HOURS })}
          </p>
        </div>
        <Link
          href="/member/explore?today=1"
          className="inline-flex h-11 shrink-0 items-center gap-1 pl-2 text-sm font-medium text-volt hover:text-volt-bright sm:h-auto sm:pl-0"
        >
          {t("common.seeAll")} <ArrowRight className="size-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40 w-64 shrink-0" />
          ))}
        </div>
      ) : ranked.length === 0 ? (
        <EmptyState
          icon={Clock}
          title={t("home.nearYouEmpty")}
          hint={t("home.nearYouEmptyHint")}
          className="py-8"
        />
      ) : (
        <div
          className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1"
          /*
           * contain: paint is load-bearing. The cards keep a framer-motion
           * transform after their entrance animation settles, and transformed
           * descendants escape a scroll container's clip — without this the
           * rail's full width leaks out and the whole page scrolls sideways.
           */
          style={{ contain: "paint" }}
        >
          {ranked.map((view, i) => (
            <motion.div
              key={view.session.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="w-64 shrink-0"
            >
              <SoonCard
                view={view}
                capped={capMap?.[view.studio.id]?.reached ?? false}
                onBook={onBook}
              />
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}

function SoonCard({
  view,
  capped,
  onBook,
}: {
  view: SessionView;
  capped: boolean;
  onBook: (view: SessionView) => void;
}) {
  const { t, lang } = useI18n();
  const { session, classType, studio, creditCost, spotsLeft } = view;
  const minutes = Math.max(
    1,
    Math.round((new Date(session.startsAt).getTime() - Date.now()) / 60_000),
  );
  const full = spotsLeft <= 0;

  return (
    <button
      type="button"
      onClick={() => onBook(view)}
      className={cn(
        "flex h-full w-full flex-col rounded-lg border bg-surface p-4 text-left transition-all",
        capped
          ? "border-warn/30 opacity-70"
          : "border-line hover:border-volt/40 active:scale-[0.99]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-volt/12 px-2.5 py-1 text-xs font-bold text-volt tnum">
          <Clock className="size-3" />
          {t("home.nearYouStartsIn", { time: minutes })}
        </span>
        <CreditChip cost={creditCost} size="sm" />
      </div>

      <p className="mt-3 line-clamp-2 text-sm font-semibold text-hi">
        {classType.name}
      </p>
      <p className="mt-0.5 truncate text-xs text-mid">{studio.name}</p>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-low">
        <span className="tnum">{formatTime(session.startsAt, lang)}</span>
        <DistanceLabel to={{ lat: studio.lat, lng: studio.lng }} />
      </div>

      <div className="mt-auto pt-3">
        {capped ? (
          <Badge variant="warn" className="gap-1">
            <ShieldCheck /> {t("home.nearYouCapReached")}
          </Badge>
        ) : full ? (
          <Badge variant="neutral" className="gap-1">
            <Users /> {t("waitlist.join")}
          </Badge>
        ) : (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[11px] tnum",
              spotsLeft <= 2 ? "text-warn" : "text-low",
            )}
          >
            <Users className="size-3" />
            {t("common.spotsLeft", { n: spotsLeft })}
          </span>
        )}
      </div>
    </button>
  );
}
