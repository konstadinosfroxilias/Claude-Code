import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion'
import { ShoppingBag, Menu as MenuIcon, X } from 'lucide-react'
import { useLang } from '../context/LanguageContext'
import { useCart } from '../context/CartContext'
import Wordmark from './Wordmark'

const links = [
  { key: 'menu', href: '#menu' },
  { key: 'locations', href: '#standorte' },
  { key: 'about', href: '#ueber-uns' },
  { key: 'gallery', href: '#galerie' },
] as const

export default function Navbar() {
  const { t, lang, setLang } = useLang()
  const { count, openCart, pulse } = useCart()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const controls = useAnimationControls()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // bump the cart icon whenever something is added
  useEffect(() => {
    if (pulse === 0) return
    controls.start({
      scale: [1, 1.25, 0.92, 1],
      transition: { duration: 0.45, ease: 'easeOut' },
    })
  }, [pulse, controls])

  const solid = scrolled || mobileOpen

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        solid
          ? 'bg-cream/95 shadow-soft backdrop-blur supports-[backdrop-filter]:bg-cream/80'
          : 'bg-transparent'
      }`}
    >
      <nav className="container-px flex h-16 items-center justify-between gap-2 sm:h-20 sm:gap-3">
        {/* Wordmark */}
        <a href="#start" className="shrink-0" aria-label="Bamberger Döner Startseite">
          <Wordmark className="text-base sm:text-2xl" light={!solid} />
        </a>

        {/* Desktop links */}
        <div className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <a
              key={l.key}
              href={l.href}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                solid
                  ? 'text-charcoal hover:bg-black/5'
                  : 'text-white/90 hover:bg-white/10'
              }`}
            >
              {t.nav[l.key]}
            </a>
          ))}
        </div>

        {/* Right cluster */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-3">
          {/* DE / EN / TR toggle */}
          <div
            className={`flex items-center rounded-full p-0.5 text-[0.65rem] font-bold sm:text-xs ${
              solid ? 'bg-black/5' : 'bg-white/15'
            }`}
            role="group"
            aria-label={t.nav.langLabel}
          >
            {(['de', 'en', 'tr'] as const).map((code) => (
              <button
                key={code}
                onClick={() => setLang(code)}
                aria-pressed={lang === code}
                className={`rounded-full px-1 py-1 uppercase transition-colors sm:px-2.5 ${
                  lang === code
                    ? 'bg-doner-red text-white shadow'
                    : solid
                      ? 'text-charcoal/70 hover:text-charcoal'
                      : 'text-white/80 hover:text-white'
                }`}
              >
                {code}
              </button>
            ))}
          </div>

          {/* Order CTA (desktop) */}
          <a href="#menu" className="btn-primary hidden h-10 px-5 py-0 text-sm sm:inline-flex">
            {t.nav.order}
          </a>

          {/* Cart */}
          <motion.button
            animate={controls}
            onClick={openCart}
            aria-label={`${t.nav.openCart} (${count})`}
            className={`relative grid h-8 w-8 place-items-center rounded-full transition-colors sm:h-10 sm:w-10 ${
              solid ? 'bg-charcoal text-white hover:bg-charcoal-soft' : 'bg-white text-charcoal'
            }`}
          >
            <ShoppingBag className="h-5 w-5" aria-hidden />
            <AnimatePresence>
              {count > 0 && (
                <motion.span
                  key="badge"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -right-1 -top-1 grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-amber-brand px-1 text-[0.7rem] font-extrabold text-charcoal ring-2 ring-cream"
                >
                  {count}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Menu"
            aria-expanded={mobileOpen}
            className={`grid h-8 w-8 place-items-center rounded-full sm:h-10 sm:w-10 lg:hidden ${
              solid ? 'text-charcoal hover:bg-black/5' : 'text-white hover:bg-white/10'
            }`}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile dropdown */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-black/5 bg-cream lg:hidden"
          >
            <div className="container-px flex flex-col gap-1 py-4">
              {links.map((l) => (
                <a
                  key={l.key}
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl px-4 py-3 text-base font-semibold text-charcoal hover:bg-black/5"
                >
                  {t.nav[l.key]}
                </a>
              ))}
              <a
                href="#menu"
                onClick={() => setMobileOpen(false)}
                className="btn-primary mt-2 w-full"
              >
                {t.nav.order}
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
