import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Check, Leaf, ChevronRight } from 'lucide-react'
import { formatPrice, type MenuItem } from '../data/content'
import { useLang } from '../context/LanguageContext'
import SmartImage from './SmartImage'
import TiltCard from './TiltCard'

interface MenuItemCardProps {
  item: MenuItem
  /** food opens the product page; drinks are added straight to the cart */
  onSelect: (item: MenuItem) => void
}

export default function MenuItemCard({ item, onSelect }: MenuItemCardProps) {
  const { t, lang, pick } = useLang()
  const [justAdded, setJustAdded] = useState(false)
  const isDrink = item.category === 'getraenke'

  const handleClick = () => {
    onSelect(item)
    if (isDrink) {
      setJustAdded(true)
      window.setTimeout(() => setJustAdded(false), 1100)
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.4 }}
    >
      <TiltCard className="card group h-full overflow-hidden">
        <button
          onClick={handleClick}
          aria-label={pick(item.name)}
          className="flex h-full w-full flex-col text-left"
        >
          {/* image */}
          <div className="relative aspect-[4/3] w-full overflow-hidden">
            <SmartImage
              src={item.image}
              alt={pick(item.name)}
              className="h-full w-full"
              imgClassName="transition-transform duration-[900ms] ease-out group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal/40 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
              {item.tag && (
                <span className="badge bg-amber-brand text-charcoal shadow-soft">{pick(item.tag)}</span>
              )}
              {item.vegetarian && (
                <span className="badge bg-green-600 text-white shadow-soft">
                  <Leaf className="h-3 w-3" aria-hidden />
                  <span className="hidden sm:inline">{t.menu.vegetarian}</span>
                </span>
              )}
            </div>
          </div>

          {/* body */}
          <div className="flex flex-1 flex-col p-3 sm:p-4" style={{ transform: 'translateZ(30px)' }}>
            <h3 className="font-heading text-sm font-bold uppercase leading-tight tracking-wide text-charcoal transition-colors group-hover:text-doner-red dark:text-cream sm:text-lg">
              {pick(item.name)}
            </h3>
            {/* description is hidden on phones to keep cards compact; shown from sm up */}
            <p className="mt-1 hidden text-sm text-charcoal/60 dark:text-cream/60 sm:line-clamp-2 sm:block">
              {pick(item.desc)}
            </p>

            <div className="mt-3 flex items-center justify-between sm:mt-4">
              <span className="font-display text-lg text-doner-red sm:text-2xl">
                {formatPrice(item.price, lang)}
              </span>

              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-2xl text-white shadow-soft transition-all duration-300 group-hover:scale-105 sm:h-11 sm:w-11 ${
                  justAdded ? 'bg-green-600' : 'bg-doner-red group-hover:bg-doner-red-dark'
                }`}
              >
                {justAdded ? (
                  <Check className="h-5 w-5" aria-hidden />
                ) : isDrink ? (
                  <Plus className="h-5 w-5" aria-hidden />
                ) : (
                  <ChevronRight className="h-5 w-5" aria-hidden />
                )}
              </span>
            </div>
          </div>
        </button>
      </TiltCard>
    </motion.div>
  )
}
