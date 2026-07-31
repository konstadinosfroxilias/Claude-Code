import { AnimatePresence, motion } from 'framer-motion'
import { ShoppingBag, ArrowRight } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useLang } from '../context/LanguageContext'
import { formatPrice } from '../data/content'

/**
 * A floating "order" bar pinned to the bottom on phones. Appears once there's
 * something in the cart (and the cart drawer isn't open), so checking out is
 * always one tap away — most döner customers order on their phone.
 */
export default function MobileOrderBar() {
  const { count, subtotal, isOpen, openCart } = useCart()
  const { t, lang } = useLang()

  const visible = count > 0 && !isOpen

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          onClick={openCart}
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="fixed inset-x-3 bottom-4 z-40 flex items-center justify-between gap-3 rounded-full bg-charcoal py-2 pl-3 pr-2 text-white shadow-card ring-1 ring-white/10 dark:bg-charcoal-soft lg:hidden"
          style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
          aria-label={t.cart.checkout}
        >
          <span className="flex items-center gap-2.5">
            <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10">
              <ShoppingBag className="h-5 w-5" aria-hidden />
              <span className="absolute -right-1 -top-1 grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-amber-brand px-1 text-[0.7rem] font-extrabold text-charcoal">
                {count}
              </span>
            </span>
            <span className="text-left leading-tight">
              <span className="block text-[0.7rem] uppercase tracking-wide text-white/60">
                {count} {t.cart.items}
              </span>
              <span className="block font-display text-lg">{formatPrice(subtotal, lang)}</span>
            </span>
          </span>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-doner-red px-5 py-2.5 text-sm font-semibold">
            {t.cart.checkout}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  )
}
