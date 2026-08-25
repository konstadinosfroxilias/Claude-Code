"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Euro, FileText, Hourglass, Landmark } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useLiveQuery } from "@/lib/hooks/use-live-query";
import type { PayoutEntryView } from "@/lib/types";
import { cn, formatDateTime, formatEUR, formatMonth, monthKey } from "@/lib/utils";
import { StatCard, useMyStudio } from "@/components/studio/common";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Avatar } from "@/components/shared/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function PayoutsPage() {
  const { t, lang } = useI18n();
  const { studio } = useMyStudio();

  const { data: summary, loading: loadingSummary } = useLiveQuery(
    (svc) =>
      studio ? svc.payouts.getSummary(studio.id) : Promise.resolve(null),
    [studio?.id],
  );
  const { data: entries, loading: loadingEntries } = useLiveQuery(
    (svc) =>
      studio
        ? svc.payouts.listEntries(studio.id, { limit: 30 })
        : Promise.resolve([]),
    [studio?.id],
  );
  const { data: statements } = useLiveQuery(
    (svc) =>
      studio ? svc.payouts.listStatements(studio.id) : Promise.resolve([]),
    [studio?.id],
  );

  const nowMonth = formatMonth(monthKey(new Date().toISOString()), lang);

  return (
    <div>
      <PageHeader
        title={t("dashPayouts.title")}
        sub={t("dashPayouts.transparencyNote")}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          icon={Euro}
          label={t("dashPayouts.confirmedTitle", { month: nowMonth })}
          value={summary ? formatEUR(summary.confirmedThisMonthEUR, lang) : "–"}
          sub={
            summary
              ? t("dashPayouts.confirmedSub", {
                  n: summary.attendancesThisMonth,
                })
              : undefined
          }
          accent
          loading={loadingSummary}
        />
        <StatCard
          icon={Hourglass}
          label={t("dashPayouts.pendingTitle")}
          value={summary ? formatEUR(summary.pendingEUR, lang) : "–"}
          sub={t("dashPayouts.pendingSub")}
          loading={loadingSummary}
        />
        <StatCard
          icon={Landmark}
          label={t("dashPayouts.allTime")}
          value={summary ? formatEUR(summary.confirmedAllTimeEUR, lang) : "–"}
          loading={loadingSummary}
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Per-attendance breakdown */}
        <section>
          <h2 className="display mb-3 text-lg text-hi">
            {t("dashPayouts.perAttendance")}
          </h2>
          {loadingEntries ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : (entries ?? []).length === 0 ? (
            <EmptyState icon={Euro} title={t("dashPayouts.emptyEntries")} />
          ) : (
            <motion.div
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.03 } },
              }}
              className="space-y-2"
            >
              {(entries ?? []).map((v) => (
                <motion.div
                  key={v.entry.id}
                  variants={{
                    hidden: { opacity: 0, y: 8 },
                    show: { opacity: 1, y: 0 },
                  }}
                >
                  <EntryRow view={v} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>

        {/* Monthly statements */}
        <aside>
          <h2 className="display mb-3 text-lg text-hi">
            {t("dashPayouts.statements")}
          </h2>
          <div className="space-y-2">
            {(statements ?? []).map((st) => (
              <StatementCard
                key={st.month}
                month={st.month}
                totalEUR={st.totalEUR}
                count={st.attendanceCount}
              />
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function EntryRow({ view }: { view: PayoutEntryView }) {
  const { t, lang } = useI18n();
  const { entry } = view;
  const statusVariant =
    entry.status === "confirmed"
      ? "good"
      : entry.status === "pending"
        ? "warn"
        : "neutral";
  return (
    <div
      className={cn(
        "flex items-center gap-3.5 rounded-xl border border-line bg-surface px-4 py-3",
        entry.status === "reversed" && "opacity-50",
      )}
    >
      <Avatar name={view.memberName} className="size-9 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-hi">
          {view.memberName}
          <span className="font-normal text-mid"> · {view.className}</span>
        </p>
        <p className="mt-0.5 truncate text-xs text-low tnum">
          {formatDateTime(view.sessionStartsAt, lang)}
        </p>
        {/* On phones the status chip sits under the name instead of competing
            for the row's width. */}
        <Badge variant={statusVariant} className="mt-1.5 sm:hidden">
          {entry.status === "confirmed"
            ? t("common.confirmed")
            : entry.status === "pending"
              ? t("common.pending")
              : t("txn.status.reversed")}
        </Badge>
      </div>
      <Badge variant={statusVariant} className="hidden shrink-0 sm:inline-flex">
        {entry.status === "confirmed"
          ? t("common.confirmed")
          : entry.status === "pending"
            ? t("common.pending")
            : t("txn.status.reversed")}
      </Badge>
      <span
        className={cn(
          "display shrink-0 text-lg tnum",
          entry.status === "reversed"
            ? "text-low line-through"
            : entry.status === "pending"
              ? "text-warn"
              : "text-good",
        )}
      >
        +{formatEUR(entry.amountEUR, lang)}
      </span>
    </div>
  );
}

function StatementCard({
  month,
  totalEUR,
  count,
}: {
  month: string;
  totalEUR: number;
  count: number;
}) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-2"
      >
        <div className="flex size-9 items-center justify-center rounded-full bg-surface-3 text-mid">
          <FileText className="size-4" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold capitalize text-hi">
            {formatMonth(month, lang)}
          </p>
          <p className="text-xs text-low tnum">
            {t("dashPayouts.attendances", { n: count })}
          </p>
        </div>
        <span className="display text-lg text-hi tnum">
          {formatEUR(totalEUR, lang)}
        </span>
        <ChevronDown
          className={cn(
            "size-4 text-low transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="border-t border-line px-4 py-3 text-xs leading-relaxed text-mid">
          {t("dashPayouts.transparencyNote")}
        </div>
      )}
    </div>
  );
}
