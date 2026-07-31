import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Check } from 'lucide-react'
import {
  meatOptions,
  sauceOptions,
  formatPrice,
  type MenuItem,
} from '../data/content'
import type { CartOptions } from '../context/CartContext'
import { useLang } from '../context/LanguageContext'
import SmartImage from './SmartImage'

interface OptionModalProps {
  item: MenuItem | null
  onClose: () => void
  onConfirm: (options: CartOptions) => void
}

export default function OptionModal({ item, onClose, onConfirm }: OptionModalProps) {
  const { t, lang, pick } = useLang()
  const [meat, setMeat] = useState(meatOptions[0].id)
  const [sauce, setSauce] = useState(sauceOptions[0].id)

  // reset selections each time a new item opens
  useEffect(() => {
    if (item) {
      setMeat(meatOptions[0].id)
      setSauce(sauceOptions[0].id)
    }
  }, [item])

  // close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-charcoal/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={pick(item.name)}
            initial={{ y: '100%', opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.6 }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-t-4xl bg-cream shadow-card dark:bg-charcoal sm:rounded-4xl"
          >
            {/* header image */}
            <div className="relative h-36 w-full sm:h-40">
              <SmartImage src={item.image} alt={pick(item.name)} className="h-full w-full" />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 to-transparent" />
              <button
                onClick={onClose}
                aria-label={t.common.close}
                className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-charcoal hover:bg-white"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="absolute bottom-3 left-4 right-4">
                <h3 className="font-display text-2xl uppercase leading-tight text-white drop-shadow">
                  {pick(item.name)}
                </h3>
              </div>
            </div>

            <div className="max-h-[55vh] overflow-y-auto p-5">
              <p className="text-sm text-charcoal/70 dark:text-cream/70">{pick(item.desc)}</p>

              {/* meat */}
              <OptionGroup
                label={t.options.meat}
                options={meatOptions.map((o) => ({ id: o.id, label: pick(o.label) }))}
                value={meat}
                onChange={setMeat}
              />

              {/* sauce */}
              <OptionGroup
                label={t.options.sauce}
                options={sauceOptions.map((o) => ({ id: o.id, label: pick(o.label) }))}
                value={sauce}
                onChange={setSauce}
              />
            </div>

            {/* footer */}
            <div className="flex items-center gap-3 border-t border-black/5 bg-white p-4 dark:border-white/10 dark:bg-charcoal-soft">
              <button onClick={onClose} className="btn-ghost flex-1">
                {t.options.cancel}
              </button>
              <button
                onClick={() => onConfirm({ meat, sauce })}
                className="btn-primary flex-[1.4]"
              >
                {t.options.addToCart}
                <span className="ml-1 font-bold">{formatPrice(item.price, lang)}</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function OptionGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { id: string; label: string }[]
  value: string
  onChange: (id: string) => void
}) {
  return (
    <div className="mt-5">
      <div className="mb-2 font-heading text-xs font-bold uppercase tracking-[0.18em] text-charcoal/60 dark:text-cream/60">
        {label}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {options.map((o) => {
          const active = o.id === value
          return (
            <button
              key={o.id}
              onClick={() => onChange(o.id)}
              aria-pressed={active}
              className={`relative flex items-center justify-center gap-1 rounded-2xl border px-2 py-2.5 text-sm font-semibold transition-all ${
                active
                  ? 'border-doner-red bg-doner-red text-white shadow-soft'
                  : 'border-black/10 bg-white text-charcoal hover:border-doner-red/40 dark:border-white/10 dark:bg-charcoal-soft dark:text-cream dark:hover:border-doner-red/60'
              }`}
            >
              {active && <Check className="h-4 w-4" aria-hidden />}
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
