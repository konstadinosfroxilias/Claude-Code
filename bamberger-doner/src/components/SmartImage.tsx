import { useState } from 'react'
import { motion } from 'framer-motion'
import { UtensilsCrossed } from 'lucide-react'

interface SmartImageProps {
  src: string
  alt: string
  className?: string
  imgClassName?: string
  /** rough sizes hint for responsive loading */
  eager?: boolean
}

/**
 * Image wrapper with a branded shimmer placeholder and a graceful fallback.
 * Guarantees we never show a broken-image icon during the pitch.
 */
export default function SmartImage({
  src,
  alt,
  className = '',
  imgClassName = '',
  eager = false,
}: SmartImageProps) {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)

  return (
    <div className={`relative overflow-hidden bg-cream-deep ${className}`}>
      {!loaded && !errored && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-cream-deep to-cream" />
      )}

      {errored ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-doner-red to-doner-red-dark text-white/90">
          <UtensilsCrossed className="h-10 w-10" aria-hidden />
        </div>
      ) : (
        <motion.img
          src={src}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={loaded ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className={`h-full w-full object-cover ${imgClassName}`}
        />
      )}
    </div>
  )
}
