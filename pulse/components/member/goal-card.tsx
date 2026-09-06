"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CalendarCheck, Flame, Leaf, Pencil, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { useLiveQuery } from "@/lib/hooks/use-live-query";
import { useEngagementUi } from "@/lib/stores/engagement";
import { weekKey } from "@/lib/rules/engagement";
import type { StreakStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { GoalRing } from "@/components/member/goal-ring";
import { GoalEditorDialog } from "@/components/member/goal-editor";
import { Skeleton } from "@/components/ui/skeleton";

/** Streak copy by state — every branch is warm; none of them is a failure. */
export function StreakLine({
  streak,
  className,
}: {
  streak: StreakStatus;
  className?: string;
}) {
  const { t } = useI18n();
  const Icon = streak.state === "rested" ? Leaf : Flame;
  const text =
    streak.state === "on_track"
      ? streak.weeks <= 1
        ? t("streak.on_trackOne")
        : t("streak.on_track", { n: streak.weeks })
      : streak.state === "building"
        ? t("streak.building", { n: streak.weeks })
        : streak.state === "rested"
          ? t("streak.rested", { n: streak.weeks })
          : t("streak.fresh_start");
  return (
    <p className={cn("flex items-start gap-1.5 text-xs leading-relaxed text-mid", className)}>
      <Icon
        className={cn(
          "mt-0.5 size-3.5 shrink-0",
          streak.state === "on_track" ? "text-volt" : "text-low",
        )}
      />
      <span>{text}</span>
    </p>
  );
}

/**
 * Weekly goal card — the first thing on home after the greeting. Shows
 * "2 of 3 this week", the streak, and a warm one-time celebration when the
 * goal is met. Never a countdown, never a warning.
 */
export function GoalCard({
  userId,
  className,
  showProgressLink = true,
}: {
  userId: string;
  className?: string;
  showProgressLink?: boolean;
}) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const celebrated = useEngagementUi((s) => s.celebratedWeeks);
  const markCelebrated = useEngagementUi((s) => s.markCelebrated);

  const { data: summary, loading } = useLiveQuery(
    (svc) => svc.engagement.getSummary(userId),
    [userId],
  );

  // One celebration per week, per device — and only the moment it's met.
  const met = summary?.progress.met ?? false;
  const target = summary?.progress.target ?? 0;
  useEffect(() => {
    if (!met) return;
    const key = weekKey(new Date());
    if (celebrated.includes(key)) return;
    markCelebrated(key);
    toast.success(t("goal.celebrateTitle"), {
      description: t("goal.celebrateBody", { target }),
      duration: 7000,
      icon: <Sparkles className="size-4 text-volt" />,
    });
  }, [met, target, celebrated, markCelebrated, t]);

  if (loading || !summary) {
    return <Skeleton className={cn("h-32", className)} />;
  }

  const { progress, streak, goal } = summary;
  const remaining = Math.max(0, progress.target - progress.attended);

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "relative overflow-hidden rounded-lg border p-4",
          progress.met
            ? "border-volt/35 bg-gradient-to-br from-volt/14 via-surface to-surface"
            : "border-line bg-surface",
          className,
        )}
      >
        <div className="flex items-center gap-4">
          <GoalRing done={progress.attended} target={progress.target} size={92}>
            <div className="text-center">
              <p className="display text-xl leading-none text-hi tnum">
                {progress.attended}
                <span className="text-sm text-low">/{progress.target}</span>
              </p>
            </div>
          </GoalRing>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-volt">
              {t("goal.title")}
            </p>
            <p className="display mt-0.5 text-lg leading-tight text-hi">
              {progress.met
                ? t("goal.metTitle")
                : t("goal.progress", {
                    done: progress.attended,
                    target: progress.target,
                  })}
            </p>
            <p className="mt-1 text-xs text-mid">
              {progress.met
                ? t("goal.metBody", { target: progress.target })
                : remaining === 1
                  ? t("goal.remainingOne")
                  : t("goal.remaining", { n: remaining })}
              {!progress.met && progress.planned > 0 && (
                <>
                  {" · "}
                  <span className="inline-flex items-center gap-1 text-hi">
                    <CalendarCheck className="size-3" />
                    {t("goal.planned", { n: progress.planned })}
                  </span>
                </>
              )}
            </p>
            <StreakLine streak={streak} className="mt-2" />
          </div>
        </div>

        {/*
          These two wrap onto separate lines at phone width, so they need real
          height rather than overlapping `.tap` bands — two 44px pseudo-element
          areas stacked on top of each other steal each other's taps.
        */}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 border-t border-line/70 pt-1 sm:mt-3 sm:pt-3">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex min-h-11 items-center gap-1.5 text-xs font-medium text-mid transition-colors hover:text-hi sm:min-h-0"
          >
            <Pencil className="size-3" />
            {t("goal.edit")} · {t("goal.perWeek", { n: goal.weeklyTarget })}
          </button>
          {showProgressLink && (
            <Link
              href="/member/progress"
              className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-volt hover:text-volt-bright sm:min-h-0"
            >
              {t("progress.viewAll")} <ArrowRight className="size-3" />
            </Link>
          )}
        </div>
      </motion.section>

      <GoalEditorDialog
        userId={userId}
        open={editing}
        current={goal.weeklyTarget}
        onClose={() => setEditing(false)}
      />
    </>
  );
}
