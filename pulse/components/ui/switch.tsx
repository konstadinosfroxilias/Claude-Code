"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export function Switch({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        // `tap` keeps the painted switch compact while guaranteeing a >=44px
        // touch target on phones (see .tap in globals.css).
        "tap peer inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full border border-line bg-surface-3 transition-colors",
        "data-[state=checked]:border-volt/40 data-[state=checked]:bg-volt/90",
        "focus-visible:outline-2 focus-visible:outline-volt disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block size-4.5 translate-x-0.5 rounded-full bg-mid shadow-sm transition-transform",
          "data-[state=checked]:translate-x-[18px] data-[state=checked]:bg-volt-ink",
        )}
      />
    </SwitchPrimitive.Root>
  );
}
