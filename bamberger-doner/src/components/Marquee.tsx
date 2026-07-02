import { Flame, Star, Heart, MapPin } from 'lucide-react'
import { useLang } from '../context/LanguageContext'

const icons = [Flame, Star, Heart, MapPin]

/** A playful infinite-scrolling brand strip. Pauses on hover. */
export default function Marquee() {
  const { lang } = useLang()

  const phrases =
    lang === 'de'
      ? [
          'Frisch vom Drehspieß',
          'Ohne Gebühren bestellen',
          'Dönergeschmack aus Berlin',
          '4,7★ auf Google',
          '2× in Bamberg',
          'Seit 2023 mit Herz',
        ]
      : [
          'Fresh off the spit',
          'Order with no fees',
          'Berlin-style döner',
          '4.7★ on Google',
          '2× in Bamberg',
          'Made with heart since 2023',
        ]

  // duplicate the list so the loop is seamless
  const items = [...phrases, ...phrases]

  return (
    <div className="group relative flex overflow-hidden border-y-2 border-charcoal bg-charcoal py-3.5 text-cream select-none">
      <div className="flex shrink-0 animate-marquee items-center gap-8 pr-8 group-hover:[animation-play-state:paused]">
        {items.map((phrase, i) => {
          const Icon = icons[i % icons.length]
          return (
            <div key={i} className="flex shrink-0 items-center gap-8">
              <span className="font-display text-lg uppercase tracking-wide sm:text-xl">
                {phrase}
              </span>
              <Icon className="h-5 w-5 shrink-0 text-amber-brand" aria-hidden />
            </div>
          )
        })}
      </div>
    </div>
  )
}
