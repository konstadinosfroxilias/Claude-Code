"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarCheck,
  CalendarX2,
  Euro,
  Gauge,
  Hourglass,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useLiveQuery } from "@/lib/hooks/use-live-query";
import { addDays, formatEUR, formatMonth, formatTime, monthKey, startOfDay } from "@/lib/utils";
import { StatCard, useMyStudio } from "@/components/studio/common";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PeakBadge } from "@/components/member/bits";

export default function StudioOverviewPage() {
  const { t, lang } = useI18n();
  const { studio, loading: loadingStudio } = useMyStudio();

  const { data: payout, loading: loadingPayout } = useLiveQuery(
    (svc) =>
      studio ? svc.payouts.getSummary(studio.id) : Promise.resolve(null),
    [studio?.id],
  );
  const { data: analytics, loading: loadingAnalytics } = useLiveQuery(
    (svc) =>
      studio
        ? svc.analytics.getStudioAnalytics(studio.id)
        : Promise.resolve(null),
    [studio?.id],
  );
  const { data: todaySessions, loading: loadingSessions } = useLiveQuery(
    (svc) => {
      if (!studio) return Promise.resolve([]);
      const start = startOfDay(new Date());
      return svc.studioAdmin.listSessions(
        studio.id,
        start.toISOString(),
        addDays(start, 1).toISOString(),
      );
    },
    [studio?.id],
  );

  const nowMonth = formatMonth(monthKey(new Date().toISOString()), lang);

  return (
    <div>
      <PageHeader
        title={studio?.name ?? "…"}
        sub={loadingStudio ? undefined : t("dash.overview")}
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={Euro}
          label={t("dashHome.monthPayout", { month: nowMonth })}
          value={payout ? formatEUR(payout.confirmedThisMonthEUR, lang) : "–"}
          sub={
            payout
              ? t("dashPayouts.attendances", {
                  n: payout.attendancesThisMonth,
                })
              : undefined
          }
          accent
          loading={loadingPayout}
        />
        <StatCard
          icon={Hourglass}
          label={t("dashHome.pendingPayout")}
          value={payout ? formatEUR(payout.pendingEUR, lang) : "–"}
          loading={loadingPayout}
        />
        <StatCard
          icon={Gauge}
          label={t("dashHome.fillRate")}
          value={
            analytics ? `${Math.round(analytics.kpis.fillRate * 100)}%` : "–"
          }
          loading={loadingAnalytics}
        />
        <StatCard
          icon={CalendarCheck}
          label={t("dashHome.bookingsMonth")}
          value={analytics?.kpis.bookingsThisMonth ?? "–"}
          loading={loadingAnalytics}
        />
      </div>

      {/* Today's sessions */}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="display text-lg text-hi">
            {t("dashHome.todaySessions")}
          </h2>
          <Link
            href="/studio/schedule"
            className="flex items-center gap-1 text-sm font-medium text-volt hover:text-volt-bright"
          >
            {t("dash.schedule")} <ArrowRight className="size-3.5" />
          </Link>
        </div>

        {loadingSessions ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-[68px]" />
            ))}
          </div>
        ) : (todaySessions ?? []).length === 0 ? (
          <EmptyState
            icon={CalendarX2}
            title={t("dashHome.noSessionsToday")}
            className="py-8"
          />
        ) : (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.05 } },
            }}
            className="space-y-2"
          >
            {(todaySessions ?? []).map((v) => {
              const past =
                new Date(v.session.startsAt).getTime() < Date.now();
              return (
                <motion.div
                  key={v.session.id}
                  variants={{
                    hidden: { opacity: 0, y: 10 },
                    show: { opacity: 1, y: 0 },
                  }}
                >
                  <Link
                    href={`/studio/roster?session=${v.session.id}`}
                    className="flex items-center gap-4 rounded-xl border border-line bg-surface px-4 py-3 transition-colors hover:border-volt/40"
                  >
                    <p className="display w-14 text-base text-hi tnum">
                      {formatTime(v.session.startsAt, lang)}
                    </p>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-hi">
                        {v.classType.name}
                      </p>
                      <p className="text-xs text-mid">{v.session.instructor}</p>
                    </div>
                    <PeakBadge peak={v.session.peak} />
                    <Badge variant={v.spotsLeft === 0 ? "good" : "neutral"}>
                      {t("dashSchedule.bookedOfReleased", {
                        booked: v.booked,
                        released: v.session.spotsReleasedToPlatform,
                      })}
                    </Badge>
                    {past ? (
                      <span className="hidden text-xs text-low sm:block">
                        {t("dashHome.quickRoster")}
                      </span>
                    ) : (
                      <ArrowRight className="size-4 text-low" />
                    )}
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </section>
    </div>
  );
}
