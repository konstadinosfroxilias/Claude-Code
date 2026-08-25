/**
 * Distance + travel-time helpers.
 *
 * Pure functions over coordinates the catalog already carries — no network,
 * no side effects. Labels are produced by the i18n layer; these return
 * structured values so both languages format identically.
 */

export interface Coords {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_M = 6_371_000;

/** Great-circle distance in metres. */
export function haversineMeters(a: Coords, b: Coords): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/**
 * Straight-line distance underestimates real routes; city streets add
 * roughly a third. Applied to travel time only — the displayed distance
 * stays the honest as-the-crow-flies figure.
 */
const STREET_FACTOR = 1.3;
const WALK_KMH = 5;
const DRIVE_KMH = 28;
/** At or below this distance we suggest walking. */
export const WALK_THRESHOLD_M = 2000;

export type TravelMode = "walk" | "drive";

export interface TravelEstimate {
  meters: number;
  mode: TravelMode;
  minutes: number;
}

export function estimateTravel(meters: number): TravelEstimate {
  const mode: TravelMode = meters <= WALK_THRESHOLD_M ? "walk" : "drive";
  const kmh = mode === "walk" ? WALK_KMH : DRIVE_KMH;
  const minutes = Math.max(
    1,
    Math.round((meters * STREET_FACTOR) / 1000 / kmh * 60),
  );
  return { meters, mode, minutes };
}

/**
 * Distance string: under 1 km rounded to the nearest 50 m ("850 m"),
 * from 1 km one decimal ("6.2 km"). `decimalSep` keeps Greek using a comma.
 */
export function formatDistance(meters: number, lang: "el" | "en"): string {
  if (meters < 1000) {
    const rounded = Math.max(50, Math.round(meters / 50) * 50);
    return `${rounded} m`;
  }
  const km = meters / 1000;
  const text = km.toFixed(1);
  return `${lang === "el" ? text.replace(".", ",") : text} km`;
}
