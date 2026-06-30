import { Phone, Instagram, Facebook, MapPin, Clock } from 'lucide-react'
import { useLang } from '../context/LanguageContext'
import { business } from '../config/content'
import Wordmark from './Wordmark'
import SkylineDivider from './SkylineDivider'

export default function Footer() {
  const { t, pick } = useLang()

  return (
    <footer className="relative bg-charcoal text-cream/80">
      <div className="text-charcoal">
        <SkylineDivider flip className="text-cream" />
      </div>

      <div className="container-px pb-10 pt-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* brand */}
          <div className="lg:col-span-1">
            <Wordmark className="text-2xl" light />
            <p className="mt-3 max-w-xs text-sm text-cream/60">{t.footer.tagline}</p>
            <div className="mt-4 flex gap-2">
              <a
                href={business.instagram}
                aria-label="Instagram"
                className="grid h-10 w-10 place-items-center rounded-full bg-white/10 transition-colors hover:bg-doner-red"
              >
                <Instagram className="h-5 w-5" aria-hidden />
              </a>
              <a
                href={business.facebook}
                aria-label="Facebook"
                className="grid h-10 w-10 place-items-center rounded-full bg-white/10 transition-colors hover:bg-doner-red"
              >
                <Facebook className="h-5 w-5" aria-hidden />
              </a>
            </div>
          </div>

          {/* contact */}
          <div>
            <h3 className="font-heading text-sm font-bold uppercase tracking-wide text-white">
              {t.footer.contact}
            </h3>
            <a
              href={business.phoneHref}
              className="mt-3 inline-flex items-center gap-2 text-sm hover:text-white"
            >
              <Phone className="h-4 w-4 text-amber-brand" aria-hidden />
              {business.phoneDisplay}
            </a>
          </div>

          {/* locations */}
          <div>
            <h3 className="font-heading text-sm font-bold uppercase tracking-wide text-white">
              {t.footer.locations}
            </h3>
            <ul className="mt-3 space-y-3 text-sm">
              {business.locations.map((loc) => (
                <li key={loc.id} className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-brand" aria-hidden />
                  <span>
                    {loc.address}
                    <br />
                    {loc.city}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* hours */}
          <div>
            <h3 className="font-heading text-sm font-bold uppercase tracking-wide text-white">
              {t.footer.hours}
            </h3>
            <ul className="mt-3 space-y-1.5 text-sm">
              {business.hours.map((h) => (
                <li key={h.time} className="flex items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0 text-amber-brand" aria-hidden />
                  <span className="w-16 text-cream/60">{pick(h.days)}</span>
                  <span>{h.time}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-cream/50 sm:flex-row">
          <p>
            © {new Date().getFullYear()} {business.name}. {t.footer.rights}
          </p>
          <p className="rounded-full bg-white/5 px-3 py-1">{t.footer.demo}</p>
        </div>
      </div>
    </footer>
  )
}
