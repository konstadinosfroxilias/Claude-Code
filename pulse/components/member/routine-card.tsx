"use client";

import { motion } from "framer-motion";
import { CalendarClock, Repeat } from "lucide-react";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { useLiveQuery } from "@/lib/hooks/use-live-query";
import { hourBand } from "@/lib/rules/engagement";
import type { SessionView } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { weekdayKey } from "@/components/member/engagement-sync";
import { CreditChip } from "@/components/member/bits";
import { Button } from "@/components/ui/button";

/**
 * "Your routine" — the next logical booking, learned from the member's own
 * history. Not a nudge: a standing suggestion on home, bookable in one tap.
 * If the history shows a usual slot we offer that; otherwise a plain rebook
 * of the last class. Nothing here is time-pressured.
 */
export function RoutineCard({
  userId,
  onBook,
}: {
  userId: string;
  onBook: (view: SessionView) => void;
}) {
  const { t, lang } = useI18n();
  const { data: routine } = useLiveQuery(
    (svc) => svc.engagement.getRoutine(userId),
    [userId],
  );
  if (!routine) return null;

  const { session: view, signal, basis } = routine;
  const d = new Date(view.session.startsAt);

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-line bg-surface p-4"
    >
      <div className="flex items-start gap-3.5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-volt/10 text-volt">
          {basis === "usual_slot" ? (
            <CalendarClock className="size-5" />
          ) : (
            <Repeat className="size-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-volt">
            {t("nudge.routineTitle")}
          </p>
          <p className="mt-0.5 text-sm text-mid">
            {basis === "usual_slot" && signal
              ? t("nudge.routineBody", {
                  count: signal.count,
                  day: t(weekdayKey(signal.weekday)),
                  band: t(`progress.band.${hourBand(signal.hour)}` as TranslationKey),
                  studio: view.studio.name,
                })
              : t("nudge.routineLast")}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onBook(view)}
        className="mt-3 flex w-full items-center gap-3 rounded-xl border border-line bg-surface-2 px-3.5 py-3 text-left transition-colors hover:border-volt/40 active:scale-[0.995]"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-hi">{view.classType.name}</p>
          <p className="truncate text-xs text-mid">
            {view.studio.name} · {formatDateTime(d.toISOString(), lang)}
          </p>
        </div>
        <CreditChip cost={view.creditCost} size="sm" />
      </button>

      <Button size="sm" variant="volt" className="mt-3" onClick={() => onBook(view)}>
        <Repeat /> {t("nudge.rebook")}
      </Button>
    </motion.section>
  );
}
