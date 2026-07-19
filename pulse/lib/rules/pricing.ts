/**
 * Dynamic credit pricing — the ONLY place a session's credit cost is derived.
 *
 * The model is deliberately rule-based and configurable: a session's cost in
 * credits starts from the studio's own floor price (€ → credits anchor), then
 * time-of-day and current fill steer demand — off-peak and empty classes get
 * cheaper, nearly-full peak classes get slightly dearer. The studio's € payout
 * per attendance is NEVER affected by this: it is always the floor price.
 *
 * Swap-note: when a real backend arrives this module can move server-side
 * unchanged; it has no dependencies beyond its own config.
 */

export interface PricingConfig {
  /** € of floor price that equals one credit (the anchor). */
  eurPerCredit: number;
  peakMultiplier: number;
  offPeakMultiplier: number;
  /** Fill-based multipliers, checked top-down (first match wins). */
  fillBands: { minFill: number; multiplier: number }[];
  minCredits: number;
  maxCredits: number;
  /** Hour ranges (local time) considered peak. */
  peakHourRanges: [number, number][];
}

export const PRICING_CONFIG: PricingConfig = {
  eurPerCredit: 2,
  peakMultiplier: 1.2,
  offPeakMultiplier: 0.8,
  fillBands: [
    { minFill: 0.75, multiplier: 1.15 },
    { minFill: 0.4, multiplier: 1 },
    { minFill: 0, multiplier: 0.9 },
  ],
  minCredits: 3,
  maxCredits: 12,
  peakHourRanges: [
    [7, 10],
    [17, 21],
  ],
};

export function isPeakHour(startsAt: string | Date): boolean {
  const h = new Date(startsAt).getHours();
  return PRICING_CONFIG.peakHourRanges.some(([from, to]) => h >= from && h < to);
}

/**
 * Credit cost for a session.
 * @param floorPriceEUR studio-set € earned per attendance
 * @param peak          peak/off-peak flag of the session
 * @param fillRatio     booked / spotsReleasedToPlatform (0..1)
 */
export function computeCreditCost(
  floorPriceEUR: number,
  peak: boolean,
  fillRatio: number,
): number {
  const cfg = PRICING_CONFIG;
  const base = floorPriceEUR / cfg.eurPerCredit;
  const timeMult = peak ? cfg.peakMultiplier : cfg.offPeakMultiplier;
  const band =
    cfg.fillBands.find((b) => fillRatio >= b.minFill) ??
    cfg.fillBands[cfg.fillBands.length - 1];
  const raw = base * timeMult * band.multiplier;
  return Math.min(cfg.maxCredits, Math.max(cfg.minCredits, Math.round(raw)));
}
