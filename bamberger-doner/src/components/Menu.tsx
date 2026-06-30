import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin } from 'lucide-react'
import { menu, categories, type CategoryId, type MenuItem } from '../config/menu'
import { business } from '../config/content'
import { useLang } from '../context/LanguageContext'
import { useCart, type CartOptions } from '../context/CartContext'
import MenuItemCard from './MenuItemCard'
import BigDonerCard from './BigDonerCard'
import OptionModal from './OptionModal'

type Filter = 'all' | CategoryId

export default function Menu() {
  const { t, pick } = useLang()
  const { add, locationId, setLocationId } = useCart()
  const [filter, setFilter] = useState<Filter>('all')
  const [optionItem, setOptionItem] = useState<MenuItem | null>(null)

  const featured = useMemo(() => menu.find((m) => m.featured), [])

  const visibleItems = useMemo(
    () =>
      menu.filter(
        (m) => !m.featured && (filter === 'all' || m.category === filter),
      ),
    [filter],
  )

  const showFeatured = featured && (filter === 'all' || filter === featured.category)

  const handleAdd = (item: MenuItem) => {
    if (item.customizable) {
      setOptionItem(item)
    } else {
      add(item)
    }
  }

  const handleConfirmOptions = (options: CartOptions) => {
    if (optionItem) add(optionItem, options)
    setOptionItem(null)
  }

  const tabs: { id: Filter; label: string }[] = [
    { id: 'all', label: t.menu.all },
    ...categories.map((c) => ({ id: c.id as Filter, label: pick(c.label) })),
  ]

  return (
    <section id="menu" className="scroll-mt-20 bg-cream py-16 sm:py-24">
      <div className="container-px">
        {/* header */}
        <div className="max-w-2xl">
          <span className="eyebrow">🔥 {t.menu.eyebrow}</span>
          <h2 className="section-title mt-3">{t.menu.title}</h2>
          <p className="mt-3 text-charcoal/70">{t.menu.subtitle}</p>
        </div>

        {/* location switcher */}
        <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-charcoal/70">
            <MapPin className="h-4 w-4 text-doner-red" aria-hidden />
            {t.checkout.pickupAt}:
          </span>
          <div className="inline-flex rounded-full bg-white p-1 shadow-soft ring-1 ring-black/5">
            {business.locations.map((loc) => {
              const active = loc.id === locationId
              return (
                <button
                  key={loc.id}
                  onClick={() => setLocationId(loc.id)}
                  aria-pressed={active}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm ${
                    active
                      ? 'bg-doner-red text-white shadow'
                      : 'text-charcoal/70 hover:text-charcoal'
                  }`}
                >
                  {pick(loc.name)}
                </button>
              )
            })}
          </div>
        </div>

        {/* category tabs */}
        <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => {
            const active = filter === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                aria-pressed={active}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-charcoal text-white shadow-soft'
                    : 'bg-white text-charcoal/70 ring-1 ring-black/5 hover:text-charcoal'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* featured challenge */}
        <AnimatePresence>
          {showFeatured && featured && (
            <motion.div
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-8"
            >
              <BigDonerCard item={featured} onAdd={handleAdd} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* grid */}
        <motion.div
          layout
          className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3"
        >
          <AnimatePresence mode="popLayout">
            {visibleItems.map((item) => (
              <MenuItemCard key={item.id} item={item} onAdd={handleAdd} />
            ))}
          </AnimatePresence>
        </motion.div>

        <p className="mt-6 text-center text-xs text-charcoal/45">
          {pick({
            de: 'Alle Preise inkl. MwSt. Abbildungen ähnlich.',
            en: 'All prices incl. VAT. Images for illustration.',
          })}
        </p>
      </div>

      {/* meat + sauce modal */}
      <OptionModal item={optionItem} onClose={() => setOptionItem(null)} onConfirm={handleConfirmOptions} />
    </section>
  )
}
