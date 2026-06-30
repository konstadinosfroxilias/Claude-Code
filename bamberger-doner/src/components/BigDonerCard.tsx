import { motion } from 'framer-motion'
import { Flame, Trophy, Plus } from 'lucide-react'
import { formatPrice, type MenuItem } from '../config/menu'
import { useLang } from '../context/LanguageContext'
import SmartImage from './SmartImage'

export default function BigDonerCard({
  item,
  onAdd,
}: {
  item: MenuItem
  onAdd: (item: MenuItem) => void
}) {
  const { t, lang, pick } = useLang()

  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-4xl bg-charcoal text-white shadow-card ring-1 ring-white/5"
    >
      <div className="grid gap-0 md:grid-cols-2">
        {/* image */}
        <div className="relative min-h-[220px] md:min-h-full md:order-2">
          <SmartImage
            src={item.image}
            alt={pick(item.name)}
            className="absolute inset-0 h-full w-full"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/30 to-transparent md:bg-gradient-to-l" />
          {item.tag && (
            <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-amber-brand px-3 py-1 text-sm font-extrabold uppercase text-charcoal shadow-soft">
              <Flame className="h-4 w-4" aria-hidden />
              {pick(item.tag)}
            </span>
          )}
        </div>

        {/* content */}
        <div className="relative z-10 flex flex-col justify-center p-6 sm:p-9 md:order-1">
          <div className="eyebrow text-amber-brand">
            <Trophy className="h-4 w-4" aria-hidden />
            Challenge
          </div>
          <h3 className="mt-3 font-display text-3xl uppercase leading-[0.95] sm:text-4xl lg:text-5xl">
            {pick(item.name)}
          </h3>
          <p className="mt-3 max-w-md text-sm text-cream/80 sm:text-base">{pick(item.desc)}</p>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <span className="font-display text-3xl text-amber-brand sm:text-4xl">
              {formatPrice(item.price, lang)}
            </span>
            <button onClick={() => onAdd(item)} className="btn-primary group">
              <Plus className="h-5 w-5 transition-transform group-hover:rotate-90" aria-hidden />
              {t.menu.challengeCta}
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  )
}
