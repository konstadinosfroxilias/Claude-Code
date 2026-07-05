import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Check, Leaf, Settings2 } from 'lucide-react'
import { formatPrice, type MenuItem } from '../data/content'
import { useLang } from '../context/LanguageContext'
import SmartImage from './SmartImage'
import TiltCard from './TiltCard'

interface MenuItemCardProps {
  item: MenuItem
  onAdd: (item: MenuItem) => void
}

export default function MenuItemCard({ item, onAdd }: MenuItemCardProps) {
  const { t, lang, pick } = useLang()
  const [justAdded, setJustAdded] = useState(false)

  const handleAdd = () => {
    onAdd(item)
    if (!item.customizable) {
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
      <TiltCard className="card group flex h-full flex-col overflow-hidden">
        {/* image */}
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          <SmartImage
            src={item.image}
            alt={pick(item.name)}
            className="h-full w-full"
            imgClassName="transition-transform duration-[900ms] ease-out group-hover:scale-110"
          />
          {/* hover glow */}
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/40 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          {/* badges */}
          <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
            {item.tag && (
              <span className="badge bg-amber-brand text-charcoal shadow-soft">
                {pick(item.tag)}
              </span>
            )}
            {item.vegetarian && (
              <span className="badge bg-green-600 text-white shadow-soft">
                <Leaf className="h-3 w-3" aria-hidden />
                {t.menu.vegetarian}
              </span>
            )}
          </div>
        </div>

        {/* body */}
        <div className="flex flex-1 flex-col p-4" style={{ transform: 'translateZ(30px)' }}>
          <h3 className="font-heading text-base font-bold uppercase leading-tight tracking-wide text-charcoal transition-colors group-hover:text-doner-red sm:text-lg">
            {pick(item.name)}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm text-charcoal/60">{pick(item.desc)}</p>

          <div className="mt-4 flex items-center justify-between">
            <span className="font-display text-xl text-doner-red sm:text-2xl">
              {formatPrice(item.price, lang)}
            </span>

            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={handleAdd}
              aria-label={`${t.menu.add}: ${pick(item.name)}`}
              className={`relative grid h-11 w-11 place-items-center rounded-2xl text-white shadow-soft transition-all duration-300 hover:rotate-3 hover:scale-105 ${
                justAdded ? 'bg-green-600' : 'bg-doner-red hover:bg-doner-red-dark'
              }`}
            >
              {justAdded ? (
                <motion.span initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}>
                  <Check className="h-5 w-5" aria-hidden />
                </motion.span>
              ) : item.customizable ? (
                <Settings2 className="h-5 w-5" aria-hidden />
              ) : (
                <Plus className="h-5 w-5" aria-hidden />
              )}
            </motion.button>
          </div>
        </div>
      </TiltCard>
    </motion.div>
  )
}
