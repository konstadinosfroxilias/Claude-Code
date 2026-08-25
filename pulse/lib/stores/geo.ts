"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Coords } from "@/lib/geo/distance";

export type GeoStatus = "unknown" | "granted" | "denied" | "unavailable";

/**
 * Location state.
 *
 * The native permission prompt is NEVER triggered cold — the UI shows a soft
 * primer first and only calls `request()` after the member opts in. The
 * decision persists so we don't nag on every visit.
 *
 * Swap-note: coords live in the browser only. To persist a member's last
 * known location server-side, write it through a service method here (see
 * README → "Where to plug in real geolocation persistence").
 */
interface GeoState {
  status: GeoStatus;
  coords: Coords | null;
  /** True while the native prompt / lookup is in flight. */
  pending: boolean;
  /** Set when the member dismissed the primer with "Not now". */
  primerDismissed: boolean;
  request: () => Promise<void>;
  dismissPrimer: () => void;
  reset: () => void;
}

export const useGeoStore = create<GeoState>()(
  persist(
    (set) => ({
      status: "unknown",
      coords: null,
      pending: false,
      primerDismissed: false,

      request: async () => {
        if (
          typeof navigator === "undefined" ||
          !("geolocation" in navigator)
        ) {
          set({ status: "unavailable", coords: null, pending: false });
          return;
        }
        set({ pending: true });
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              set({
                status: "granted",
                coords: {
                  lat: pos.coords.latitude,
                  lng: pos.coords.longitude,
                },
                pending: false,
              });
              resolve();
            },
            (err) => {
              // PERMISSION_DENIED (1) is a real "no"; the rest mean we simply
              // can't get a fix. Either way we show no distance at all.
              set({
                status: err.code === err.PERMISSION_DENIED ? "denied" : "unavailable",
                coords: null,
                pending: false,
              });
              resolve();
            },
            { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
          );
        });
      },

      dismissPrimer: () => set({ primerDismissed: true }),
      reset: () =>
        set({
          status: "unknown",
          coords: null,
          pending: false,
          primerDismissed: false,
        }),
    }),
    {
      name: "pulse.geo.v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        status: s.status,
        coords: s.coords,
        primerDismissed: s.primerDismissed,
      }),
    },
  ),
);

/**
 * The one hook UI uses for location-derived data. Returns `coords` only when
 * permission was actually granted, so callers can't accidentally render a
 * distance for a member who declined.
 */
export function useGeo() {
  const status = useGeoStore((s) => s.status);
  const coords = useGeoStore((s) => s.coords);
  const pending = useGeoStore((s) => s.pending);
  const primerDismissed = useGeoStore((s) => s.primerDismissed);
  const request = useGeoStore((s) => s.request);
  const dismissPrimer = useGeoStore((s) => s.dismissPrimer);

  return {
    status,
    pending,
    /** Non-null ONLY when status === "granted". */
    coords: status === "granted" ? coords : null,
    /** Show the soft primer: never asked, never dismissed. */
    shouldPrime: status === "unknown" && !primerDismissed,
    request,
    dismissPrimer,
  };
}
