"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlarmClock, Bell, BellOff, X } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { useLiveQuery } from "@/lib/hooks/use-live-query";
import { useMounted } from "@/lib/hooks/use-session";
import {
  notificationPermission,
  requestNotificationPermission,
  useReminderStore,
} from "@/lib/reminders";
import { formatDateTime, relativeParts } from "@/lib/utils";
import { AddToCalendar } from "@/components/member/add-to-calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Reminder surface: the classes coming up, plus the opt-in primer for
 * browser notifications. Sits above the notification feed.
 */
export function RemindersPanel({ userId }: { userId: string }) {
  const { t, lang } = useI18n();
  const mounted = useMounted();
  const optedIn = useReminderStore((s) => s.optedIn);
  const primerDismissed = useReminderStore((s) => s.primerDismissed);
  const setOptedIn = useReminderStore((s) => s.setOptedIn);
  const dismissPrimer = useReminderStore((s) => s.dismissPrimer);
  const [busy, setBusy] = useState(false);

  const { data: bookings } = useLiveQuery(
    (svc) => svc.booking.listMyBookings(userId),
    [userId],
  );

  const upcoming = useMemo(() => {
    const now = Date.now();
    return (bookings ?? [])
      .filter(
        (b) =>
          b.booking.status === "reserved" &&
          new Date(b.session.startsAt).getTime() > now,
      )
      .sort((a, b) => a.session.startsAt.localeCompare(b.session.startsAt))
      .slice(0, 4);
  }, [bookings]);

  const permission = mounted ? notificationPermission() : "default";
  const showPrimer =
    mounted && !optedIn && !primerDismissed && permission !== "unsupported";

  const enable = async () => {
    setBusy(true);
    try {
      const result = await requestNotificationPermission();
      if (result === "granted") {
        setOptedIn(true);
        toast.success(t("reminder.optInOn"));
      } else if (result === "denied") {
        dismissPrimer();
        toast(t("reminder.optInBlocked"));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mb-6">
      <h2 className="display mb-3 flex items-center gap-2 text-lg text-hi">
        <AlarmClock className="size-4.5 text-volt" />
        {t("reminder.title")}
      </h2>

      {/* Opt-in primer — the native prompt only fires from "Enable" */}
      {showPrimer && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mb-3 flex gap-3.5 rounded-lg border border-line bg-surface p-4"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-volt/10 text-volt">
            <Bell className="size-5" />
          </div>
          <div className="min-w-0 flex-1 pr-6">
            <p className="text-sm font-semibold text-hi">
              {t("reminder.optInTitle")}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-mid">
              {t("reminder.optInBody")}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="volt" loading={busy} onClick={enable}>
                {t("reminder.optInEnable")}
              </Button>
              <Button size="sm" variant="ghost" onClick={dismissPrimer}>
                {t("reminder.optInNotNow")}
              </Button>
            </div>
          </div>
          <button
            type="button"
            onClick={dismissPrimer}
            aria-label={t("reminder.optInNotNow")}
            className="absolute right-1 top-1 flex size-11 items-center justify-center rounded-lg text-low transition-colors hover:bg-surface-2 hover:text-hi sm:right-2 sm:top-2 sm:size-9"
          >
            <X className="size-4" />
          </button>
        </motion.div>
      )}

      {mounted && optedIn && permission === "granted" && (
        <p className="mb-3 flex items-center gap-1.5 text-xs text-good">
          <Bell className="size-3.5" /> {t("reminder.optInOn")}
        </p>
      )}

      {upcoming.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-line-strong bg-surface/50 px-4 py-5 text-sm">
          <BellOff className="size-4 shrink-0 text-low" />
          <div>
            <p className="font-medium text-mid">{t("reminder.none")}</p>
            <p className="text-xs text-low">{t("reminder.noneHint")}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {upcoming.map((view) => {
            const rel = relativeParts(view.session.startsAt);
            const label =
              rel.days > 0
                ? `${rel.days}${t("common.days")}`
                : rel.hours > 0
                  ? `${rel.hours}${t("common.hours")}`
                  : `${Math.max(1, rel.minutes)}${t("common.minutes")}`;
            return (
              <div
                key={view.booking.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-hi">
                    {view.classType.name}
                    <span className="font-normal text-mid">
                      {" "}
                      · {view.studio.name}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-low tnum">
                    {formatDateTime(view.session.startsAt, lang)}
                  </p>
                </div>
                <Badge variant="volt">
                  {t("common.in")} {label}
                </Badge>
                <AddToCalendar view={view} />
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-3 text-xs text-low">{t("reminder.tabOnlyNote")}</p>
    </section>
  );
}
