"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * In-app class reminders.
 *
 * WHAT IS REAL HERE: while a PULSE tab is open we schedule setTimeout timers
 * for each upcoming booking and fire an in-app banner — and, if the member
 * opted in, a Web Notification.
 *
 * WHAT IS NOT: this cannot wake a closed tab or a backgrounded phone. True
 * background delivery needs a Service Worker + Web Push (VAPID) and a server
 * to hold subscriptions and send at the right moment.
 *
 * ────────────────────────────────────────────────────────────────────────
 * TODO(production push) — the seam:
 *   1. Register a service worker (public/sw.js) and subscribe the member via
 *      `registration.pushManager.subscribe({ userVisibleOnly: true,
 *      applicationServerKey: <VAPID public key> })`.
 *   2. Send that PushSubscription to the backend through a new service
 *      method, e.g. `NotificationService.registerPushSubscription(userId,
 *      sub)` in lib/services/types.ts — the mock can no-op.
 *   3. Server-side: when a booking is created, enqueue jobs at start-2h and
 *      start-30m; on cancellation/promotion, reschedule. Deliver with
 *      web-push to the stored subscription.
 *   4. Keep the timers below as the in-tab fallback so the demo (and desktop
 *      users with the tab open) still get reminders without a backend.
 * ────────────────────────────────────────────────────────────────────────
 */

/** Lead times, in minutes before class start. */
export const REMINDER_LEAD_MINUTES = [120, 30] as const;

export type NotifyPermission = "default" | "granted" | "denied" | "unsupported";

interface ReminderState {
  /** Member opted in to browser notifications via the soft primer. */
  optedIn: boolean;
  /** Set when they dismissed the primer with "Not now". */
  primerDismissed: boolean;
  /** bookingId:leadMinutes keys already fired (so a re-render can't repeat). */
  fired: string[];
  setOptedIn: (v: boolean) => void;
  dismissPrimer: () => void;
  markFired: (key: string) => void;
}

export const useReminderStore = create<ReminderState>()(
  persist(
    (set) => ({
      optedIn: false,
      primerDismissed: false,
      fired: [],
      setOptedIn: (optedIn) => set({ optedIn }),
      dismissPrimer: () => set({ primerDismissed: true }),
      markFired: (key) =>
        set((s) =>
          s.fired.includes(key) ? s : { fired: [...s.fired, key].slice(-200) },
        ),
    }),
    {
      name: "pulse.reminders.v1",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export function notificationPermission(): NotifyPermission {
  if (typeof window === "undefined" || !("Notification" in window))
    return "unsupported";
  return Notification.permission as NotifyPermission;
}

/** Only ever called from an explicit opt-in tap — never on page load. */
export async function requestNotificationPermission(): Promise<NotifyPermission> {
  if (typeof window === "undefined" || !("Notification" in window))
    return "unsupported";
  const result = await Notification.requestPermission();
  return result as NotifyPermission;
}

/** Fires a browser notification if (and only if) the member opted in. */
export function fireBrowserNotification(title: string, body: string): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (!useReminderStore.getState().optedIn) return;
  try {
    new Notification(title, { body, icon: "/favicon.ico", tag: title });
  } catch {
    // Some browsers require a service worker for Notification construction;
    // the in-app banner still fires, so this is a soft failure.
  }
}
