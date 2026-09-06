"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * Per-device engagement UI state — things that should NOT follow the member
 * across devices or live in the backend: which week's celebration already
 * played here, whether the nudge primer was waved away, which nudge cards were
 * dismissed on this device. Everything that matters (goal, unlocks, prefs)
 * goes through the service layer instead.
 */
interface EngagementUiState {
  celebratedWeeks: string[];
  nudgePrimerDismissed: boolean;
  dismissedNudgeIds: string[];
  markCelebrated: (weekKey: string) => void;
  dismissNudgePrimer: () => void;
  dismissNudge: (id: string) => void;
}

export const useEngagementUi = create<EngagementUiState>()(
  persist(
    (set) => ({
      celebratedWeeks: [],
      nudgePrimerDismissed: false,
      dismissedNudgeIds: [],
      markCelebrated: (key) =>
        set((s) =>
          s.celebratedWeeks.includes(key)
            ? s
            : { celebratedWeeks: [...s.celebratedWeeks, key].slice(-12) },
        ),
      dismissNudgePrimer: () => set({ nudgePrimerDismissed: true }),
      dismissNudge: (id) =>
        set((s) =>
          s.dismissedNudgeIds.includes(id)
            ? s
            : { dismissedNudgeIds: [...s.dismissedNudgeIds, id].slice(-30) },
        ),
    }),
    {
      name: "pulse.engagement.v1",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
