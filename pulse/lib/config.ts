/**
 * Global app configuration.
 *
 * APP_NAME is the single place the product's working name lives — rename it
 * here and every screen, title and notification follows.
 */
export const APP_NAME = "PULSE";
export const APP_TAGLINE_KEY = "brand.tagline"; // i18n key

/**
 * When true (default), all services resolve to the mock, localStorage-backed
 * implementations in `lib/services/mock`. Flip to "false" once real
 * implementations exist (see README → "Swapping in a real backend").
 */
export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";

/** Base URL placeholder for the future real API. Unused while USE_MOCK. */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

/** localStorage keys (namespaced + versioned so a schema bump reseeds cleanly). */
export const STORAGE_KEYS = {
  // v2 added the waitlist collection — bumping forces a clean reseed.
  db: "pulse.db.v2",
  session: "pulse.session.v1",
  prefs: "pulse.prefs.v1",
} as const;

/** Mock DB seeds sessions relative to "now"; refresh if older than this. */
export const SEED_MAX_AGE_MS = 20 * 60 * 60 * 1000; // 20h
