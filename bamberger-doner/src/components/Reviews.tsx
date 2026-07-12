import { motion } from 'framer-motion'
import { Star, Quote } from 'lucide-react'
import { useLang } from '../context/LanguageContext'
import { reviews, business } from '../data/content'

const avatarColors = [
  'bg-doner-red',
  'bg-amber-brand text-charcoal',
  'bg-charcoal',
  'bg-doner-red-dark',
]

function Stars({ count = 5 }: { count?: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${count} von 5 Sternen`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < count ? 'fill-amber-brand text-amber-brand' : 'text-black/15'}`}
          aria-hidden
        />
      ))}
    </div>
  )
}

export default function Reviews() {
  const { t, lang, pick } = useLang()

  return (
    <section className="bg-cream-deep py-16 sm:py-24">
      <div className="container-px">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div className="max-w-xl">
            <span className="eyebrow">{t.reviews.eyebrow}</span>
            <h2 className="section-title mt-3">{t.reviews.title}</h2>
          </div>

          {/* Google rating badge */}
          <div className="inline-flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-soft ring-1 ring-black/5">
            <span className="font-display text-3xl text-charcoal">
              {business.rating.toLocaleString(lang === 'en' ? 'en-US' : 'de-DE')}
            </span>
            <div>
              <Stars />
              <div className="mt-0.5 text-xs text-charcoal/60">
                <span className="font-bold text-[#4285F4]">G</span>
                <span className="font-bold text-[#EA4335]">o</span>
                <span className="font-bold text-[#FBBC05]">o</span>
                <span className="font-bold text-[#4285F4]">g</span>
                <span className="font-bold text-[#34A853]">l</span>
                <span className="font-bold text-[#EA4335]">e</span>
                {' · '}
                {business.ratingCount}+ {t.reviews.reviewsWord}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
          {reviews.map((r, i) => (
            <motion.figure
              key={r.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              whileHover={{ y: -6 }}
              className="card relative flex flex-col p-5 transition-shadow hover:shadow-card"
            >
              <Quote className="absolute right-4 top-4 h-7 w-7 text-doner-red/10" aria-hidden />
              <Stars />
              <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-charcoal/80">
                “{pick(r.text)}”
              </blockquote>
              <figcaption className="mt-4 flex items-center gap-3">
                <span
                  className={`grid h-10 w-10 place-items-center rounded-full text-sm font-bold text-white ${
                    avatarColors[i % avatarColors.length]
                  }`}
                >
                  {r.initials}
                </span>
                <span>
                  <span className="block text-sm font-bold text-charcoal">{r.name}</span>
                  <span className="block text-xs text-charcoal/50">{r.location}</span>
                </span>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  )
}
