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
 * Visits counted against the cap for a booking attempt at `sessionStart`:
 * active bookings at the same studio whose session starts inside the rolling
 * window ending at the attempted session's start.
 */
export function countVisitsInWindow(
  sessionStartsOfActiveBookings: string[],
  sessionStart: Date,
  windowDays: number = POLICY.rollingWindowDays,
): number {
  const end = sessionStart.getTime();
  const start = end - windowDays * 86_400_000;
  return sessionStartsOfActiveBookings.filter((iso) => {
    const t = new Date(iso).getTime();
    return t > start && t <= end;
  }).length;
}

export function isLateCancellation(
  sessionStartsAt: string,
  cutoffHours: number,
  now: Date = new Date(),
): boolean {
  const msUntil = new Date(sessionStartsAt).getTime() - now.getTime();
  return msUntil < cutoffHours * 3_600_000;
}
