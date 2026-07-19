"use client";

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
import { CalendarCheck, Euro, Gauge, UserCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useLiveQuery } from "@/lib/hooks/use-live-query";
import { formatEUR } from "@/lib/utils";
import { StatCard, useMyStudio } from "@/components/studio/common";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Chart tokens — series steps validated for the dark card surface (#12141a)
 * with scripts/validate_palette.js (dataviz method): lightness band, chroma,
 * CVD separation and contrast all pass. The UI volt (#c8f13f) is an accent,
 * not a series color.
 */
const CHART = {
  seriesA: "#7e9a22", // volt, chart step
  seriesB: "#6389df", // blue, chart step
  grid: "#232733",
  tick: "#5d6470",
};

const TOOLTIP_STYLE: React.CSSProperties = {
  background: "#191c24",
  border: "1px solid #303543",
  borderRadius: 12,
  color: "#f2f3f5",
  fontSize: 12,
  padding: "8px 12px",
};

export default function AnalyticsPage() {
  const { t, pick, lang } = useI18n();
  const { studio } = useMyStudio();

  const { data, loading } = useLiveQuery(
    (svc) =>
      studio
        ? svc.analytics.getStudioAnalytics(studio.id)
        : Promise.resolve(null),
    [studio?.id],
  );
  const { data: categories } = useLiveQuery(
    (svc) => svc.catalog.listCategories(),
    [],
  );

  const catData =
    data?.categoryPerformance.map((c) => ({
      name:
        categories?.find((x) => x.id === c.categoryId)?.name ?? {
          el: c.categoryId,
          en: c.categoryId,
        },
      bookings: c.bookings,
    })) ?? [];

  return (
    <div>
      <PageHeader
        title={t("dashAnalytics.title")}
        sub={t("dashAnalytics.last30")}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={CalendarCheck}
          label={t("dashHome.bookingsMonth")}
          value={data?.kpis.bookingsThisMonth ?? "–"}
          loading={loading}
          accent
        />
        <StatCard
          icon={UserCheck}
          label={t("dashAnalytics.attendanceRate")}
          value={data ? `${Math.round(data.kpis.attendanceRate * 100)}%` : "–"}
          loading={loading}
        />
        <StatCard
          icon={Gauge}
          label={t("dashHome.fillRate")}
          value={data ? `${Math.round(data.kpis.fillRate * 100)}%` : "–"}
          loading={loading}
        />
        <StatCard
          icon={Euro}
          label={t("dashAnalytics.revenue")}
          value={data ? formatEUR(data.kpis.revenueThisMonthEUR, lang) : "–"}
          loading={loading}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Bookings over time — single series area */}
        <ChartCard title={t("dashAnalytics.bookingsOverTime")} loading={loading}>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data?.bookingsOverTime ?? []} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="fillBookings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART.seriesA} stopOpacity={0.32} />
                  <stop offset="100%" stopColor={CHART.seriesA} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={CHART.grid} strokeDasharray="0" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: CHART.tick, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: CHART.grid }}
                interval={6}
              />
              <YAxis
                tick={{ fill: CHART.tick, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: CHART.tick, strokeDasharray: "3 3" }} />
              <Area
                type="monotone"
                dataKey="value"
                name={t("dashAnalytics.bookingsOverTime")}
                stroke={CHART.seriesA}
                strokeWidth={2}
                fill="url(#fillBookings)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "#12141a" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* New vs returning — 2 series stacked bars + legend */}
        <ChartCard
          title={t("dashAnalytics.newVsReturning")}
          loading={loading}
          legend={[
            { color: CHART.seriesA, label: t("dashAnalytics.newMembers") },
            { color: CHART.seriesB, label: t("dashAnalytics.returning") },
          ]}
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data?.newVsReturning ?? []} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barCategoryGap="28%">
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: CHART.tick, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: CHART.grid }}
              />
              <YAxis
                tick={{ fill: CHART.tick, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "#21252f55" }} />
              <Bar
                dataKey="newMembers"
                name={t("dashAnalytics.newMembers")}
                stackId="m"
                fill={CHART.seriesA}
                stroke="#12141a"
                strokeWidth={2}
              />
              <Bar
                dataKey="returning"
                name={t("dashAnalytics.returning")}
                stackId="m"
                fill={CHART.seriesB}
                stroke="#12141a"
                strokeWidth={2}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Fill rate — single series bars (%) */}
        <ChartCard title={t("dashAnalytics.fillRate")} loading={loading}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data?.fillRateByDay ?? []} margin={{ top: 8, right: 8, left: -14, bottom: 0 }} barCategoryGap="30%">
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: CHART.tick, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: CHART.grid }}
                interval={2}
              />
              <YAxis
                tick={{ fill: CHART.tick, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                unit="%"
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                cursor={{ fill: "#21252f55" }}
                formatter={(v) => [`${v}%`, t("dashHome.fillRate")]}
              />
              <Bar dataKey="value" fill={CHART.seriesA} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Category performance — horizontal single-hue bars */}
        <ChartCard title={t("dashAnalytics.categoryPerf")} loading={loading}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={catData.map((c) => ({ ...c, label: pick(c.name) }))}
              layout="vertical"
              margin={{ top: 8, right: 24, left: 30, bottom: 0 }}
              barCategoryGap="32%"
            >
              <CartesianGrid stroke={CHART.grid} horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill: CHART.tick, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: CHART.grid }}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={110}
                tick={{ fill: "#9aa1ad", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "#21252f55" }} />
              <Bar dataKey="bookings" radius={[0, 4, 4, 0]}>
                {catData.map((_, i) => (
                  <Cell key={i} fill={CHART.seriesA} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  loading,
  legend,
  children,
}: {
  title: string;
  loading?: boolean;
  legend?: { color: string; label: string }[];
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        {legend && (
          <div className="flex items-center gap-3">
            {legend.map((l) => (
              <span
                key={l.label}
                className="flex items-center gap-1.5 text-xs text-mid"
              >
                <span
                  className="size-2.5 rounded-[3px]"
                  style={{ background: l.color }}
                  aria-hidden
                />
                {l.label}
              </span>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-60" /> : children}
      </CardContent>
    </Card>
  );
}
