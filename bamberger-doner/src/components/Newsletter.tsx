import { useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Mail, Send, CheckCircle2 } from 'lucide-react'
import { useLang } from '../context/LanguageContext'

export default function Newsletter() {
  const { t } = useLang()
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (email.trim().length < 4) return
    setSubmitted(true) // saves nothing - purely a demo confirmation
  }

  return (
    <section className="bg-doner-red py-16 text-white sm:py-20">
      <div className="container-px">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-white/15">
            <Mail className="h-7 w-7" aria-hidden />
          </div>
          <h2 className="font-display text-3xl uppercase leading-[1.15] sm:text-4xl">{t.newsletter.title}</h2>
          <p className="mx-auto mt-3 max-w-md text-white/85">{t.newsletter.subtitle}</p>

          <div className="mt-7">
            <AnimatePresence mode="wait">
              {submitted ? (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mx-auto flex max-w-md flex-col items-center rounded-2xl bg-white/15 p-5 ring-1 ring-white/20"
                >
                  <CheckCircle2 className="h-9 w-9 text-amber-brand" aria-hidden />
                  <p className="mt-2 font-heading text-lg font-bold">{t.newsletter.success}</p>
                  <p className="mt-1 text-sm text-white/80">{t.newsletter.successHint}</p>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  onSubmit={onSubmit}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row"
                >
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.newsletter.placeholder}
                    aria-label={t.newsletter.placeholder}
                    className="w-full rounded-full border-0 bg-white px-5 py-3 text-charcoal placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-amber-brand"
                  />
                  <button
                    type="submit"
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-charcoal px-6 py-3 font-semibold text-white transition-colors hover:bg-charcoal-soft"
                  >
                    {t.newsletter.button}
                    <Send className="h-4 w-4" aria-hidden />
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}
