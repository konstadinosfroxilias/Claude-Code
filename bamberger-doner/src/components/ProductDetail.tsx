import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Check, Plus, Minus, X, Leaf } from 'lucide-react'
import {
  meatOptions,
  sauceOptions,
  ingredientOptions,
  extraOptions,
  formatPrice,
  type MenuItem,
} from '../data/content'
import type { CartOptions } from '../context/CartContext'
import { useLang } from '../context/LanguageContext'
import SmartImage from './SmartImage'

interface ProductDetailProps {
  item: MenuItem | null
  onClose: () => void
  onAdd: (item: MenuItem, options: CartOptions, qty: number, unitPrice: number) => void
}

/**
 * Full-screen product page for FOOD items: big photo + description and the
 * add/remove options (meat, sauce, remove ingredients, add paid extras).
 * Drinks never open this — they're added straight to the cart.
 */
export default function ProductDetail({ item, onClose, onAdd }: ProductDetailProps) {
  const { t, lang, pick } = useLang()

  const [meat, setMeat] = useState(meatOptions[0].id)
  const [sauce, setSauce] = useState(sauceOptions[0].id)
  const [removed, setRemoved] = useState<Set<string>>(new Set())
  const [extras, setExtras] = useState<Set<string>>(new Set())
  const [qty, setQty] = useState(1)

  // which option groups make sense for this dish
  const showMeat = !!item?.customizable
  const showSauce = !!item && (item.customizable || item.category === 'vegetarisch')
  const showIngredients = showSauce
  const showExtras = showSauce
  const availableExtras = useMemo(
    () => extraOptions.filter((e) => !e.meatOnly || showMeat),
    [showMeat],
  )

  // reset every time a new product opens
  useEffect(() => {
    if (item) {
      setMeat(meatOptions[0].id)
      setSauce(sauceOptions[0].id)
      setRemoved(new Set())
      setExtras(new Set())
      setQty(1)
    }
  }, [item])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const extrasSum = useMemo(
    () => availableExtras.filter((e) => extras.has(e.id)).reduce((s, e) => s + e.price, 0),
    [extras, availableExtras],
  )
  const unitPrice = (item?.price ?? 0) + extrasSum
  const total = unitPrice * qty

  const toggle = (set: Set<string>, id: string): Set<string> => {
    const next = new Set(set)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  }

  const handleAdd = () => {
    if (!item) return
    const options: CartOptions = {}
    if (showMeat) options.meat = meat
    if (showSauce) options.sauce = sauce
    if (showIngredients && removed.size) options.removed = [...removed]
    if (showExtras && extras.size) options.extras = [...extras]
    onAdd(item, options, qty, unitPrice)
    onClose()
  }

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          className="fixed inset-0 z-[65] flex sm:items-center sm:justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 hidden bg-charcoal/60 backdrop-blur-sm sm:block"
            onClick={onClose}
            aria-hidden
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={pick(item.name)}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="relative z-10 flex h-full w-full flex-col overflow-hidden bg-cream shadow-card dark:bg-charcoal sm:h-auto sm:max-h-[92vh] sm:max-w-lg sm:rounded-4xl"
          >
            {/* header photo */}
            <div className="relative h-56 w-full shrink-0 sm:h-64">
              <SmartImage src={item.image} alt={pick(item.name)} className="h-full w-full" eager />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-charcoal/10 to-transparent" />
              <button
                onClick={onClose}
                aria-label={t.checkout.back}
                className="absolute left-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-charcoal shadow-soft hover:bg-white"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <button
                onClick={onClose}
                aria-label={t.common.close}
                className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-charcoal shadow-soft hover:bg-white sm:flex"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="absolute inset-x-4 bottom-3">
                <div className="flex flex-wrap items-center gap-2">
                  {item.tag && (
                    <span className="badge bg-amber-brand text-charcoal shadow-soft">{pick(item.tag)}</span>
                  )}
                  {item.vegetarian && (
                    <span className="badge bg-green-600 text-white shadow-soft">
                      <Leaf className="h-3 w-3" aria-hidden /> {t.menu.vegetarian}
                    </span>
                  )}
                </div>
                <h2 className="mt-1.5 font-display text-3xl uppercase leading-tight text-white drop-shadow">
                  {pick(item.name)}
                </h2>
              </div>
            </div>

            {/* scrollable body */}
            <div className="flex-1 overflow-y-auto p-5">
              <p className="text-sm text-charcoal/70 dark:text-cream/70">{pick(item.desc)}</p>

              {showMeat && (
                <SingleGroup
                  label={t.options.meat}
                  options={meatOptions.map((o) => ({ id: o.id, label: pick(o.label) }))}
                  value={meat}
                  onChange={setMeat}
                />
              )}

              {showSauce && (
                <SingleGroup
                  label={t.options.sauce}
                  options={sauceOptions.map((o) => ({ id: o.id, label: pick(o.label) }))}
                  value={sauce}
                  onChange={setSauce}
                />
              )}

              {showIngredients && (
                <div className="mt-6">
                  <GroupLabel label={t.product.ingredients} hint={t.product.ingredientsHint} />
                  <div className="flex flex-wrap gap-2">
                    {ingredientOptions.map((o) => {
                      const isRemoved = removed.has(o.id)
                      return (
                        <button
                          key={o.id}
                          onClick={() => setRemoved((s) => toggle(s, o.id))}
                          aria-pressed={!isRemoved}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-semibold transition-all ${
                            isRemoved
                              ? 'border-black/10 bg-transparent text-charcoal/40 line-through dark:border-white/10 dark:text-cream/40'
                              : 'border-doner-red/40 bg-doner-red/5 text-charcoal dark:text-cream'
                          }`}
                        >
                          {isRemoved ? (
                            <Plus className="h-3.5 w-3.5" aria-hidden />
                          ) : (
                            <Check className="h-3.5 w-3.5 text-doner-red" aria-hidden />
                          )}
                          {pick(o.label)}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {showExtras && availableExtras.length > 0 && (
                <div className="mt-6">
                  <GroupLabel label={t.product.extras} hint={t.product.extrasHint} />
                  <div className="flex flex-wrap gap-2">
                    {availableExtras.map((o) => {
                      const isAdded = extras.has(o.id)
                      return (
                        <button
                          key={o.id}
                          onClick={() => setExtras((s) => toggle(s, o.id))}
                          aria-pressed={isAdded}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-semibold transition-all ${
                            isAdded
                              ? 'border-doner-red bg-doner-red text-white shadow-soft'
                              : 'border-black/10 bg-white text-charcoal hover:border-doner-red/40 dark:border-white/10 dark:bg-charcoal-soft dark:text-cream'
                          }`}
                        >
                          {isAdded ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Plus className="h-3.5 w-3.5" aria-hidden />}
                          {pick(o.label)}
                          <span className={isAdded ? 'text-white/80' : 'text-charcoal/50 dark:text-cream/50'}>
                            +{formatPrice(o.price, lang)}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* quantity */}
              <div className="mt-6 flex items-center justify-between">
                <GroupLabel label={t.product.quantity} />
                <div className="inline-flex items-center rounded-full bg-cream-deep dark:bg-white/5">
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    aria-label="-"
                    className="grid h-10 w-10 place-items-center rounded-full text-charcoal hover:bg-black/5 dark:text-cream dark:hover:bg-white/10"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center font-bold">{qty}</span>
                  <button
                    onClick={() => setQty((q) => q + 1)}
                    aria-label="+"
                    className="grid h-10 w-10 place-items-center rounded-full text-charcoal hover:bg-black/5 dark:text-cream dark:hover:bg-white/10"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* sticky footer */}
            <div className="border-t border-black/5 bg-white p-4 dark:border-white/10 dark:bg-charcoal-soft">
              <button onClick={handleAdd} className="btn-primary w-full text-base">
                {t.product.add}
                <span className="ml-1 font-bold">{formatPrice(total, lang)}</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function GroupLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="mb-2 flex items-baseline gap-2">
      <span className="font-heading text-xs font-bold uppercase tracking-[0.18em] text-charcoal/60 dark:text-cream/60">
        {label}
      </span>
      {hint && <span className="text-xs text-charcoal/40 dark:text-cream/40">{hint}</span>}
    </div>
  )
}

function SingleGroup({
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
    <div className="mt-6">
      <GroupLabel label={label} />
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
                  : 'border-black/10 bg-white text-charcoal hover:border-doner-red/40 dark:border-white/10 dark:bg-charcoal-soft dark:text-cream'
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
