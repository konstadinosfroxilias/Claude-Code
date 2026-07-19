import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-line-strong bg-surface/50 px-6 py-12 text-center",
        className,
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-2xl bg-surface-2 text-low">
        <Icon className="size-5" />
      </div>
      <div>
        <p className="font-semibold text-hi">{title}</p>
        {hint && <p className="mt-1 text-sm text-mid">{hint}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
