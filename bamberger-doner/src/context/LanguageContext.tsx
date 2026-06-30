import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { strings, type Dict, type Lang } from '../config/content'
import type { LocalizedText } from '../config/menu'

interface LanguageContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  toggle: () => void
  /** translated UI string tree for the current language */
  t: Dict
  /** pick the right side of a { de, en } object */
  pick: (text: LocalizedText) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('de')

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      setLang,
      toggle: () => setLang((l) => (l === 'de' ? 'en' : 'de')),
      t: strings[lang],
      pick: (text: LocalizedText) => text[lang],
    }),
    [lang],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLang() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLang must be used within a LanguageProvider')
  return ctx
}
