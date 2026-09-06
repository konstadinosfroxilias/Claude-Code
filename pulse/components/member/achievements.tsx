"use client";

import { motion } from "framer-motion";
import {
  CalendarCheck2,
  CalendarRange,
  Compass,
  Dumbbell,
  Footprints,
  Lock,
  MapPinned,
  Medal,
  ScanLine,
  Shapes,
  Sunrise,
  Target,
  Trophy,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { useLiveQuery } from "@/lib/hooks/use-live-query";
import type { AchievementGroup, AchievementId, AchievementView } from "@/lib/types";
import { cn, formatDay } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export const ACHIEVEMENT_ICON: Record<AchievementId, typeof Trophy> = {
  first_booking: CalendarCheck2,
  first_checkin: ScanLine,
  classes_5: Footprints,
  classes_10: Dumbbell,
  classes_25: Medal,
  classes_50: Trophy,
  goal_week: Target,
  goal_month: CalendarRange,
  three_categories: Shapes,
  new_neighborhood: MapPinned,
  explorer_5: Compass,
  early_bird: Sunrise,
  comeback: Undo2,
};

const GROUPS: AchievementGroup[] = ["start", "consistency", "variety", "moments"];

export function achievementTitleKey(id: AchievementId): TranslationKey {
  return `achievements.${id}.title` as TranslationKey;
}
export function achievementBodyKey(id: AchievementId): TranslationKey {
  return `achievements.${id}.body` as TranslationKey;
}

/** A single badge tile — unlocked (volt) or a gentle "next up" (dimmed, with progress). */
export function AchievementTile({
  view,
  compact,
}: {
  view: AchievementView;
  compact?: boolean;
}) {
  const { t, lang } = useI18n();
  const { achievement, unlockedAt, progress } = view;
  const Icon = ACHIEVEMENT_ICON[achievement.id];
  const unlocked = !!unlockedAt;
  const target = achievement.target;

  return (
    <div
      className={cn(
        "relative flex gap-3 rounded-xl border p-3.5",
        unlocked
          ? "border-volt/30 bg-gradient-to-br from-volt/12 to-transparent"
          : "border-line bg-surface",
      )}
    >
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl",
          unlocked ? "bg-volt text-volt-ink shadow-volt" : "bg-surface-3 text-low",
        )}
      >
        {unlocked ? <Icon className="size-5" /> : <Lock className="size-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-semibold", unlocked ? "text-hi" : "text-mid")}>
          {t(achievementTitleKey(achievement.id))}
        </p>
        {!compact && (
          <p className="mt-0.5 text-xs leading-relaxed text-low">
            {t(achievementBodyKey(achievement.id))}
          </p>
        )}
        {unlocked ? (
          <p className="mt-1 text-[11px] text-volt">
            {t("achievements.unlockedOn", { date: formatDay(unlockedAt, lang) })}
          </p>
        ) : target && target > 1 ? (
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
              <div
                className="h-full rounded-full bg-mid/70"
                style={{ width: `${Math.round((progress / target) * 100)}%` }}
              />
            </div>
            <span className="text-[11px] text-low tnum">
              {t("achievements.progress", { done: progress, target })}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Profile section: unlocked badges first, then a short "next up" list — the
 * closest locked ones, framed as what's ahead rather than what's missing.
 */
export function AchievementsSection({
  userId,
  limitNextUp = 3,
  grouped = false,
}: {
  userId: string;
  limitNextUp?: number;
  grouped?: boolean;
}) {
  const { t } = useI18n();
  const { data, loading } = useLiveQuery(
    (svc) => svc.engagement.listAchievements(userId),
    [userId],
  );

  if (loading || !data) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  const unlocked = data.filter((v) => v.unlockedAt);
  const locked = data.filter((v) => !v.unlockedAt);
  // "Next up": closest to done first, then catalog order.
  const nextUp = [...locked]
    .sort((a, b) => {
      const ra = a.achievement.target ? a.progress / a.achievement.target : 0;
      const rb = b.achievement.target ? b.progress / b.achievement.target : 0;
      return rb - ra || a.achievement.order - b.achievement.order;
    })
    .slice(0, limitNextUp);

  if (grouped) {
    return (
      <div className="space-y-6">
        {GROUPS.map((g) => {
          const items = data.filter((v) => v.achievement.group === g);
          if (items.length === 0) return null;
          return (
            <div key={g}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-low">
                {t(`achievements.group.${g}` as TranslationKey)}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((v) => (
                  <AchievementTile key={v.achievement.id} view={v} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-xs text-low">
        {t("achievements.count", { n: unlocked.length, total: data.length })}
      </p>
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
        className="grid gap-3 sm:grid-cols-2"
      >
        {unlocked.map((v) => (
          <motion.div
            key={v.achievement.id}
            variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
          >
            <AchievementTile view={v} compact />
          </motion.div>
        ))}
      </motion.div>
      {nextUp.length > 0 && (
        <>
          <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-low">
            {t("achievements.nextUp")}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {nextUp.map((v) => (
              <AchievementTile key={v.achievement.id} view={v} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** The unlock moment: a quiet, premium toast — no confetti, no sound. */
function UnlockToast({ view }: { view: AchievementView }) {
  const { t } = useI18n();
  const Icon = ACHIEVEMENT_ICON[view.achievement.id];
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="flex w-[340px] max-w-[92vw] items-center gap-3.5 rounded-2xl border border-volt/35 bg-surface-2 p-3.5 shadow-pop"
    >
      <motion.div
        initial={{ rotate: -12, scale: 0.6 }}
        animate={{ rotate: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 14, delay: 0.1 }}
        className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-volt text-volt-ink shadow-volt"
      >
        <Icon className="size-5" />
      </motion.div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-volt">
          {t("achievements.unlockToast")}
        </p>
        <p className="truncate text-sm font-semibold text-hi">
          {t(achievementTitleKey(view.achievement.id))}
        </p>
        <p className="text-xs text-mid">{t(achievementBodyKey(view.achievement.id))}</p>
      </div>
    </motion.div>
  );
}

export function showUnlockToast(view: AchievementView): void {
  toast.custom(() => <UnlockToast view={view} />, { duration: 6500 });
}
