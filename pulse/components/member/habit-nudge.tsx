"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { BellOff, CalendarClock, Leaf, Repeat, Sparkles, Wind, X } from "lucide-react";
import { toast } from "sonner";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { useLiveQuery } from "@/lib/hooks/use-live-query";
import { useMounted } from "@/lib/hooks/use-session";
import { getServices } from "@/lib/services";
import { useEngagementUi } from "@/lib/stores/engagement";
import { hourBand, NUDGE_MUTE_DAYS } from "@/lib/rules/engagement";
import type { HabitNudge, NudgeKind, SessionView } from "@/lib/types";
import { addDays, cn, formatDateTime, formatDay } from "@/lib/utils";
import { weekdayKey } from "@/components/member/engagement-sync";
import { CreditChip } from "@/components/member/bits";
import { Button } from "@/components/ui/button";

const KIND_ICON: Record<NudgeKind, typeof Sparkles> = {
  usual_slot: CalendarClock,
  rebook_last: Repeat,
  been_a_while: Wind,
  ease_off: Leaf,
};

/**
 * Soft primer for habit nudges — same pattern as location and reminders:
 * explain, ask, remember "not now". Nothing is on until the member says so.
 */
export function NudgePrimer({ userId }: { userId: string }) {
  const { t } = useI18n();
  const mounted = useMounted();
  const dismissed = useEngagementUi((s) => s.nudgePrimerDismissed);
  const dismiss = useEngagementUi((s) => s.dismissNudgePrimer);
  const [busy, setBusy] = useState(false);
  const { data: prefs } = useLiveQuery(
    (svc) => svc.engagement.getPrefs(userId),
    [userId],
  );

  const show = mounted && prefs && !prefs.nudgesEnabled && !dismissed;

  const enable = async () => {
    setBusy(true);
    try {
      await getServices().engagement.setPrefs(userId, { nudgesEnabled: true });
      toast.success(t("nudge.enabled"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="relative flex gap-3.5 rounded-lg border border-line bg-surface p-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-volt/10 text-volt">
              <Sparkles className="size-5" />
            </div>
            <div className="min-w-0 flex-1 pr-6">
              <p className="text-sm font-semibold text-hi">{t("nudge.primerTitle")}</p>
              <p className="mt-1 text-xs leading-relaxed text-mid">{t("nudge.primerBody")}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="volt" loading={busy} onClick={enable}>
                  {t("nudge.enable")}
                </Button>
                <Button size="sm" variant="ghost" onClick={dismiss}>
                  {t("nudge.notNow")}
                </Button>
              </div>
            </div>
            <button
              type="button"
              onClick={dismiss}
              aria-label={t("nudge.notNow")}
              className="absolute right-1 top-1 flex size-11 items-center justify-center rounded-lg text-low transition-colors hover:bg-surface-2 hover:text-hi sm:right-2 sm:top-2 sm:size-9"
            >
              <X className="size-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** The nudge to show right now, if the member opted in and hasn't waved it away. */
export function useActiveNudge(userId: string): HabitNudge | undefined {
  const dismissedIds = useEngagementUi((s) => s.dismissedNudgeIds);
  const { data: prefs } = useLiveQuery(
    (svc) => svc.engagement.getPrefs(userId),
    [userId],
  );
  const { data: nudges } = useLiveQuery(
    (svc) => svc.engagement.getNudges(userId),
    [userId],
  );
  if (!prefs?.nudgesEnabled) return undefined;
  return (nudges ?? []).find((n) => !dismissedIds.includes(n.id));
}

/**
 * The one nudge for this week (if any). Rebook is a single tap into the
 * booking sheet; "mute for 2 weeks" is always one tap away.
 */
export function NudgeCard({
  userId,
  onBook,
}: {
  userId: string;
  onBook: (view: SessionView) => void;
}) {
  const { t, lang } = useI18n();
  const dismissNudge = useEngagementUi((s) => s.dismissNudge);
  const [muting, setMuting] = useState(false);
  const nudge = useActiveNudge(userId);
  if (!nudge) return null;

  const mute = async () => {
    setMuting(true);
    try {
      await getServices().engagement.setPrefs(userId, {
        nudgesMutedUntil: addDays(new Date(), NUDGE_MUTE_DAYS).toISOString(),
      });
      toast(t("nudge.mutedToast"));
    } finally {
      setMuting(false);
    }
  };

  const Icon = KIND_ICON[nudge.kind];
  const s = nudge.session;
  const vars: Record<string, string> = s
    ? {
        day: t(weekdayKey(new Date(s.session.startsAt).getDay())),
        band: t(`progress.band.${hourBand(new Date(s.session.startsAt).getHours())}` as TranslationKey),
        studio: s.studio.name,
        class: s.classType.name,
        time: formatDateTime(s.session.startsAt, lang),
      }
    : {};
  const calm = nudge.kind === "ease_off";

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative rounded-lg border p-4",
        calm ? "border-good/30 bg-good/6" : "border-line bg-surface",
      )}
    >
      <div className="flex gap-3.5">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            calm ? "bg-good/15 text-good" : "bg-volt/10 text-volt",
          )}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1 pr-6">
          <p className="text-sm font-semibold text-hi">
            {t(`nudge.${nudge.kind}.title` as TranslationKey)}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-mid">
            {t(`nudge.${nudge.kind}.body` as TranslationKey, vars)}
          </p>

          {s && (
            <button
              type="button"
              onClick={() => onBook(s)}
              className="mt-3 flex w-full items-center gap-3 rounded-xl border border-line bg-surface-2 px-3.5 py-3 text-left transition-colors hover:border-volt/40"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-hi">{s.classType.name}</p>
                <p className="truncate text-xs text-mid">
                  {s.studio.name} · {formatDateTime(s.session.startsAt, lang)}
                </p>
              </div>
              <CreditChip cost={s.creditCost} size="sm" />
            </button>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {s ? (
              <Button size="sm" variant="volt" onClick={() => onBook(s)}>
                <Repeat /> {t("nudge.rebookCta")}
              </Button>
            ) : nudge.kind === "been_a_while" ? (
              <Button asChild size="sm" variant="volt">
                <Link href="/member/explore?today=1">{t("nudge.explore")}</Link>
              </Button>
            ) : null}
            <Button size="sm" variant="ghost" loading={muting} onClick={mute}>
              <BellOff /> {t("nudge.mute")}
            </Button>
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => dismissNudge(nudge.id)}
        aria-label={t("nudge.dismiss")}
        className="absolute right-1 top-1 flex size-11 items-center justify-center rounded-lg text-low transition-colors hover:bg-surface-2 hover:text-hi sm:right-2 sm:top-2 sm:size-9"
      >
        <X className="size-4" />
      </button>
    </motion.section>
  );
}

/** Settings row: the on/off switch plus the mute state, in words. */
export function nudgeMutedLabel(
  mutedUntil: string | undefined,
  lang: "el" | "en",
  t: (k: TranslationKey, v?: Record<string, string | number>) => string,
): string | null {
  if (!mutedUntil) return null;
  if (new Date(mutedUntil).getTime() <= Date.now()) return null;
  return t("nudge.muted", { date: formatDay(mutedUntil, lang) });
}
