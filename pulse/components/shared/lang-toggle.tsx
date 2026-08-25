"use client";

import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LangToggle({ className }: { className?: string }) {
  const { lang, setLang } = useI18n();
  return (
    <div
      role="group"
      aria-label="Language"
      className={cn(
        "inline-flex items-center rounded-full border border-line bg-surface-2 p-0.5 text-xs font-semibold",
        className,
      )}
    >
      {(["el", "en"] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
          className={cn(
            "flex h-11 items-center rounded-full px-4 uppercase tracking-wide transition-colors sm:h-auto sm:px-2.5 sm:py-1",
            lang === code ? "bg-volt text-volt-ink" : "text-low hover:text-hi",
          )}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
