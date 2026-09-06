/**
 * Turns the mock seed into database rows.
 *
 * This is the parity guarantee: BOTH backends are populated from the very same
 * `buildSeed()` output, so mock mode and Supabase mode show the same 22
 * studios, the same schedule, the same demo member with the same credit
 * history — and the same engagement state (weekly goal, unlocked achievements,
 * eight weeks of attendance including a deliberate rest week).
 *
 * Pure: no I/O. supabase/seed.ts writes these rows to a hosted project;
 * supabase/scripts/seed-local.ts writes the same rows to a local Postgres for
 * verification.
 */
import { createHash } from "node:crypto";
import { buildSeed, DEMO_MEMBER_ID, DEMO_OWNER_ID } from "@/lib/mock/seed";
import { PRICING_CONFIG } from "@/lib/rules/pricing";
import { POLICY } from "@/lib/rules/policy";
import { ACHIEVEMENTS } from "@/lib/rules/engagement";

/**
 * Deterministic UUID from any mock id, so re-running the seed updates the same
 * rows instead of duplicating them (and so booking → ledger → payout
 * references stay intact across runs).
 */
export function stableUuid(seed: string): string {
  const h = createHash("sha256").update(`pulse:${seed}`).digest("hex");
  // Shape it as a v4 UUID; only determinism matters here.
  return [
    h.slice(0, 8),
    h.slice(8, 12),
    `4${h.slice(13, 16)}`,
    ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16) + h.slice(17, 20),
    h.slice(20, 32),
  ].join("-");
}

export interface SeedUser {
  id: string;
  email: string;
  displayName: string;
  role: "member" | "studio_owner";
  memberSince: string;
  isDemo: boolean;
}

export interface SeedRows {
  users: SeedUser[];
  profiles: Record<string, unknown>[];
  cities: Record<string, unknown>[];
  neighborhoods: Record<string, unknown>[];
  categories: Record<string, unknown>[];
  plans: Record<string, unknown>[];
  studios: Record<string, unknown>[];
  studio_categories: Record<string, unknown>[];
  class_types: Record<string, unknown>[];
  sessions: Record<string, unknown>[];
  bookings: Record<string, unknown>[];
  waitlist_entries: Record<string, unknown>[];
  subscriptions: Record<string, unknown>[];
  credit_transactions: Record<string, unknown>[];
  payout_entries: Record<string, unknown>[];
  reviews: Record<string, unknown>[];
  favorites: Record<string, unknown>[];
  notifications: Record<string, unknown>[];
  goals: Record<string, unknown>[];
  achievements: Record<string, unknown>[];
  member_achievements: Record<string, unknown>[];
  engagement_prefs: Record<string, unknown>[];
  pricing_config: Record<string, unknown>[];
  platform_policy: Record<string, unknown>[];
}

export const DEMO_EMAILS = {
  member: process.env.NEXT_PUBLIC_DEMO_MEMBER_EMAIL ?? "demo.member@pulse.fit",
  owner: process.env.NEXT_PUBLIC_DEMO_OWNER_EMAIL ?? "demo.owner@pulse.fit",
};

export function buildSeedRows(now: Date = new Date()): SeedRows {
  const db = buildSeed(now);
  const uid = (mockId: string) => stableUuid(mockId);

  const users: SeedUser[] = db.users.map((u) => {
    const isDemoMember = u.id === DEMO_MEMBER_ID;
    const isDemoOwner = u.id === DEMO_OWNER_ID;
    return {
      id: uid(u.id),
      email: isDemoMember
        ? DEMO_EMAILS.member
        : isDemoOwner
          ? DEMO_EMAILS.owner
          : u.email,
      displayName: u.name,
      role: u.role,
      memberSince: u.memberSince,
      isDemo: isDemoMember || isDemoOwner,
    };
  });

  return {
    users,

    profiles: db.users.map((u) => ({
      id: uid(u.id),
      role: u.role,
      display_name: u.name,
      email: users.find((x) => x.id === uid(u.id))?.email ?? u.email,
      member_since: u.memberSince,
    })),

    cities: db.cities.map((c) => ({
      id: c.id,
      name_el: c.name.el,
      name_en: c.name.en,
      lat: c.lat,
      lng: c.lng,
      zoom: c.zoom,
    })),

    neighborhoods: db.neighborhoods.map((n) => ({
      id: n.id,
      city_id: n.cityId,
      name_el: n.name.el,
      name_en: n.name.en,
    })),

    categories: db.categories.map((c) => ({
      id: c.id,
      name_el: c.name.el,
      name_en: c.name.en,
      palette: c.palette,
    })),

    plans: db.plans.map((p, i) => ({
      id: p.id,
      name_el: p.name.el,
      name_en: p.name.en,
      credits_per_cycle: p.creditsPerCycle,
      price_eur: p.priceEUR,
      blurb_el: p.blurb.el,
      blurb_en: p.blurb.en,
      highlight: p.highlight,
      sort_order: i,
    })),

    studios: db.studios.map((s) => ({
      id: s.id,
      owner_id: uid(s.ownerId),
      name: s.name,
      city_id: s.cityId,
      neighborhood_id: s.neighborhoodId,
      description_el: s.description.el,
      description_en: s.description.en,
      address: s.address,
      lat: s.lat,
      lng: s.lng,
      rating: s.rating,
      review_count: s.reviewCount,
      amenities: s.amenities,
      photos: [],
      featured: s.featured,
      art_seed: s.artSeed,
      default_floor_price_eur: s.defaultFloorPriceEUR,
      cancellation_cutoff_hours: s.cancellationCutoffHours,
    })),

    studio_categories: db.studios.flatMap((s) =>
      s.categoryIds.map((c, i) => ({ studio_id: s.id, category_id: c, sort_order: i })),
    ),

    class_types: db.classTypes.map((c) => ({
      id: c.id,
      studio_id: c.studioId,
      category_id: c.categoryId,
      name: c.name,
      duration_min: c.durationMin,
      level: c.level,
      description_el: c.description.el,
      description_en: c.description.en,
    })),

    sessions: db.sessions.map((s) => ({
      id: s.id,
      studio_id: s.studioId,
      class_type_id: s.classTypeId,
      start_at: s.startsAt,
      duration_min: s.durationMin,
      instructor: s.instructor,
      capacity: s.capacity,
      spots_released_to_platform: s.spotsReleasedToPlatform,
      floor_price_eur: s.floorPriceEUR,
      is_peak: s.peak,
      status: s.status,
      seed_booked: s.seedBooked,
    })),

    bookings: db.bookings.map((b) => ({
      id: uid(`booking:${b.id}`),
      session_id: b.sessionId,
      member_id: uid(b.userId),
      studio_id: b.studioId,
      status: b.status,
      credit_cost: b.creditCost,
      payout_eur: b.payoutEUR,
      qr_token: b.qrToken,
      from_waitlist: b.fromWaitlist ?? false,
      created_at: b.createdAt,
      checked_in_at: b.checkedInAt ?? null,
      cancelled_at: b.cancelledAt ?? null,
    })),

    waitlist_entries: db.waitlist.map((w) => ({
      id: uid(`waitlist:${w.id}`),
      session_id: w.sessionId,
      studio_id: w.studioId,
      member_id: uid(w.userId),
      position: w.position,
      hold_credits: w.holdCredits,
      created_at: w.createdAt,
    })),

    subscriptions: db.subscriptions.map((s) => ({
      id: uid(`sub:${s.id}`),
      member_id: uid(s.userId),
      plan_id: s.planId,
      status: s.status,
      credits_per_cycle: s.creditsPerCycle,
      price_eur: s.priceEUR,
      cycle_start: s.cycleStart,
      cycle_end: s.cycleEnd,
    })),

    credit_transactions: db.creditTxs.map((t) => ({
      id: uid(`tx:${t.id}`),
      member_id: uid(t.userId),
      type: t.type,
      status: t.status,
      reason: t.reason,
      delta: t.delta,
      booking_id: t.bookingId ? uid(`booking:${t.bookingId}`) : null,
      studio_id: t.studioId ?? null,
      created_at: t.createdAt,
      settled_at: t.settledAt ?? null,
    })),

    payout_entries: db.payoutEntries.map((p) => ({
      id: uid(`payout:${p.id}`),
      studio_id: p.studioId,
      booking_id: uid(`booking:${p.bookingId}`),
      session_id: p.sessionId,
      member_id: uid(p.userId),
      amount_eur: p.amountEUR,
      status: p.status,
      created_at: p.createdAt,
      confirmed_at: p.confirmedAt ?? null,
    })),

    reviews: db.reviews.map((r) => ({
      id: uid(`review:${r.id}`),
      studio_id: r.studioId,
      member_id: uid(r.userId),
      author_name: r.authorName,
      rating: r.rating,
      body: r.text,
      lang: r.lang,
      created_at: r.createdAt,
    })),

    favorites: db.favorites.map((f) => ({
      member_id: uid(f.userId),
      studio_id: f.studioId,
      created_at: f.createdAt,
    })),

    notifications: db.notifications.map((n) => ({
      id: uid(`notif:${n.id}`),
      member_id: uid(n.userId),
      kind: n.kind,
      title_el: n.title.el,
      title_en: n.title.en,
      body_el: n.body.el,
      body_en: n.body.en,
      href: n.href ?? null,
      read: n.read,
      created_at: n.createdAt,
    })),

    /* ── engagement ─────────────────────────────────────────────────────── */
    goals: db.goals.map((g) => ({
      member_id: uid(g.userId),
      weekly_target: g.weeklyTarget,
      updated_at: g.updatedAt,
    })),

    // Catalog pushed from lib/rules/engagement.ts so SQL can never drift.
    achievements: ACHIEVEMENTS.map((a) => ({
      key: a.id,
      group_key: a.group,
      sort_order: a.order,
      target: a.target ?? null,
    })),

    member_achievements: db.memberAchievements.map((m) => ({
      member_id: uid(m.userId),
      achievement_key: m.achievementId,
      unlocked_at: m.unlockedAt,
    })),

    engagement_prefs: db.engagementPrefs.map((p) => ({
      member_id: uid(p.userId),
      nudges_enabled: p.nudgesEnabled,
      nudges_muted_until: p.nudgesMutedUntil ?? null,
    })),

    /* ── config: the rules' numbers, straight from TypeScript ───────────── */
    pricing_config: [
      {
        id: true,
        eur_per_credit: PRICING_CONFIG.eurPerCredit,
        peak_multiplier: PRICING_CONFIG.peakMultiplier,
        off_peak_multiplier: PRICING_CONFIG.offPeakMultiplier,
        fill_bands: PRICING_CONFIG.fillBands,
        min_credits: PRICING_CONFIG.minCredits,
        max_credits: PRICING_CONFIG.maxCredits,
      },
    ],

    platform_policy: [
      {
        id: true,
        visit_cap_per_studio_per_month: POLICY.visitCapPerStudioPerMonth,
        rolling_window_days: POLICY.rollingWindowDays,
        default_cancellation_cutoff_hours: POLICY.defaultCancellationCutoffHours,
        late_cancel_fee_credits: POLICY.lateCancelFeeCredits,
        no_show_fee_credits: POLICY.noShowFeeCredits,
        top_up_packs: POLICY.topUpPacks,
      },
    ],
  };
}

/** FK-safe insertion order. */
export const SEED_ORDER: (keyof SeedRows)[] = [
  "pricing_config",
  "platform_policy",
  "cities",
  "neighborhoods",
  "categories",
  "plans",
  "achievements",
  "profiles",
  "studios",
  "studio_categories",
  "class_types",
  "sessions",
  "bookings",
  "waitlist_entries",
  "subscriptions",
  "credit_transactions",
  "payout_entries",
  "reviews",
  "favorites",
  "notifications",
  "goals",
  "member_achievements",
  "engagement_prefs",
];

/** Primary keys, so a re-run upserts instead of duplicating. */
export const SEED_CONFLICT_TARGET: Partial<Record<keyof SeedRows, string>> = {
  pricing_config: "id",
  platform_policy: "id",
  cities: "id",
  neighborhoods: "id",
  categories: "id",
  plans: "id",
  achievements: "key",
  profiles: "id",
  studios: "id",
  studio_categories: "studio_id,category_id",
  class_types: "id",
  sessions: "id",
  bookings: "id",
  waitlist_entries: "id",
  subscriptions: "id",
  credit_transactions: "id",
  payout_entries: "id",
  reviews: "id",
  favorites: "member_id,studio_id",
  notifications: "id",
  goals: "member_id",
  member_achievements: "member_id,achievement_key",
  engagement_prefs: "member_id",
};
