/** A small rotated "seit 2023" stamp/badge. */
export default function Stamp({ className = '' }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none select-none ${className}`}
      aria-hidden
    >
      <div className="grid h-24 w-24 -rotate-12 place-items-center rounded-full border-2 border-dashed border-amber-brand/80 bg-cream/80 text-center shadow-soft backdrop-blur sm:h-28 sm:w-28">
        <div className="leading-tight">
          <div className="font-heading text-[0.6rem] font-semibold uppercase tracking-[0.25em] text-doner-red">
            seit
          </div>
          <div className="font-display text-2xl text-charcoal sm:text-3xl">2023</div>
          <div className="font-heading text-[0.55rem] font-semibold uppercase tracking-[0.2em] text-charcoal/70">
            Bamberg
          </div>
        </div>
      </div>
    </div>
  )
}
