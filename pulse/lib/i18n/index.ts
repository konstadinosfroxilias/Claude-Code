"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { LanguageCode, LocalizedText } from "@/lib/types";
import { STORAGE_KEYS } from "@/lib/config";
import { el, type TranslationKey } from "./el";
import { en } from "./en";

export type { TranslationKey };

const DICTS: Record<LanguageCode, Record<TranslationKey, string>> = { el, en };

export type TranslateVars = Record<string, string | number>;

export function translate(
  lang: LanguageCode,
  key: TranslationKey,
  vars?: TranslateVars,
): string {
  let out: string = DICTS[lang][key] ?? DICTS.el[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      out = out.replaceAll(`{${k}}`, String(v));
    }
  }
  return out;
}

export function pickText(text: LocalizedText, lang: LanguageCode): string {
  return text[lang] || text.el;
}

interface PrefsState {
  lang: LanguageCode;
  setLang: (lang: LanguageCode) => void;
}

export const usePrefsStore = create<PrefsState>()(
  persist(
    (set) => ({
      lang: "el",
      setLang: (lang) => set({ lang }),
    }),
    {
      name: STORAGE_KEYS.prefs,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

/** The one hook UI components use for copy. */
export function useI18n() {
  const lang = usePrefsStore((s) => s.lang);
  const setLang = usePrefsStore((s) => s.setLang);
  return {
    lang,
    setLang,
    t: (key: TranslationKey, vars?: TranslateVars) =>
      translate(lang, key, vars),
    pick: (text: LocalizedText) => pickText(text, lang),
  };
}
