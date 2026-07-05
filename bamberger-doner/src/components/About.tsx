import { motion } from 'framer-motion'
import { Star, Store, Heart } from 'lucide-react'
import { useLang } from '../context/LanguageContext'
import { business, images } from '../data/content'
import SmartImage from './SmartImage'
import Stamp from './Stamp'
import CountUp from './CountUp'
import Blobs from './Blobs'

export default function About() {
  const { t, lang } = useLang()
  const locale = lang === 'de' ? 'de-DE' : 'en-US'

  const stats = [
    { icon: Star, node: <CountUp value={business.rating} decimals={1} suffix="★" locale={locale} />, label: t.about.statRating },
    { icon: Store, node: <CountUp value={2} locale={locale} />, label: t.about.statShops },
    { icon: Heart, node: <CountUp value={business.since} grouping={false} />, label: t.about.statSince },
  ]

  return (
    <section id="ueber-uns" className="grain relative scroll-mt-20 overflow-hidden bg-cream-deep py-16 sm:py-24">
      <Blobs />
      <div className="container-px relative grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        {/* text */}
        <div>
          <span className="eyebrow">{t.about.eyebrow}</span>
          <h2 className="section-title mt-3 text-balance">{t.about.title}</h2>
          <div className="mt-5 space-y-4 text-pretty text-charcoal/75">
            <p>{t.about.p1}</p>
            <p>{t.about.p2}</p>
            <p className="font-medium text-charcoal">{t.about.p3}</p>
          </div>

          {/* stats */}
          <div className="mt-8 grid grid-cols-3 gap-3 sm:gap-4">
            {stats.map((s, i) => {
              const Icon = s.icon
              return (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  whileHover={{ y: -4 }}
                  className="card p-4 text-center"
                >
                  <Icon className="mx-auto h-5 w-5 text-doner-red" aria-hidden />
                  <div className="mt-1.5 font-display text-2xl text-charcoal sm:text-3xl">{s.node}</div>
                  <div className="mt-0.5 text-xs leading-tight text-charcoal/55">{s.label}</div>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* image collage */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
          className="relative"
        >
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="col-span-2 overflow-hidden rounded-4xl shadow-card">
              <SmartImage
                src={images.grill}
                alt="Frisch vom Grill"
                className="aspect-[16/10] w-full transition-transform duration-700 hover:scale-105"
              />
            </div>
            <div className="overflow-hidden rounded-4xl shadow-card">
              <SmartImage
                src={images.aboutInterior}
                alt="Unser Laden"
                className="aspect-square w-full transition-transform duration-700 hover:scale-105"
              />
            </div>
            <div className="overflow-hidden rounded-4xl shadow-card">
              <SmartImage
                src={images.heroSecondary}
                alt="Döner Box"
                className="aspect-square w-full transition-transform duration-700 hover:scale-105"
              />
            </div>
          </div>
          <Stamp className="absolute -bottom-5 -left-3 animate-float-slow sm:-left-5" />
        </motion.div>
      </div>
    </section>
  )
}
