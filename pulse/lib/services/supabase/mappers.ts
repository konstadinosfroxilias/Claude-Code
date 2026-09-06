/**
 * Row ↔ domain translation. The ONLY place snake_case database shapes meet the
 * camelCase model in lib/types, so neither side leaks into the other.
 */
import type { Tables, ViewRow } from "@/lib/supabase/database.types";
import type {
  AppNotification,
  Booking,
  Category,
  CategoryId,
  City,
  CityId,
  ClassType,
  CreditTransaction,
  LocalizedText,
  Neighborhood,
  PayoutEntry,
  Plan,
  PlanId,
  Review,
  Session,
  SessionView,
  Studio,
  Subscription,
  User,
  WaitlistEntry,
} from "@/lib/types";

const text = (el: string, en: string): LocalizedText => ({ el, en });

export function toUser(row: Tables<"profiles">, studioId?: string): User {
  return {
    id: row.id,
    role: row.role,
    name: row.display_name,
    email: row.email ?? "",
    memberSince: row.member_since,
    ...(studioId ? { studioId } : {}),
  };
}

export function toCity(row: Tables<"cities">): City {
  return {
    id: row.id as CityId,
    name: text(row.name_el, row.name_en),
    lat: row.lat,
    lng: row.lng,
    zoom: row.zoom,
  };
}

export function toNeighborhood(row: Tables<"neighborhoods">): Neighborhood {
  return {
    id: row.id,
    cityId: row.city_id as CityId,
    name: text(row.name_el, row.name_en),
  };
}

export function toCategory(row: Tables<"categories">): Category {
  return {
    id: row.id as CategoryId,
    name: text(row.name_el, row.name_en),
    palette: row.palette,
  };
}

export function toPlan(row: Tables<"plans">): Plan {
  return {
    id: row.id as PlanId,
    name: text(row.name_el, row.name_en),
    creditsPerCycle: row.credits_per_cycle,
    priceEUR: Number(row.price_eur),
    blurb: text(row.blurb_el, row.blurb_en),
    highlight: row.highlight,
  };
}

/** Studios carry their categories through the studio_categories join. */
export function toStudio(
  row: Tables<"studios"> & { studio_categories?: { category_id: string }[] },
): Studio {
  return {
    id: row.id,
    ownerId: row.owner_id ?? "",
    name: row.name,
    cityId: row.city_id as CityId,
    neighborhoodId: row.neighborhood_id,
    categoryIds: (row.studio_categories ?? []).map((c) => c.category_id as CategoryId),
    description: text(row.description_el, row.description_en),
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    rating: Number(row.rating),
    reviewCount: row.review_count,
    amenities: row.amenities as Studio["amenities"],
    featured: row.featured,
    artSeed: row.art_seed,
    defaultFloorPriceEUR: Number(row.default_floor_price_eur),
    cancellationCutoffHours: row.cancellation_cutoff_hours,
  };
}

export function toClassType(row: Tables<"class_types">): ClassType {
  return {
    id: row.id,
    studioId: row.studio_id,
    categoryId: row.category_id as CategoryId,
    name: row.name,
    durationMin: row.duration_min,
    level: row.level,
    description: text(row.description_el, row.description_en),
  };
}

export function toSession(row: Tables<"sessions">): Session {
  return {
    id: row.id,
    studioId: row.studio_id,
    classTypeId: row.class_type_id,
    startsAt: row.start_at,
    durationMin: row.duration_min,
    instructor: row.instructor,
    capacity: row.capacity,
    spotsReleasedToPlatform: row.spots_released_to_platform,
    floorPriceEUR: Number(row.floor_price_eur),
    peak: row.is_peak,
    status: row.status,
    seedBooked: row.seed_booked,
  };
}

/** session_view rows already carry occupancy and the derived credit cost. */
export type SessionViewRow = ViewRow<"session_view">;

export function toSessionView(
  row: SessionViewRow,
  classType: ClassType,
  studio: Studio,
): SessionView {
  return {
    session: {
      id: row.id ?? "",
      studioId: row.studio_id ?? "",
      classTypeId: row.class_type_id ?? "",
      startsAt: row.start_at ?? "",
      durationMin: row.duration_min ?? 0,
      instructor: row.instructor ?? "",
      capacity: row.capacity ?? 0,
      spotsReleasedToPlatform: row.spots_released_to_platform ?? 0,
      floorPriceEUR: Number(row.floor_price_eur ?? 0),
      peak: row.is_peak ?? false,
      status: row.status ?? "scheduled",
      seedBooked: row.seed_booked ?? 0,
    },
    classType,
    studio,
    creditCost: row.credit_cost ?? 0,
    booked: row.booked ?? 0,
    spotsLeft: row.spots_left ?? 0,
    waitlistCount: row.waitlist_count ?? 0,
  };
}

export function toBooking(row: Tables<"bookings">): Booking {
  return {
    id: row.id,
    userId: row.member_id,
    sessionId: row.session_id,
    studioId: row.studio_id,
    status: row.status,
    creditCost: row.credit_cost,
    payoutEUR: Number(row.payout_eur),
    qrToken: row.qr_token,
    createdAt: row.created_at,
    ...(row.checked_in_at ? { checkedInAt: row.checked_in_at } : {}),
    ...(row.cancelled_at ? { cancelledAt: row.cancelled_at } : {}),
    ...(row.from_waitlist ? { fromWaitlist: true } : {}),
  };
}

export function toWaitlistEntry(row: Tables<"waitlist_entries">): WaitlistEntry {
  return {
    id: row.id,
    sessionId: row.session_id,
    studioId: row.studio_id,
    userId: row.member_id,
    position: row.position,
    holdCredits: row.hold_credits,
    createdAt: row.created_at,
  };
}

export function toSubscription(row: Tables<"subscriptions">): Subscription {
  return {
    id: row.id,
    userId: row.member_id,
    planId: row.plan_id as PlanId,
    status: row.status,
    creditsPerCycle: row.credits_per_cycle,
    priceEUR: Number(row.price_eur),
    cycleStart: row.cycle_start,
    cycleEnd: row.cycle_end,
  };
}

export function toCreditTransaction(
  row: Tables<"credit_transactions">,
): CreditTransaction {
  return {
    id: row.id,
    userId: row.member_id,
    type: row.type,
    status: row.status,
    delta: row.delta,
    reason: row.reason,
    ...(row.booking_id ? { bookingId: row.booking_id } : {}),
    ...(row.studio_id ? { studioId: row.studio_id } : {}),
    createdAt: row.created_at,
    ...(row.settled_at ? { settledAt: row.settled_at } : {}),
  };
}

export function toPayoutEntry(row: Tables<"payout_entries">): PayoutEntry {
  return {
    id: row.id,
    studioId: row.studio_id,
    bookingId: row.booking_id,
    sessionId: row.session_id,
    userId: row.member_id,
    amountEUR: Number(row.amount_eur),
    status: row.status,
    createdAt: row.created_at,
    ...(row.confirmed_at ? { confirmedAt: row.confirmed_at } : {}),
  };
}

export function toReview(row: Tables<"reviews">): Review {
  return {
    id: row.id,
    studioId: row.studio_id,
    userId: row.member_id ?? "",
    authorName: row.author_name,
    rating: row.rating,
    text: row.body,
    lang: row.lang as Review["lang"],
    createdAt: row.created_at,
  };
}

export function toNotification(row: Tables<"notifications">): AppNotification {
  return {
    id: row.id,
    userId: row.member_id,
    kind: row.kind,
    title: text(row.title_el, row.title_en),
    body: text(row.body_el, row.body_en),
    ...(row.href ? { href: row.href } : {}),
    read: row.read,
    createdAt: row.created_at,
  };
}
