"use client";

import { Toaster } from "sonner";
import { MotionConfig } from "framer-motion";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      {children}
      <Toaster
        position="top-center"
        theme="dark"
        toastOptions={{
          style: {
            background: "var(--color-surface-2)",
            border: "1px solid var(--color-line-strong)",
            color: "var(--color-hi)",
            borderRadius: "14px",
          },
        }}
      />
    </MotionConfig>
  );
}
