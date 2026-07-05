import { motion } from 'framer-motion'
import { Flame, Trophy, Plus } from 'lucide-react'
import { formatPrice, type MenuItem } from '../data/content'
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
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5 }}
      className="group relative"
    >
      {/* glowing gradient border */}
      <div className="absolute -inset-0.5 rounded-[2.1rem] bg-gradient-to-r from-doner-red via-amber-brand to-doner-red bg-[length:200%_auto] opacity-60 blur-[6px] animate-gradient-pan transition-opacity duration-500 group-hover:opacity-90" />

      <article className="grain relative overflow-hidden rounded-4xl bg-charcoal text-white shadow-card ring-1 ring-white/10">
        <div className="grid gap-0 md:grid-cols-2">
          {/* image */}
          <div className="relative min-h-[220px] md:order-2 md:min-h-full">
            <SmartImage
              src={item.image}
              alt={pick(item.name)}
              className="absolute inset-0 h-full w-full"
              imgClassName="transition-transform duration-[1200ms] ease-out group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/30 to-transparent md:bg-gradient-to-l" />
            {item.tag && (
              <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-amber-brand px-3 py-1 text-sm font-extrabold uppercase text-charcoal shadow-soft">
                <Flame className="h-4 w-4 animate-wiggle" aria-hidden />
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
            <h3 className="mt-3 font-display text-3xl uppercase leading-[1.02] sm:text-4xl lg:text-5xl">
              {pick(item.name)}
            </h3>
            <p className="mt-3 max-w-md text-pretty text-sm text-cream/80 sm:text-base">
              {pick(item.desc)}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <span className="font-display text-3xl text-amber-brand sm:text-4xl">
                {formatPrice(item.price, lang)}
              </span>
              <button onClick={() => onAdd(item)} className="btn-primary group/btn">
                <Plus className="h-5 w-5 transition-transform group-hover/btn:rotate-90" aria-hidden />
                {t.menu.challengeCta}
              </button>
            </div>
          </div>
        </div>
      </article>
    </motion.div>
  )
}
