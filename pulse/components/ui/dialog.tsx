"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

/**
 * Bottom-sheet on mobile, centered modal on desktop — the app's single
 * overlay pattern.
 */
export function DialogContent({
  className,
  children,
  hideClose,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  hideClose?: boolean;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-50 flex flex-col bg-surface border-line shadow-pop focus:outline-none",
          // Mobile: bottom sheet
          "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-[1.75rem] border-t",
          "data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-8 data-[state=open]:fade-in-0",
          "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom-8 data-[state=closed]:fade-out-0",
          // Desktop: centered
          "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[85dvh] sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[1.5rem] sm:border",
          "sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=open]:zoom-in-95",
          className,
        )}
        {...props}
      >
        <div className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-line-strong sm:hidden" />
        <div className="overflow-y-auto p-6 pt-4 sm:pt-6">{children}</div>
        {!hideClose && (
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-lg p-1.5 text-low transition-colors hover:bg-surface-2 hover:text-hi">
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogTitle({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("display text-lg text-hi", className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("mt-1.5 text-sm text-mid", className)}
      {...props}
    />
  );
}
