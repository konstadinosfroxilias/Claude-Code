"use client";

import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowRight, CalendarDays, Clock3, Dumbbell, MapPinned, Sparkles, Timer, Trophy } from "lucide-react";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { useCurrentUser } from "@/lib/hooks/use-session";
import { useLiveQuery } from "@/lib/hooks/use-live-query";
import { formatMonth } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { GoalCard } from "@/components/member/goal-card";
import { RecapCard } from "@/components/member/recap-card";
import { AchievementsSection } from "@/components/member/achievements";
import { weekdayKey } from "@/components/member/engagement-sync";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Same validated chart steps as the studio dashboard (see analytics/page.tsx). */
const CHART = { seriesA: "#7e9a22", seriesB: "#6389df", grid: "#232733", tick: "#5d6470" };
const TOOLTIP_STYLE: React.CSSProperties = {
  background: "#191c24",
  border: "1px solid #303543",
  borderRadius: 12,
  color: "#f2f3f5",
  fontSize: 12,
  padding: "8px 12px",
};

export default function ProgressPage() {
  const { t, pick, lang } = useI18n();
  const { userId } = useCurrentUser();

  const { data, loading } = useLiveQuery(
    (svc) =>
      userId ? svc.engagement.getProgressInsights(userId) : Promise.resolve(null),
    [userId],
  );
  const { data: categories } = useLiveQuery(
    (svc) => svc.catalog.listCategories(),
    [],
  );

  if (!userId) return null;

  const tiles = [
    { icon: CalendarDays, label: t("progress.classesMonth"), value: data?.classesThisMonth ?? "–", accent: true },
    { icon: Timer, label: t("progress.minutesMonth"), value: data?.minutesThisMonth ?? "–" },
    { icon: Dumbbell, label: t("progress.classesAllTime"), value: data?.classesAllTime ?? "–" },
    { icon: Clock3, label: t("progress.minutesAllTime"), value: data?.minutesAllTime ?? "–" },
    {
      icon: MapPinned,
      label: t("progress.favoriteStudio"),
      value: data?.favoriteStudio?.name ?? "–",
      sub: data?.favoriteStudio ? t("progress.visits", { n: data.favoriteStudio.count }) : undefined,
      wide: true,
    },
    {
      icon: Sparkles,
      label: t("progress.usually"),
      value:
        data?.mostActiveWeekday !== undefined && data.mostActiveHourBand
          ? t("progress.usuallyValue", {
              day: t(weekdayKey(data.mostActiveWeekday)),
              band: t(`progress.band.${data.mostActiveHourBand}` as TranslationKey),
            })
          : "–",
      wide: true,
    },
  ];

  const catData =
    data?.categoryMix.map((c) => ({
      label: pick(categories?.find((x) => x.id === c.categoryId)?.name ?? { el: c.categoryId, en: c.categoryId }),
      count: c.count,
    })) ?? [];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t("progress.title")} sub={t("progress.sub")} />

      <GoalCard userId={userId} showProgressLink={false} />

      <div className="mt-6">
        <RecapCard userId={userId} />
      </div>

      {!loading && data && data.classesAllTime === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title={t("progress.empty")}
          hint={t("progress.emptyHint")}
          className="mt-8"
        />
      ) : (
        <>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {tiles.map((tile) =>
              loading ? (
                <Skeleton key={tile.label} className="h-28" />
              ) : (
                <div
                  key={tile.label}
                  className={
                    (tile.accent
                      ? "rounded-lg border border-volt/30 bg-gradient-to-br from-volt/15 to-transparent p-4"
                      : "rounded-lg border border-line bg-surface p-4") +
                    (tile.wide ? " col-span-2" : "")
                  }
                >
                  <tile.icon className={tile.accent ? "size-4.5 text-volt" : "size-4.5 text-low"} />
                  <p className="display mt-3 truncate text-2xl text-hi tnum">{tile.value}</p>
                  {tile.sub && <p className="text-xs text-mid">{tile.sub}</p>}
                  <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-low">
                    {tile.label}
                  </p>
                </div>
              ),
            )}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <ChartCard title={t("progress.weeklyTrend")} sub={t("progress.last8Weeks")} loading={loading}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data?.weeklyTrend ?? []} margin={{ top: 8, right: 8, left: -22, bottom: 0 }} barCategoryGap="30%">
                  <CartesianGrid stroke={CHART.grid} vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: CHART.tick, fontSize: 11 }} tickLine={false} axisLine={{ stroke: CHART.grid }} />
                  <YAxis tick={{ fill: CHART.tick, fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    cursor={{ fill: "#21252f55" }}
                    formatter={(v, _n, item) => [
                      `${v} · ${t("progress.minutes", { n: (item?.payload as { minutes?: number } | undefined)?.minutes ?? 0 })}`,
                      t("common.class"),
                    ]}
                  />
                  <Bar dataKey="attended" fill={CHART.seriesA} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title={t("progress.monthlyTrend")} sub={t("progress.last6Months")} loading={loading}>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart
                  data={(data?.monthlyTrend ?? []).map((m) => ({ ...m, label: formatMonth(m.month, lang).split(" ")[0] }))}
                  margin={{ top: 8, right: 8, left: -22, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="fillMonthly" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART.seriesB} stopOpacity={0.32} />
                      <stop offset="100%" stopColor={CHART.seriesB} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={CHART.grid} vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: CHART.tick, fontSize: 11 }} tickLine={false} axisLine={{ stroke: CHART.grid }} />
                  <YAxis tick={{ fill: CHART.tick, fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: CHART.tick, strokeDasharray: "3 3" }} />
                  <Area type="monotone" dataKey="attended" name={t("common.class")} stroke={CHART.seriesB} strokeWidth={2} fill="url(#fillMonthly)" dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "#12141a" }} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title={t("progress.categoryMix")} loading={loading} className="lg:col-span-2">
              <ResponsiveContainer width="100%" height={Math.max(160, 44 * Math.max(1, catData.length))}>
                <BarChart data={catData} layout="vertical" margin={{ top: 4, right: 24, left: 30, bottom: 0 }} barCategoryGap="32%">
                  <CartesianGrid stroke={CHART.grid} horizontal={false} />
                  <XAxis type="number" tick={{ fill: CHART.tick, fontSize: 11 }} tickLine={false} axisLine={{ stroke: CHART.grid }} allowDecimals={false} />
                  <YAxis type="category" dataKey="label" width={120} tick={{ fill: "#9aa1ad", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "#21252f55" }} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {catData.map((_, i) => (
                      <Cell key={i} fill={CHART.seriesA} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </>
      )}

      <section className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="display flex items-center gap-2 text-lg text-hi">
            <Trophy className="size-4.5 text-volt" /> {t("achievements.title")}
          </h2>
          <Link
            href="/member/profile"
            className="inline-flex h-11 items-center gap-1 text-sm font-medium text-volt hover:text-volt-bright sm:h-auto"
          >
            {t("nav.profile")} <ArrowRight className="size-3.5" />
          </Link>
        </div>
        <AchievementsSection userId={userId} grouped />
      </section>
    </div>
  );
}

function ChartCard({
  title,
  sub,
  loading,
  className,
  children,
}: {
  title: string;
  sub?: string;
  loading?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-baseline justify-between gap-3">
        <CardTitle>{title}</CardTitle>
        {sub && <span className="text-xs text-low">{sub}</span>}
      </CardHeader>
      <CardContent>{loading ? <Skeleton className="h-56" /> : children}</CardContent>
    </Card>
  );
}
