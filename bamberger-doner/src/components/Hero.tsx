import { motion } from 'framer-motion'
import { Star, Clock, ArrowRight, Flame } from 'lucide-react'
import { useLang } from '../context/LanguageContext'
import { business, getTodayHours } from '../config/content'
import { images } from '../config/images'
import SmartImage from './SmartImage'
import Stamp from './Stamp'
import SkylineDivider from './SkylineDivider'

export default function Hero() {
  const { t, lang, pick } = useLang()
  const today = getTodayHours(lang)

  return (
    <section id="start" className="relative isolate overflow-hidden bg-charcoal">
      {/* Background photo */}
      <div className="absolute inset-0 -z-10">
        <SmartImage
          src={images.hero}
          alt="Frisch gegrillter Döner / Dürüm"
          className="h-full w-full"
          eager
        />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/70 to-charcoal/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-charcoal/80 via-charcoal/30 to-transparent" />
      </div>

      <div className="container-px relative flex min-h-[92svh] flex-col justify-center pb-24 pt-28 sm:min-h-[90vh] sm:pb-28">
        <div className="max-w-2xl">
          {/* Commission-free pill */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full bg-doner-red/95 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-white shadow-soft sm:text-sm"
          >
            <Flame className="h-4 w-4 text-amber-brand" aria-hidden />
            {t.common.commissionFree}
          </motion.div>

          {/* Slogan */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="font-display text-[clamp(2rem,8.5vw,4.5rem)] uppercase leading-[0.95] text-white drop-shadow-sm"
          >
            {pick(business.slogan)}
          </motion.h1>

          {/* Subline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-5 max-w-xl text-base text-cream/90 sm:text-lg"
          >
            {t.hero.subline}
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <a href="#menu" className="btn-primary group text-base">
              {t.hero.ctaOrder}
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden />
            </a>
            <a href="#menu" className="btn-ghost text-base">
              {t.hero.ctaMenu}
            </a>
          </motion.div>

          {/* Info badge: today's hours + rating */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white ring-1 ring-white/20 backdrop-blur">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  today.open ? 'bg-green-400' : 'bg-red-400'
                }`}
                aria-hidden
              />
              <span className="font-semibold">
                {today.open ? t.hero.openNow : t.hero.closedNow}
              </span>
              <span className="text-white/50">·</span>
              <Clock className="h-4 w-4 text-amber-brand" aria-hidden />
              {today.label}
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/20 backdrop-blur">
              <Star className="h-4 w-4 fill-amber-brand text-amber-brand" aria-hidden />
              {business.rating.toLocaleString(lang === 'de' ? 'de-DE' : 'en-US')}★
              <span className="font-normal text-white/80">{t.hero.ratingSuffix}</span>
            </div>
          </motion.div>
        </div>

        {/* Stamp */}
        <motion.div
          initial={{ opacity: 0, scale: 0.6, rotate: 8 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="absolute right-4 top-24 hidden sm:right-8 sm:top-28 md:block"
        >
          <Stamp />
        </motion.div>
      </div>

      {/* Skyline transition into the page background */}
      <div className="absolute inset-x-0 bottom-0 text-cream">
        <SkylineDivider />
      </div>
    </section>
  )
}
