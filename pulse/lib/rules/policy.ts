import type { Booking } from "@/lib/types";

/**
 * Platform policy — fees, cutoffs and the anti-cannibalization visit cap.
 * Every rule the booking flow enforces lives here, in one configurable object.
 */
export interface PolicyConfig {
  /** Hard cap: confirmed visits per member, per studio, per rolling month. */
  visitCapPerStudioPerMonth: number;
  /** Rolling window length backing the cap, in days. */
  rollingWindowDays: number;
  /** Fallback free-cancellation cutoff when a studio hasn't set its own. */
  defaultCancellationCutoffHours: number;
  lateCancelFeeCredits: number;
  noShowFeeCredits: number;
  /** Credit top-up packs offered in the wallet. */
  topUpPacks: { id: string; credits: number; priceEUR: number }[];
}

export const POLICY: PolicyConfig = {
  visitCapPerStudioPerMonth: 4,
  rollingWindowDays: 30,
  defaultCancellationCutoffHours: 12,
  lateCancelFeeCredits: 2,
  noShowFeeCredits: 3,
  topUpPacks: [
    { id: "pack_s", credits: 5, priceEUR: 14 },
    { id: "pack_m", credits: 12, priceEUR: 29 },
    { id: "pack_l", credits: 25, priceEUR: 55 },
  ],
};

/** Booking statuses that consume a spot / count against the visit cap. */
export const ACTIVE_BOOKING_STATUSES: Booking["status"][] = [
  "reserved",
  "checked_in",
  "completed",
];

/**
 * Visits counted against the cap.
 *
 * The window opens `windowDays` before the EARLIER of now and the session
 * being attempted, and stays open — so every active booking at that studio
 * counts: past visits inside the rolling month AND every upcoming hold.
 *
 * Anchoring on the earlier of the two matters. If the window merely ended at
 * the attempted session's start, bookings made for LATER dates would escape
 * the count, and a member could hold a 5th visit by queuing an early class
 * and then booking four later ones. It also keeps enforcement identical to
 * the "x/4 used this month" meter the UI shows, so the two can never
 * disagree.
 */
export function countVisitsInWindow(
  sessionStartsOfActiveBookings: string[],
  sessionStart: Date,
  windowDays: number = POLICY.rollingWindowDays,
  now: Date = new Date(),
): number {
  const anchor = Math.min(now.getTime(), sessionStart.getTime());
  const windowOpensAt = anchor - windowDays * 86_400_000;
  return sessionStartsOfActiveBookings.filter(
    (iso) => new Date(iso).getTime() > windowOpensAt,
  ).length;
}

export function isLateCancellation(
  sessionStartsAt: string,
  cutoffHours: number,
  now: Date = new Date(),
): boolean {
  const msUntil = new Date(sessionStartsAt).getTime() - now.getTime();
  return msUntil < cutoffHours * 3_600_000;
}
