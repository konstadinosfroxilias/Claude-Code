import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap [&_svg]:size-3",
  {
    variants: {
      variant: {
        neutral: "bg-surface-3 text-mid",
        volt: "bg-volt/12 text-volt border border-volt/25",
        good: "bg-good/10 text-good border border-good/25",
        warn: "bg-warn/10 text-warn border border-warn/25",
        bad: "bg-bad/10 text-bad border border-bad/25",
        info: "bg-info/10 text-info border border-info/25",
        outline: "border border-line-strong text-mid",
      },
      size: {
        sm: "px-2 py-0.5 text-[11px]",
        md: "px-2.5 py-1 text-xs",
      },
    },
    defaultVariants: { variant: "neutral", size: "sm" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props} />
  );
}
