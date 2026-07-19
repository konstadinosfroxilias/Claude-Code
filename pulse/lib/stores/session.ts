"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Role } from "@/lib/types";
import { STORAGE_KEYS } from "@/lib/config";

/**
 * Client session (who is "signed in"). The mock AuthService reads/writes this
 * store; with a real auth provider this becomes a thin mirror of the auth
 * cookie/JWT and the rest of the app keeps working unchanged.
 */
interface SessionState {
  userId: string | null;
  role: Role | null;
  hydrated: boolean;
  setSession: (userId: string, role: Role) => void;
  clearSession: () => void;
  setHydrated: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      userId: null,
      role: null,
      hydrated: false,
      setSession: (userId, role) => set({ userId, role }),
      clearSession: () => set({ userId: null, role: null }),
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: STORAGE_KEYS.session,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ userId: s.userId, role: s.role }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);
