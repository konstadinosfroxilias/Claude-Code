"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  Dumbbell,
  Flame,
  MapPinned,
  Trophy,
  Zap,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useCurrentUser } from "@/lib/hooks/use-session";
import { useLiveQuery } from "@/lib/hooks/use-live-query";
import { formatDay } from "@/lib/utils";
import { Avatar } from "@/components/shared/avatar";
import { GoalCard } from "@/components/member/goal-card";
import { AchievementsSection } from "@/components/member/achievements";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function ProfilePage() {
  const { t, pick, lang } = useI18n();
  const { user, userId } = useCurrentUser();

  const { data: stats, loading } = useLiveQuery(
    (svc) =>
      userId ? svc.analytics.getMemberStats(userId) : Promise.resolve(null),
    [userId],
  );
  const { data: categories } = useLiveQuery(
    (svc) => svc.catalog.listCategories(),
    [],
  );

  const favCat = categories?.find((c) => c.id === stats?.favoriteCategoryId);

  const tiles = [
    {
      icon: CalendarDays,
      label: t("profile.classesThisMonth"),
      value: stats?.classesThisMonth ?? 0,
      accent: true,
    },
    {
      icon: Flame,
      label: t("profile.streak"),
      value: stats ? t("profile.weeks", { n: stats.streakWeeks }) : "–",
      accent: false,
    },
    {
      icon: Dumbbell,
      label: t("profile.totalClasses"),
      value: stats?.totalClasses ?? 0,
      accent: false,
    },
    {
      icon: MapPinned,
      label: t("profile.studiosVisited"),
      value: stats?.studiosVisited ?? 0,
      accent: false,
    },
    {
      icon: Zap,
      label: t("profile.creditsUsed"),
      value: stats?.creditsSpentThisCycle ?? 0,
      accent: false,
    },
    {
      icon: Activity,
      label: t("profile.favoriteCategory"),
      value: favCat ? pick(favCat.name) : "–",
      accent: false,
      wide: true,
    },
  ];

  return (
    <div className="mx-auto max-w-2xl">
      {/* Identity */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <Avatar name={user?.name ?? "?"} className="size-16 text-lg" />
        <div>
          <h1 className="display text-2xl text-hi">{user?.name}</h1>
          <p className="text-sm text-mid">{user?.email}</p>
          {user && (
            <Badge variant="outline" className="mt-1.5">
              {t("profile.memberSince", {
                date: formatDay(user.memberSince, lang),
              })}
            </Badge>
          )}
        </div>
      </motion.div>

      {/* Weekly goal + streak — adjustable right here */}
      {userId && (
        <div className="mt-6">
          <GoalCard userId={userId} />
        </div>
      )}

      {/* Activity grid */}
      <h2 className="display mb-3 mt-8 text-lg text-hi">
        {t("profile.activity")}
      </h2>
      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.06 } },
          }}
          className="grid grid-cols-2 gap-3 sm:grid-cols-3"
        >
          {tiles.map((tile) => (
            <motion.div
              key={tile.label}
              variants={{
                hidden: { opacity: 0, y: 14, scale: 0.97 },
                show: { opacity: 1, y: 0, scale: 1 },
              }}
              className={
                tile.accent
                  ? "rounded-lg border border-volt/30 bg-gradient-to-br from-volt/15 to-transparent p-4"
                  : "rounded-lg border border-line bg-surface p-4"
              }
            >
              <tile.icon
                className={
                  tile.accent ? "size-4.5 text-volt" : "size-4.5 text-low"
                }
              />
              <p className="display mt-3 truncate text-2xl text-hi tnum">
                {tile.value}
              </p>
              <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-low">
                {tile.label}
              </p>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Achievements — unlocked first, then a gentle "next up" */}
      {userId && (
        <section className="mt-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="display flex items-center gap-2 text-lg text-hi">
              <Trophy className="size-4.5 text-volt" /> {t("achievements.title")}
            </h2>
            <Link
              href="/member/progress"
              className="inline-flex h-11 items-center gap-1 text-sm font-medium text-volt hover:text-volt-bright sm:h-auto"
            >
              {t("progress.viewAll")} <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <AchievementsSection userId={userId} />
        </section>
      )}
    </div>
  );
}
