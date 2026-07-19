import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  sub,
  actions,
  className,
}: {
  title: string;
  sub?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-wrap items-end justify-between gap-3",
        className,
      )}
    >
      <div>
        <h1 className="display text-2xl text-hi sm:text-3xl">{title}</h1>
        {sub && <p className="mt-1 text-sm text-mid">{sub}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
