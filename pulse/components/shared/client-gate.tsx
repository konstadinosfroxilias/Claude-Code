"use client";

import { useMounted } from "@/lib/hooks/use-session";
import { APP_NAME } from "@/lib/config";

/**
 * Defers children until after hydration so localStorage-backed state
 * (session, language, mock DB) never causes a server/client mismatch.
 * Shows a minimal branded splash for the first paint.
 */
export function ClientGate({ children }: { children: React.ReactNode }) {
  const mounted = useMounted();
  if (!mounted) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg">
        <div className="flex items-center gap-2.5">
          <span className="size-2.5 rounded-full bg-volt animate-pulse-dot" />
          <span className="wordmark text-xl text-hi">{APP_NAME}</span>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
