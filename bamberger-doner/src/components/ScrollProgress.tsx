import { motion, useScroll, useSpring } from 'framer-motion'

/** Slim reading-progress bar pinned to the very top of the page. */
export default function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  })

  return (
    <motion.div
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-[80] h-1 origin-left bg-gradient-to-r from-doner-red via-amber-brand to-doner-red"
      aria-hidden
    />
  )
}
