import { motion } from 'framer-motion'
import { MapPin, Phone, Clock, Navigation } from 'lucide-react'
import { useLang } from '../context/LanguageContext'
import { business, type Location } from '../config/content'

/** A purely decorative, CSS-drawn "map" look — no real maps API is called. */
function FauxMap({ label }: { label: string }) {
  const { t } = useLang()
  return (
    <div className="relative h-44 overflow-hidden bg-[#eaf0ea]">
      {/* subtle map grid */}
      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            'linear-gradient(#d6e0d6 1px, transparent 1px), linear-gradient(90deg, #d6e0d6 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      {/* roads */}
      <div className="absolute left-0 right-0 top-1/2 h-3 -translate-y-1/2 -rotate-3 bg-white shadow-sm" />
      <div className="absolute bottom-6 left-0 right-0 h-2 rotate-6 bg-white shadow-sm" />
      <div className="absolute bottom-0 left-1/3 top-0 w-2.5 rotate-12 bg-white shadow-sm" />
      {/* river (Bamberg's Regnitz nod) */}
      <div className="absolute -right-6 top-0 h-full w-12 rotate-12 bg-[#bcd7e8]/80" />

      {/* pin */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
        <span className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-doner-red/30" />
        <MapPin className="relative h-9 w-9 fill-doner-red text-white drop-shadow" aria-hidden />
      </div>

      {/* hint chip */}
      <span className="absolute right-3 top-3 rounded-full bg-white/85 px-2.5 py-1 text-[0.7rem] font-semibold text-charcoal/60 backdrop-blur">
        {t.locations.mapHint}
      </span>

      {/* address chip */}
      <div className="absolute bottom-3 left-3 rounded-xl bg-white/95 px-3 py-1.5 text-sm font-semibold text-charcoal shadow-soft backdrop-blur">
        {label}
      </div>
    </div>
  )
}

function LocationCard({ loc, i }: { loc: Location; i: number }) {
  const { t, pick } = useLang()
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `Bamberger Döner, ${loc.address}, ${loc.city}`,
  )}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, delay: i * 0.1 }}
      className="card overflow-hidden"
    >
      <FauxMap label={`${loc.address}, ${loc.city}`} />

      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-2xl uppercase leading-tight text-charcoal">
              {pick(loc.name)}
            </h3>
            <p className="mt-1 text-sm text-charcoal/60">{pick(loc.note)}</p>
          </div>
          <span className="badge shrink-0 bg-amber-brand/15 text-amber-brand-dark">
            {pick(loc.opened)}
          </span>
        </div>

        <div className="mt-4 space-y-2.5 text-sm">
          <div className="flex items-start gap-2.5">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-doner-red" aria-hidden />
            <span className="text-charcoal/80">
              {loc.address}
              <br />
              {loc.city}
            </span>
          </div>
          <div className="flex items-start gap-2.5">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-doner-red" aria-hidden />
            <div className="text-charcoal/80">
              <div className="mb-0.5 font-semibold text-charcoal">{t.locations.hours}</div>
              {business.hours.map((h) => (
                <div key={h.time} className="flex gap-2">
                  <span className="w-16 text-charcoal/60">{pick(h.days)}</span>
                  <span>{h.time}</span>
                </div>
              ))}
            </div>
          </div>
          <a href={business.phoneHref} className="flex items-center gap-2.5 text-charcoal/80 hover:text-doner-red">
            <Phone className="h-4 w-4 shrink-0 text-doner-red" aria-hidden />
            {business.phoneDisplay}
          </a>
        </div>

        <div className="mt-5 flex gap-3">
          <a href={business.phoneHref} className="btn-secondary flex-1">
            <Phone className="h-4 w-4" aria-hidden />
            {t.locations.call}
          </a>
          <a
            href={mapsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost flex-1"
          >
            <Navigation className="h-4 w-4" aria-hidden />
            {t.locations.directions}
          </a>
        </div>
      </div>
    </motion.div>
  )
}

export default function Locations() {
  const { t } = useLang()
  return (
    <section id="standorte" className="scroll-mt-20 bg-cream py-16 sm:py-24">
      <div className="container-px">
        <div className="max-w-2xl">
          <span className="eyebrow">{t.locations.eyebrow}</span>
          <h2 className="section-title mt-3">{t.locations.title}</h2>
        </div>
        <div className="mt-8 grid gap-5 sm:gap-6 md:grid-cols-2">
          {business.locations.map((loc, i) => (
            <LocationCard key={loc.id} loc={loc} i={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
