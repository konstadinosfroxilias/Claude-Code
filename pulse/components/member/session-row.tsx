"use client";

import { Clock, Users } from "lucide-react";
import type { SessionView } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import { formatTime } from "@/lib/utils";
import { CreditChip, PeakBadge } from "@/components/member/bits";
import { cn } from "@/lib/utils";

/** One bookable slot — used in studio schedules and "available today". */
export function SessionRow({
  view,
  onBook,
  showStudio,
  className,
}: {
  view: SessionView;
  onBook: (view: SessionView) => void;
  showStudio?: boolean;
  className?: string;
}) {
  const { t, lang } = useI18n();
  const { session, classType, studio, creditCost, spotsLeft } = view;
  const full = spotsLeft <= 0;
  const past = new Date(session.startsAt).getTime() <= Date.now();
  const disabled = full || past;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onBook(view)}
      className={cn(
        "group flex w-full items-center gap-4 rounded-xl border border-line bg-surface-2 px-4 py-3 text-left transition-all",
        disabled
          ? "opacity-50"
          : "hover:border-volt/40 hover:bg-surface-3 active:scale-[0.995]",
        className,
      )}
    >
      <div className="w-14 shrink-0">
        <p className="display text-base text-hi tnum">
          {formatTime(session.startsAt, lang)}
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-low tnum">
          <Clock className="size-3" />
          {session.durationMin}&#8217;
        </p>
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-hi">
          {showStudio ? studio.name : classType.name}
        </p>
        <p className="mt-0.5 truncate text-xs text-mid">
          {showStudio ? classType.name : session.instructor}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <PeakBadge peak={session.peak} />
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[11px] tnum",
              full ? "text-bad" : spotsLeft <= 2 ? "text-warn" : "text-low",
            )}
          >
            <Users className="size-3" />
            {full ? t("common.full") : t("common.spotsLeft", { n: spotsLeft })}
          </span>
        </div>
      </div>

      <CreditChip
        cost={creditCost}
        className={cn(!disabled && "transition-transform group-hover:scale-105")}
      />
    </button>
  );
}
