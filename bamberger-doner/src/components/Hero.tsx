import { motion, useScroll, useTransform } from 'framer-motion'
import { Star, Clock, ArrowRight, Flame, ChevronDown } from 'lucide-react'
import { useLang } from '../context/LanguageContext'
import { business, getTodayHours, images } from '../data/content'
import SmartImage from './SmartImage'
import Stamp from './Stamp'
import SkylineDivider from './SkylineDivider'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } },
}
const word = {
  hidden: { y: '0.4em', opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring', damping: 14, stiffness: 170 },
  },
}

export default function Hero() {
  const { t, lang, pick } = useLang()
  const today = getTodayHours(lang)

  // gentle parallax on the background photo
  const { scrollY } = useScroll()
  const yBg = useTransform(scrollY, [0, 700], [0, 90])
  const scaleBg = useTransform(scrollY, [0, 700], [1, 1.08])

  const words = pick(business.slogan).split(' ')

  return (
    <section id="start" className="grain relative isolate overflow-hidden bg-charcoal">
      {/* Background photo (parallax) */}
      <motion.div style={{ y: yBg, scale: scaleBg }} className="absolute -top-[6%] -z-10 h-[112%] w-full">
        <SmartImage
          src={images.hero}
          alt="Frisch gegrillter Döner / Dürüm"
          className="h-full w-full"
          eager
        />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/70 to-charcoal/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-charcoal/85 via-charcoal/35 to-transparent" />
      </motion.div>

      {/* soft colour glow */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="absolute -left-20 top-1/4 h-72 w-72 rounded-full bg-doner-red/40 blur-3xl animate-blob" />
        <div
          className="absolute right-0 top-10 h-72 w-72 rounded-full bg-amber-brand/25 blur-3xl animate-blob"
          style={{ animationDelay: '4s' }}
        />
      </div>

      <div className="container-px relative flex min-h-[92svh] flex-col justify-center pb-28 pt-28 sm:min-h-[90vh]">
        <div className="max-w-2xl">
          {/* Commission-free pill */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full bg-doner-red px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-white shadow-soft ring-1 ring-white/10 sm:text-sm"
          >
            <Flame className="h-4 w-4 animate-wiggle text-amber-brand" aria-hidden />
            {t.common.commissionFree}
          </motion.div>

          {/* Slogan — word-by-word reveal, comfortable leading (no overlap) */}
          <motion.h1
            variants={container}
            initial="hidden"
            animate="show"
            className="font-display text-[clamp(2.1rem,8.5vw,4.6rem)] uppercase leading-[1.06] text-white [text-shadow:0_2px_28px_rgba(0,0,0,0.45)]"
          >
            {words.map((w, i) => (
              <motion.span key={`${w}-${i}`} variants={word} className="mr-[0.28em] inline-block">
                {i === words.length - 1 ? <span className="text-gradient">{w}</span> : w}
              </motion.span>
            ))}
          </motion.h1>

          {/* Subline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-6 max-w-xl text-pretty text-base text-cream/90 sm:text-lg"
          >
            {t.hero.subline}
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
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
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white ring-1 ring-white/20 backdrop-blur">
              <span className="relative flex h-2.5 w-2.5" aria-hidden>
                {today.open && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                    today.open ? 'bg-green-400' : 'bg-red-400'
                  }`}
                />
              </span>
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

        {/* Floating stamp */}
        <motion.div
          initial={{ opacity: 0, scale: 0.6, rotate: 8 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="absolute right-4 top-24 hidden animate-float-slow sm:right-8 sm:top-28 md:block"
        >
          <Stamp />
        </motion.div>

        {/* Scroll cue */}
        <motion.a
          href="#menu"
          aria-label={t.hero.ctaMenu}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute bottom-24 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1 text-white/70 hover:text-white sm:flex"
        >
          <ChevronDown className="h-6 w-6 animate-float" aria-hidden />
        </motion.a>
      </div>

      {/* Skyline transition into the page background */}
      <div className="absolute inset-x-0 bottom-0 z-10 text-cream">
        <SkylineDivider />
      </div>
    </section>
  )
}
