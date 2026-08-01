import { useState } from 'react'
import { motion } from 'framer-motion'
import { Gift, Check, Sparkles } from 'lucide-react'
import { useLang } from '../context/LanguageContext'

const TOTAL = 10
const FILLED = 7

export default function Loyalty() {
  const { t } = useLang()
  const [activated, setActivated] = useState(false)
  const remaining = TOTAL - FILLED

  return (
    <section className="bg-cream py-16 dark:bg-charcoal sm:py-24">
      <div className="container-px">
        <div className="overflow-hidden rounded-4xl bg-charcoal text-white shadow-card ring-1 ring-white/5">
          <div className="grid gap-8 p-7 sm:p-10 lg:grid-cols-2 lg:items-center lg:gap-12">
            {/* copy */}
            <div>
              <span className="eyebrow text-amber-brand">
                <Sparkles className="h-4 w-4" aria-hidden />
                {t.loyalty.eyebrow}
              </span>
              <h2 className="mt-3 font-display text-3xl uppercase leading-[1.15] sm:text-4xl lg:text-5xl">
                {t.loyalty.title}
              </h2>
              <p className="mt-4 max-w-md text-cream/75">{t.loyalty.subtitle}</p>

              {remaining > 0 && (
                <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-brand/15 px-3 py-1.5 text-sm font-semibold text-amber-brand">
                  <Gift className="h-4 w-4" aria-hidden />
                  {t.loyalty.almost.replace('{n}', remaining.toString())}
                </p>
              )}

              <button
                onClick={() => setActivated(true)}
                className={`mt-6 inline-flex ${activated ? 'btn-secondary bg-green-600 hover:bg-green-600' : 'btn-primary'}`}
              >
                {activated ? (
                  <>
                    <Check className="h-5 w-5" aria-hidden />
                    {t.newsletter.success}
                  </>
                ) : (
                  t.loyalty.cta
                )}
              </button>
            </div>

            {/* stamp card */}
            <div className="rounded-3xl bg-cream p-5 text-charcoal shadow-card sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <span className="font-heading text-sm font-bold uppercase tracking-wide">
                  {t.loyalty.progress}
                </span>
                <span className="font-display text-xl text-doner-red">
                  {FILLED}/{TOTAL}
                </span>
              </div>

              <div className="grid grid-cols-5 gap-2.5 sm:gap-3">
                {Array.from({ length: TOTAL }).map((_, i) => {
                  const isReward = i === TOTAL - 1
                  const isFilled = i < FILLED
                  return (
                    <motion.div
                      key={i}
                      initial={{ scale: 0.6, opacity: 0 }}
                      whileInView={{ scale: 1, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.04 }}
                      className={`grid aspect-square place-items-center rounded-2xl border-2 ${
                        isReward
                          ? 'border-amber-brand bg-amber-brand/15 text-amber-brand-dark'
                          : isFilled
                            ? 'border-doner-red bg-doner-red text-white'
                            : 'border-dashed border-charcoal/20 text-charcoal/25'
                      }`}
                    >
                      {isReward ? (
                        <Gift className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
                      ) : isFilled ? (
                        <Check className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
                      ) : (
                        <span className="text-xs font-bold">{i + 1}</span>
                      )}
                    </motion.div>
                  )
                })}
              </div>

              <div className="mt-4 flex items-center justify-between rounded-2xl bg-cream-deep px-4 py-3">
                <span className="text-sm font-semibold text-charcoal/70">10. {t.loyalty.reward}</span>
                <span className="badge bg-amber-brand text-charcoal">🎉 Gratis</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
