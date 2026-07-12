import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { strings, type Dict, type Lang, type LocalizedText } from '../data/content'

interface LanguageContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  toggle: () => void
  /** translated UI string tree for the current language */
  t: Dict
  /** pick the right variant of a { de, en, tr } object */
  pick: (text: LocalizedText) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('de')

  // keep <html lang> in sync: gives correct Turkish uppercasing (i → İ)
  // for CSS text-transform and better screen-reader pronunciation
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      setLang,
      // cycle DE → EN → TR → DE
      toggle: () => setLang((l) => (l === 'de' ? 'en' : l === 'en' ? 'tr' : 'de')),
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
