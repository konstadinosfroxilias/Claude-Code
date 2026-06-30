import { motion } from 'framer-motion'
import { Star, Store, Heart } from 'lucide-react'
import { useLang } from '../context/LanguageContext'
import { business } from '../config/content'
import { images } from '../config/images'
import SmartImage from './SmartImage'
import Stamp from './Stamp'

export default function About() {
  const { t, lang } = useLang()

  const stats = [
    { icon: Star, value: `${business.rating.toLocaleString(lang === 'de' ? 'de-DE' : 'en-US')}★`, label: t.about.statRating },
    { icon: Store, value: '2', label: t.about.statShops },
    { icon: Heart, value: business.since.toString(), label: t.about.statSince },
  ]

  return (
    <section id="ueber-uns" className="scroll-mt-20 bg-cream-deep py-16 sm:py-24">
      <div className="container-px grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        {/* text */}
        <div>
          <span className="eyebrow">{t.about.eyebrow}</span>
          <h2 className="section-title mt-3">{t.about.title}</h2>
          <div className="mt-5 space-y-4 text-charcoal/75">
            <p>{t.about.p1}</p>
            <p>{t.about.p2}</p>
            <p className="font-medium text-charcoal">{t.about.p3}</p>
          </div>

          {/* stats */}
          <div className="mt-8 grid grid-cols-3 gap-3 sm:gap-4">
            {stats.map((s) => {
              const Icon = s.icon
              return (
                <div key={s.label} className="card p-4 text-center">
                  <Icon className="mx-auto h-5 w-5 text-doner-red" aria-hidden />
                  <div className="mt-1.5 font-display text-2xl text-charcoal sm:text-3xl">{s.value}</div>
                  <div className="mt-0.5 text-xs leading-tight text-charcoal/55">{s.label}</div>
                </div>
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
            <SmartImage
              src={images.grill}
              alt="Frisch vom Grill"
              className="col-span-2 aspect-[16/10] rounded-4xl shadow-card"
            />
            <SmartImage
              src={images.aboutInterior}
              alt="Unser Laden"
              className="aspect-square rounded-4xl shadow-card"
            />
            <SmartImage
              src={images.heroSecondary}
              alt="Döner Box"
              className="aspect-square rounded-4xl shadow-card"
            />
          </div>
          <Stamp className="absolute -bottom-5 -left-3 sm:-left-5" />
        </motion.div>
      </div>
    </section>
  )
}
