import { useEffect, useRef, useState } from 'react'
import { useInView } from 'framer-motion'

interface CountUpProps {
  value: number
  decimals?: number
  suffix?: string
  duration?: number
  className?: string
  locale?: string
  /** thousands grouping (turn off for years like 2023) */
  grouping?: boolean
}

/** Animates a number from 0 → value the first time it scrolls into view. */
export default function CountUp({
  value,
  decimals = 0,
  suffix = '',
  duration = 1200,
  className = '',
  locale = 'de-DE',
  grouping = true,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!inView) return
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(value * eased)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, value, duration])

  const formatted = display.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: grouping,
  })

  return (
    <span ref={ref} className={className}>
      {formatted}
      {suffix}
    </span>
  )
}
