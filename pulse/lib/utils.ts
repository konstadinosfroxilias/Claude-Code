import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { LanguageCode } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const LOCALE: Record<LanguageCode, string> = { el: "el-GR", en: "en-GB" };

export function formatEUR(amount: number, lang: LanguageCode = "el"): string {
  return new Intl.NumberFormat(LOCALE[lang], {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDay(iso: string, lang: LanguageCode): string {
  return new Intl.DateTimeFormat(LOCALE[lang], {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

export function formatLongDay(iso: string, lang: LanguageCode): string {
  return new Intl.DateTimeFormat(LOCALE[lang], {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(iso));
}

export function formatTime(iso: string, lang: LanguageCode): string {
  return new Intl.DateTimeFormat(LOCALE[lang], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function formatDateTime(iso: string, lang: LanguageCode): string {
  return `${formatDay(iso, lang)} · ${formatTime(iso, lang)}`;
}

export function formatMonth(yyyyMm: string, lang: LanguageCode): string {
  const [y, m] = yyyyMm.split("-").map(Number);
  return new Intl.DateTimeFormat(LOCALE[lang], {
    month: "long",
    year: "numeric",
  }).format(new Date(y, m - 1, 1));
}

/** "YYYY-MM" bucket for a date — used for payout statements. */
export function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

export function addDays(d: Date, days: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + days);
  return c;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function hoursUntil(iso: string, from: Date = new Date()): number {
  return (new Date(iso).getTime() - from.getTime()) / 3_600_000;
}

/** Relative label: "in 2h", "σε 2ω" handled at the i18n layer — this returns raw parts. */
export function relativeParts(
  iso: string,
  from: Date = new Date(),
): { future: boolean; days: number; hours: number; minutes: number } {
  const diff = new Date(iso).getTime() - from.getTime();
  const abs = Math.abs(diff);
  return {
    future: diff > 0,
    days: Math.floor(abs / 86_400_000),
    hours: Math.floor((abs % 86_400_000) / 3_600_000),
    minutes: Math.floor((abs % 3_600_000) / 60_000),
  };
}

export function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

/** Deterministic 32-bit hash — used to derive stable pseudo-random visuals. */
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
