import { Heart } from 'lucide-react'

interface WordmarkProps {
  className?: string
  /** light text for dark backgrounds */
  light?: boolean
}

/** The "Bamberger Döner" wordmark. */
export default function Wordmark({ className = '', light = false }: WordmarkProps) {
  return (
    <span
      className={`font-display uppercase leading-none tracking-wide ${className}`}
      aria-label="Bamberger Döner"
    >
      <span className={light ? 'text-white' : 'text-charcoal dark:text-cream'}>Bamberger</span>{' '}
      <span className="text-doner-red">Döner</span>
      <Heart
        className="ml-1 inline-block h-[0.55em] w-[0.55em] -translate-y-[0.15em] fill-amber-brand text-amber-brand"
        aria-hidden
      />
    </span>
  )
}
