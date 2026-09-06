"use client";

import type { PulseSupabase } from "@/lib/supabase/client";

/**
 * Change feed for the Supabase backend.
 *
 * Two sources feed the same listener set:
 *  1. LOCAL writes — every mutating service method calls `emit()`, so the
 *     current tab refetches immediately, exactly like the mock's db.mutate.
 *  2. REALTIME — Postgres changes on the tables in 0005_realtime.sql, so other
 *     devices (and the studio side) see updates without a refresh.
 *
 * Realtime is strictly an ENHANCEMENT: if the socket never connects, the
 * publication is missing, or the project has realtime disabled, the app keeps
 * working on local emits plus ordinary fetches. Nothing here ever throws into
 * the UI.
 */
const WATCHED_TABLES = [
  "bookings",
  "waitlist_entries",
  "notifications",
  "sessions",
  "credit_transactions",
  "member_achievements",
] as const;

export class ChangeFeed {
  private listeners = new Set<() => void>();
  private channel: ReturnType<PulseSupabase["channel"]> | null = null;
  private started = false;

  constructor(private readonly client: PulseSupabase) {}

  /** Fire after a local write. */
  emit(): void {
    for (const cb of this.listeners) {
      try {
        cb();
      } catch {
        // A misbehaving listener must not break the others.
      }
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    this.start();
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) this.stop();
    };
  }

  private start(): void {
    if (this.started || typeof window === "undefined") return;
    this.started = true;
    try {
      const channel = this.client.channel("pulse-changes");
      for (const table of WATCHED_TABLES) {
        channel.on(
          "postgres_changes",
          { event: "*", schema: "public", table },
          () => this.emit(),
        );
      }
      channel.subscribe((status) => {
        // CHANNEL_ERROR / TIMED_OUT are normal when realtime is off — the app
        // simply keeps using local emits.
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          this.stop();
        }
      });
      this.channel = channel;
    } catch {
      this.channel = null; // degrade silently
    }
  }

  private stop(): void {
    this.started = false;
    const channel = this.channel;
    this.channel = null;
    if (!channel) return;
    try {
      void this.client.removeChannel(channel);
    } catch {
      /* ignore */
    }
  }
}
