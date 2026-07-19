"use client";

import { useEffect, useState } from "react";
import { useSessionStore } from "@/lib/stores/session";
import { useLiveQuery } from "@/lib/hooks/use-live-query";
import type { User } from "@/lib/types";

/** True once the component is mounted client-side (persisted stores are safe). */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

/** Current signed-in user (joined from the service layer), or null. */
export function useCurrentUser(): {
  user: User | null;
  loading: boolean;
  userId: string | null;
} {
  const userId = useSessionStore((s) => s.userId);
  const { data, loading } = useLiveQuery(
    (svc) => svc.auth.getCurrentUser(),
    [userId],
  );
  return { user: data ?? null, loading, userId };
}
