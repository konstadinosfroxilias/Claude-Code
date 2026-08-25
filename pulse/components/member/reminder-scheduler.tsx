"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { useLiveQuery } from "@/lib/hooks/use-live-query";
import { useCurrentUser } from "@/lib/hooks/use-session";
import {
  fireBrowserNotification,
  REMINDER_LEAD_MINUTES,
  useReminderStore,
} from "@/lib/reminders";

/**
 * Schedules in-tab reminders for every upcoming booking.
 *
 * Mounted once in the member shell. Timers only live as long as the tab does
 * — see lib/reminders for the documented production-push seam.
 */
export function ReminderScheduler() {
  const { t } = useI18n();
  const { userId } = useCurrentUser();
  const markFired = useReminderStore((s) => s.markFired);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const { data: bookings } = useLiveQuery(
    (svc) =>
      userId ? svc.booking.listMyBookings(userId) : Promise.resolve([]),
    [userId],
  );

  useEffect(() => {
    // Reset timers whenever the booking set changes.
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (!bookings) return;

    const now = Date.now();
    for (const view of bookings) {
      if (view.booking.status !== "reserved") continue;
      const start = new Date(view.session.startsAt).getTime();
      if (start <= now) continue;

      for (const lead of REMINDER_LEAD_MINUTES) {
        const fireAt = start - lead * 60_000;
        const delay = fireAt - now;
        // Only schedule what's still ahead and within this tab's plausible
        // lifetime (setTimeout maxes out around 24.8 days anyway).
        if (delay <= 0 || delay > 24 * 3_600_000) continue;

        const key = `${view.booking.id}:${lead}`;
        if (useReminderStore.getState().fired.includes(key)) continue;

        const id = setTimeout(() => {
          // Re-check at fire time too: an effect re-run can arm a second
          // timer for the same key before the first one has fired.
          if (useReminderStore.getState().fired.includes(key)) return;
          const title =
            lead === 30 ? t("reminder.in30m", {
              class: view.classType.name,
              studio: view.studio.name,
            }) : t("reminder.in2h", {
              class: view.classType.name,
              studio: view.studio.name,
            });
          toast(title, { duration: 10_000 });
          fireBrowserNotification(t("reminder.title"), title);
          markFired(key);
        }, delay);
        timers.current.push(id);
      }
    }

    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [bookings, t, markFired]);

  return null;
}
