import { motion } from 'framer-motion'
import { Flame, BadgePercent, MapPin, HeartHandshake } from 'lucide-react'
import { useLang } from '../context/LanguageContext'

export default function Highlights() {
  const { t } = useLang()

  const items = [
    { icon: Flame, ...t.highlights.fresh },
    { icon: BadgePercent, ...t.highlights.direct },
    { icon: MapPin, ...t.highlights.two },
    { icon: HeartHandshake, ...t.highlights.since },
  ]

  return (
    <section className="bg-cream">
      <div className="container-px py-10 sm:py-14">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {items.map((item, i) => {
            const Icon = item.icon
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                whileHover={{ y: -6 }}
                className="card group flex items-center gap-3 p-4 transition-shadow hover:shadow-card sm:flex-col sm:items-start sm:gap-4 sm:p-6"
              >
                <div className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-doner-red/15 to-amber-brand/20 text-doner-red transition-transform group-hover:scale-110 sm:h-12 sm:w-12">
                  {/* the "fresh off the spit" card gets a slowly rotating ring — a nod to the Drehspieß */}
                  {i === 0 && (
                    <span className="pointer-events-none absolute inset-0 animate-spin-slow rounded-2xl border-2 border-dashed border-doner-red/30" />
                  )}
                  <Icon className="h-6 w-6 transition-transform duration-300 group-hover:-rotate-12" aria-hidden />
                </div>
                <div>
                  <h3 className="font-heading text-sm font-bold uppercase leading-tight tracking-wide text-charcoal dark:text-cream sm:text-base">
                    {item.title}
                  </h3>
                  <p className="mt-0.5 text-xs text-charcoal/60 dark:text-cream/60 sm:text-sm">{item.sub}</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
