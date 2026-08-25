import Link from "next/link";
import { APP_NAME } from "@/lib/config";
import { cn } from "@/lib/utils";

export function Logo({
  href = "/",
  className,
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex h-11 items-center gap-2 outline-none sm:h-auto",
        className,
      )}
    >
      <span className="relative flex size-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-volt opacity-30 group-hover:opacity-60" />
        <span className="relative inline-flex size-2.5 rounded-full bg-volt" />
      </span>
      {/* The wordmark is the ONLY place the Latin-only display face is used. */}
      <span className="wordmark text-lg text-hi">{APP_NAME}</span>
    </Link>
  );
}
