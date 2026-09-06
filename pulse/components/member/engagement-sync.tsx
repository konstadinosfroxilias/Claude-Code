"use client";

import { useEffect, useRef } from "react";
import { translate, useI18n, type TranslationKey } from "@/lib/i18n";
import { useCurrentUser } from "@/lib/hooks/use-session";
import { getServices } from "@/lib/services";
import { fireBrowserNotification } from "@/lib/reminders";
import type { HabitNudge, LanguageCode, LocalizedText } from "@/lib/types";
import { hourBand } from "@/lib/rules/engagement";
import { formatDateTime } from "@/lib/utils";
import { showUnlockToast } from "@/components/member/achievements";

export function weekdayKey(day: number): TranslationKey {
  return `nudge.day.${day}` as TranslationKey;
}

/** Bilingual copy for a nudge, so the in-app feed reads right in either language. */
export function nudgeText(n: HabitNudge): { title: LocalizedText; body: LocalizedText } {
  const build = (lang: LanguageCode) => {
    const titleKey = `nudge.${n.kind}.title` as TranslationKey;
    const bodyKey = `nudge.${n.kind}.body` as TranslationKey;
    const s = n.session;
    const vars: Record<string, string> = s
      ? {
          day: translate(lang, weekdayKey(new Date(s.session.startsAt).getDay())),
          band: translate(
            lang,
            `progress.band.${hourBand(new Date(s.session.startsAt).getHours())}` as TranslationKey,
          ),
          studio: s.studio.name,
          class: s.classType.name,
          time: formatDateTime(s.session.startsAt, lang),
        }
      : {};
    return { title: translate(lang, titleKey), body: translate(lang, bodyKey, vars) };
  };
  const el = build("el");
  const en = build("en");
  return {
    title: { el: el.title, en: en.title },
    body: { el: el.body, en: en.body },
  };
}

/**
 * Mounted once in the member shell. After every service write it:
 *  1. syncs achievements and plays the unlock moment for anything new;
 *  2. if the member opted in to habit nudges, mirrors the week's nudge into
 *     the notification feed (once) and, if browser reminders are on, fires a
 *     Web Notification through the same plumbing class reminders use.
 * Writes only happen when something changed, so the change feed settles.
 */
export function EngagementSync() {
  const { userId } = useCurrentUser();
  const { lang } = useI18n();
  const langRef = useRef(lang);
  useEffect(() => {
    langRef.current = lang;
  }, [lang]);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let running = false;

    const run = async () => {
      if (running) return;
      running = true;
      try {
        const svc = getServices();
        const fresh = await svc.engagement.syncAchievements(userId);
        if (!alive) return;
        fresh.forEach((v, i) => setTimeout(() => showUnlockToast(v), i * 700));

        const prefs = await svc.engagement.getPrefs(userId);
        if (!alive || !prefs.nudgesEnabled) return;
        const nudges = await svc.engagement.getNudges(userId);
        for (const n of nudges) {
          const text = nudgeText(n);
          const delivered = await svc.engagement.markNudgeDelivered(userId, n.id, {
            ...text,
            href: "/member/home",
          });
          if (delivered) {
            fireBrowserNotification(text.title[langRef.current], text.body[langRef.current]);
          }
        }
      } catch {
        // Engagement is decoration on top of the core flows — never surface
        // its failures as errors.
      } finally {
        running = false;
      }
    };

    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(run, 500);
    };
    schedule();
    const unsubscribe = getServices().subscribe(schedule);
    return () => {
      alive = false;
      clearTimeout(timer);
      unsubscribe();
    };
  }, [userId]);

  return null;
}
