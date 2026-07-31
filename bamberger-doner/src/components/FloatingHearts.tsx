import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Heart {
  id: number
  left: number
  drift: number
  scale: number
  duration: number
}

/**
 * Every few seconds a small ❤️ drifts up and fades — a gentle nod to the
 * brand's love of the heart emoji. Purely decorative, non-interactive.
 */
export default function FloatingHearts() {
  const [hearts, setHearts] = useState<Heart[]>([])

  useEffect(() => {
    let id = 0
    const spawn = () => {
      id += 1
      const heart: Heart = {
        id,
        left: 8 + Math.random() * 84, // % across the width
        drift: (Math.random() - 0.5) * 40,
        scale: 0.7 + Math.random() * 0.6,
        duration: 4 + Math.random() * 2,
      }
      setHearts((prev) => [...prev.slice(-6), heart])
    }
    const interval = window.setInterval(spawn, 2600)
    return () => window.clearInterval(interval)
  }, [])

  return (
    <div className="pointer-events-none absolute inset-0 -z-[5] overflow-hidden" aria-hidden>
      <AnimatePresence>
        {hearts.map((h) => (
          <motion.span
            key={h.id}
            initial={{ y: '100%', x: 0, opacity: 0, scale: h.scale }}
            animate={{ y: '-10%', x: h.drift, opacity: [0, 0.7, 0.7, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: h.duration, ease: 'easeOut' }}
            onAnimationComplete={() =>
              setHearts((prev) => prev.filter((x) => x.id !== h.id))
            }
            style={{ position: 'absolute', bottom: 0, left: `${h.left}%` }}
            className="text-2xl"
          >
            ❤️
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  )
}
