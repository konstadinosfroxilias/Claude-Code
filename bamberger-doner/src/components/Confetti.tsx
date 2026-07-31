import { useMemo } from 'react'
import { motion } from 'framer-motion'

const COLORS = ['#C8102E', '#E8A317', '#FAF7F2', '#16a34a', '#E64560']

/**
 * A one-shot confetti burst — pure CSS/motion, no external library.
 * Mounts, plays once, and stays out of the way (pointer-events: none).
 */
export default function Confetti({ count = 26 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 320, // horizontal spread
        rise: -80 - Math.random() * 120, // initial upward pop
        rot: Math.random() * 720 - 360,
        delay: Math.random() * 0.15,
        duration: 1.3 + Math.random() * 0.8,
        color: COLORS[i % COLORS.length],
        size: 6 + Math.random() * 6,
        round: Math.random() > 0.5,
      })),
    [count],
  )

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden>
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{
            x: p.x,
            y: [p.rise, 260],
            rotate: p.rot,
            opacity: [1, 1, 0],
          }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            top: '38%',
            left: '50%',
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.round ? '9999px' : '2px',
          }}
        />
      ))}
    </div>
  )
}
