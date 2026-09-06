"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Image as ImageIcon, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { APP_NAME } from "@/lib/config";
import { useI18n } from "@/lib/i18n";
import { useLiveQuery } from "@/lib/hooks/use-live-query";
import { renderRecapImage, shareOrDownloadImage } from "@/lib/share/recap-image";
import type { WeeklyRecap } from "@/lib/types";
import { cn, formatDay } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * "Your week in movement" — shareable as an image or plain text, both built
 * on the device. Counts classes, minutes and variety; nothing about bodies.
 */
export function RecapCard({ userId, className }: { userId: string; className?: string }) {
  const { t, lang, pick } = useI18n();
  const [busy, setBusy] = useState<"image" | "text" | null>(null);
  const { data: recap, loading } = useLiveQuery(
    (svc) => svc.engagement.getWeeklyRecap(userId),
    [userId],
  );
  const { data: categories } = useLiveQuery(
    (svc) => svc.catalog.listCategories(),
    [],
  );

  if (loading || !recap) return <Skeleton className={cn("h-48", className)} />;

  const scopeLabel = recap.scope === "current" ? t("progress.recapCurrent") : t("progress.recapLast");
  const weekLabel = `${scopeLabel} · ${formatDay(recap.weekStart, lang)} – ${formatDay(
    new Date(new Date(recap.weekEnd).getTime() - 1).toISOString(),
    lang,
  )}`;
  const classesLabel =
    recap.attended === 1 ? t("progress.recapClassesOne") : t("progress.recapClasses", { n: recap.attended });
  const categoriesLabel =
    recap.categoryIds.length === 1
      ? t("progress.recapCategoriesOne")
      : t("progress.recapCategories", { n: recap.categoryIds.length });
  const shareText = t("progress.shareText", {
    classes: recap.attended,
    minutes: recap.minutes,
    categories: recap.categoryIds.length,
  });

  const shareImage = async () => {
    setBusy("image");
    try {
      const blob = await renderRecapImage({
        brand: APP_NAME,
        heading: t("progress.recapTitle"),
        weekLabel,
        stats: [
          { value: String(recap.attended), label: classesLabel.replace(/^\d+\s*/, "") },
          { value: String(recap.minutes), label: t("progress.recapMinutes", { n: "" }).trim() },
          { value: String(recap.categoryIds.length), label: categoriesLabel.replace(/^\d+\s*/, "") },
          ...(recap.streakWeeks > 0
            ? [{ value: String(recap.streakWeeks), label: t("progress.recapStreak", { n: "" }).replace(/^[-\s]+/, "").trim() }]
            : []),
        ],
        footnote: recap.firstTimeStudio
          ? t("progress.recapFirstTime", { studio: recap.firstTimeStudio })
          : recap.met
            ? t("progress.recapGoalMet")
            : undefined,
      });
      const outcome = await shareOrDownloadImage(blob, "pulse-week.png", shareText);
      toast.success(outcome === "shared" ? t("progress.shared") : t("progress.imageSaved"));
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) toast.error(t("common.retry"));
    } finally {
      setBusy(null);
    }
  };

  const copyText = async () => {
    setBusy("text");
    try {
      await navigator.clipboard.writeText(shareText);
      toast.success(t("progress.copied"));
    } catch {
      toast(shareText);
    } finally {
      setBusy(null);
    }
  };

  const empty = recap.attended === 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative overflow-hidden rounded-lg border border-line bg-surface p-5",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-volt/12 blur-3xl"
      />
      <p className="text-[11px] font-semibold uppercase tracking-wider text-volt">
        {weekLabel}
      </p>
      <h2 className="display mt-1 text-xl text-hi">{t("progress.recapTitle")}</h2>

      {empty ? (
        <p className="mt-3 text-sm text-mid">{t("progress.recapEmpty")}</p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <RecapStat value={recap.attended} label={classesLabel.replace(/^\d+\s*/, "")} />
            <RecapStat value={recap.minutes} label={t("progress.recapMinutes", { n: "" }).trim()} />
            <RecapStat
              value={recap.categoryIds.length}
              label={categoriesLabel.replace(/^\d+\s*/, "")}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {recap.categoryIds.map((id) => {
              const c = categories?.find((x) => x.id === id);
              return (
                <span key={id} className="rounded-full bg-surface-3 px-2.5 py-1 text-[11px] text-mid">
                  {c ? pick(c.name) : id}
                </span>
              );
            })}
            {recap.firstTimeStudio && (
              <span className="inline-flex items-center gap-1 rounded-full border border-volt/30 bg-volt/10 px-2.5 py-1 text-[11px] text-volt">
                <Sparkles className="size-3" />
                {t("progress.recapFirstTime", { studio: recap.firstTimeStudio })}
              </span>
            )}
          </div>
          <p className="mt-3 text-xs text-mid">
            {recap.met
              ? t("progress.recapGoalMet")
              : t("progress.recapGoalOpen", { done: recap.attended, target: recap.target })}
            {recap.streakWeeks > 0 && ` · ${t("progress.recapStreak", { n: recap.streakWeeks })}`}
          </p>
        </>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="volt" loading={busy === "image"} onClick={shareImage}>
          <ImageIcon /> {t("progress.shareImage")}
        </Button>
        <Button size="sm" variant="surface" loading={busy === "text"} onClick={copyText}>
          <Copy /> {t("progress.copyText")}
        </Button>
      </div>
    </motion.section>
  );
}

function RecapStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface-2 p-3">
      <p className="display text-2xl text-hi tnum">{value}</p>
      <p className="mt-0.5 text-[11px] leading-snug text-low">{label}</p>
    </div>
  );
}
