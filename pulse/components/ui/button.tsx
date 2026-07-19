"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-45 select-none active:scale-[0.98] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        volt: "bg-volt text-volt-ink hover:bg-volt-bright shadow-[0_8px_24px_-8px_rgb(200_241_63/0.4)]",
        surface:
          "bg-surface-2 text-hi border border-line hover:bg-surface-3 hover:border-line-strong",
        ghost: "text-mid hover:text-hi hover:bg-surface-2",
        outline:
          "border border-line-strong text-hi hover:border-volt hover:text-volt",
        danger:
          "bg-bad/10 text-bad border border-bad/25 hover:bg-bad/20",
      },
      size: {
        sm: "h-8 rounded-[10px] px-3 text-xs [&_svg]:size-3.5",
        md: "h-10 rounded-xl px-4 text-sm [&_svg]:size-4",
        lg: "h-12 rounded-[14px] px-6 text-[15px] [&_svg]:size-4.5",
        icon: "size-10 rounded-xl [&_svg]:size-4.5",
        iconSm: "size-8 rounded-[10px] [&_svg]:size-4",
      },
    },
    defaultVariants: { variant: "surface", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, loading, children, disabled, ...props },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" aria-hidden />
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
