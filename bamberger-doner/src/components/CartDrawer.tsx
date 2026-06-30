import { useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  X,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  ArrowLeft,
  Lock,
  ShieldCheck,
  Store,
  Bike,
  PartyPopper,
} from 'lucide-react'
import { useCart, type CartLine } from '../context/CartContext'
import { useLang } from '../context/LanguageContext'
import {
  formatPrice,
  meatOptions,
  sauceOptions,
} from '../config/menu'
import { business } from '../config/content'
import SmartImage from './SmartImage'

type Step = 'cart' | 'checkout' | 'success'
type Mode = 'pickup' | 'delivery'

const optionLabel = (group: { id: string; label: { de: string; en: string } }[], id: string | undefined, lang: 'de' | 'en') =>
  id ? group.find((o) => o.id === id)?.label[lang] : undefined

export default function CartDrawer() {
  const { t, lang, pick } = useLang()
  const { lines, subtotal, count, isOpen, closeCart, setQty, remove, clear, locationId, setLocationId } = useCart()

  const [step, setStep] = useState<Step>('cart')
  const [mode, setMode] = useState<Mode>('pickup')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [paying, setPaying] = useState(false)
  const [orderNo, setOrderNo] = useState('')

  // lock body scroll while the drawer is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // reset to the cart step shortly after closing
  useEffect(() => {
    if (!isOpen) {
      const id = window.setTimeout(() => {
        if (step === 'success') {
          clear()
          setName('')
          setPhone('')
          setAddress('')
        }
        setStep('cart')
        setPaying(false)
      }, 300)
      return () => window.clearTimeout(id)
    }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  const formValid = name.trim().length > 1 && phone.trim().length > 4 && (mode === 'pickup' || address.trim().length > 3)

  const handlePay = () => {
    setPaying(true)
    window.setTimeout(() => {
      setOrderNo(`BD-${Math.floor(1000 + Math.random() * 9000)}`)
      setPaying(false)
      setStep('success')
    }, 1700)
  }

  const handleFinish = () => {
    closeCart()
  }

  const activeLocation = business.locations.find((l) => l.id === locationId) ?? business.locations[0]

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[70]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* overlay */}
          <div className="absolute inset-0 bg-charcoal/60 backdrop-blur-sm" onClick={closeCart} aria-hidden />

          {/* panel */}
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={t.cart.title}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-cream shadow-card"
          >
            {/* header */}
            <div className="flex items-center justify-between border-b border-black/5 px-5 py-4">
              <div className="flex items-center gap-2">
                {step === 'checkout' && (
                  <button
                    onClick={() => setStep('cart')}
                    aria-label={t.checkout.back}
                    className="grid h-9 w-9 place-items-center rounded-full hover:bg-black/5"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                )}
                <h2 className="font-display text-2xl uppercase text-charcoal">
                  {step === 'cart' && t.cart.title}
                  {step === 'checkout' && t.checkout.title}
                  {step === 'success' && t.success.title}
                </h2>
              </div>
              <button
                onClick={closeCart}
                aria-label={t.common.close}
                className="grid h-9 w-9 place-items-center rounded-full hover:bg-black/5"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* body */}
            <div className="flex-1 overflow-y-auto">
              {step === 'cart' && (
                <CartStep lines={lines} setQty={setQty} remove={remove} />
              )}

              {step === 'checkout' && (
                <CheckoutStep
                  mode={mode}
                  setMode={setMode}
                  name={name}
                  setName={setName}
                  phone={phone}
                  setPhone={setPhone}
                  address={address}
                  setAddress={setAddress}
                  locationId={locationId}
                  setLocationId={setLocationId}
                />
              )}

              {step === 'success' && (
                <SuccessStep orderNo={orderNo} mode={mode} location={pick(activeLocation.name)} />
              )}
            </div>

            {/* footer / actions */}
            {step === 'cart' && lines.length > 0 && (
              <div className="border-t border-black/5 bg-white p-5">
                <div className="mb-2 flex items-center justify-center gap-1.5 text-xs font-semibold text-green-700">
                  <ShieldCheck className="h-4 w-4" aria-hidden />
                  {t.common.commissionFree}
                </div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm text-charcoal/60">
                    {t.cart.subtotal} · {count} {t.cart.items}
                  </span>
                  <span className="font-display text-2xl text-charcoal">
                    {formatPrice(subtotal, lang)}
                  </span>
                </div>
                <button onClick={() => setStep('checkout')} className="btn-primary w-full text-base">
                  {t.cart.checkout}
                </button>
              </div>
            )}

            {step === 'checkout' && (
              <div className="border-t border-black/5 bg-white p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm text-charcoal/60">{t.checkout.total}</span>
                  <span className="font-display text-2xl text-charcoal">
                    {formatPrice(subtotal, lang)}
                  </span>
                </div>
                <button
                  onClick={handlePay}
                  disabled={!formValid || paying}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-charcoal px-6 py-3.5 font-semibold text-white shadow-soft transition-colors hover:bg-charcoal-soft disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {paying ? (
                    <>
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      {t.checkout.paying}
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" aria-hidden />
                      {t.checkout.pay} · {formatPrice(subtotal, lang)}
                    </>
                  )}
                </button>
                <div className="mt-2.5 flex items-center justify-center gap-2 text-[0.7rem] text-charcoal/40">
                  <span>{t.checkout.secure}</span>
                  <span>·</span>
                  <span className="font-semibold tracking-tight">VISA</span>
                  <span className="font-semibold tracking-tight">Mastercard</span>
                  <span>·</span>
                  <span className="rounded bg-amber-brand/15 px-1.5 py-0.5 font-semibold text-amber-brand-dark">
                    {t.checkout.demoNote}
                  </span>
                </div>
              </div>
            )}

            {step === 'success' && (
              <div className="border-t border-black/5 bg-white p-5">
                <button onClick={handleFinish} className="btn-primary w-full text-base">
                  {t.success.done}
                </button>
              </div>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* --------------------------------- Cart --------------------------------- */
function CartStep({
  lines,
  setQty,
  remove,
}: {
  lines: CartLine[]
  setQty: (id: string, qty: number) => void
  remove: (id: string) => void
}) {
  const { t, lang, pick } = useLang()

  if (lines.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-8 text-center">
        <div className="grid h-20 w-20 place-items-center rounded-full bg-doner-red/10 text-doner-red">
          <ShoppingBag className="h-9 w-9" aria-hidden />
        </div>
        <p className="mt-5 font-heading text-lg font-bold text-charcoal">{t.cart.empty}</p>
        <p className="mt-1 text-sm text-charcoal/60">{t.cart.emptyHint}</p>
      </div>
    )
  }

  return (
    <ul className="divide-y divide-black/5 p-3">
      <AnimatePresence initial={false}>
        {lines.map((line) => {
          const meat = optionLabel(meatOptions, line.options?.meat, lang)
          const sauce = optionLabel(sauceOptions, line.options?.sauce, lang)
          const opts = [meat, sauce].filter(Boolean).join(' · ')
          return (
            <motion.li
              key={line.lineId}
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              className="flex gap-3 p-2"
            >
              <SmartImage
                src={line.image}
                alt={pick(line.name)}
                className="h-20 w-20 shrink-0 rounded-2xl"
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-heading text-sm font-bold uppercase leading-tight text-charcoal">
                    {pick(line.name)}
                  </h3>
                  <button
                    onClick={() => remove(line.lineId)}
                    aria-label={t.cart.remove}
                    className="shrink-0 text-charcoal/40 transition-colors hover:text-doner-red"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {opts && <p className="mt-0.5 truncate text-xs text-charcoal/50">{opts}</p>}
                <div className="mt-auto flex items-center justify-between pt-2">
                  <div className="inline-flex items-center rounded-full bg-cream-deep">
                    <button
                      onClick={() => setQty(line.lineId, line.qty - 1)}
                      aria-label="-"
                      className="grid h-8 w-8 place-items-center rounded-full text-charcoal hover:bg-black/5"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-7 text-center text-sm font-bold">{line.qty}</span>
                    <button
                      onClick={() => setQty(line.lineId, line.qty + 1)}
                      aria-label="+"
                      className="grid h-8 w-8 place-items-center rounded-full text-charcoal hover:bg-black/5"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="font-display text-lg text-doner-red">
                    {formatPrice(line.price * line.qty, lang)}
                  </span>
                </div>
              </div>
            </motion.li>
          )
        })}
      </AnimatePresence>
    </ul>
  )
}

/* ------------------------------- Checkout ------------------------------- */
function CheckoutStep({
  mode,
  setMode,
  name,
  setName,
  phone,
  setPhone,
  address,
  setAddress,
  locationId,
  setLocationId,
}: {
  mode: Mode
  setMode: (m: Mode) => void
  name: string
  setName: (s: string) => void
  phone: string
  setPhone: (s: string) => void
  address: string
  setAddress: (s: string) => void
  locationId: string
  setLocationId: (id: string) => void
}) {
  const { t, lang, pick } = useLang()
  const { lines } = useCart()

  return (
    <div className="space-y-6 p-5">
      {/* mode toggle */}
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-cream-deep p-1">
        {(
          [
            { id: 'pickup' as Mode, label: t.checkout.pickup, icon: Store },
            { id: 'delivery' as Mode, label: t.checkout.delivery, icon: Bike },
          ]
        ).map((m) => {
          const active = mode === m.id
          const Icon = m.icon
          return (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              aria-pressed={active}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all ${
                active ? 'bg-white text-charcoal shadow-soft' : 'text-charcoal/60'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {m.label}
            </button>
          )
        })}
      </div>

      {/* pickup location */}
      {mode === 'pickup' && (
        <div>
          <label className="mb-2 block font-heading text-xs font-bold uppercase tracking-[0.18em] text-charcoal/60">
            {t.checkout.location}
          </label>
          <div className="grid gap-2">
            {business.locations.map((loc) => {
              const active = loc.id === locationId
              return (
                <button
                  key={loc.id}
                  onClick={() => setLocationId(loc.id)}
                  aria-pressed={active}
                  className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition-all ${
                    active ? 'border-doner-red bg-doner-red/5' : 'border-black/10 bg-white'
                  }`}
                >
                  <Store className={`h-5 w-5 ${active ? 'text-doner-red' : 'text-charcoal/40'}`} aria-hidden />
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-charcoal">{pick(loc.name)}</div>
                    <div className="truncate text-xs text-charcoal/50">
                      {loc.address}, {loc.city}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* fields */}
      <div className="space-y-4">
        <Field label={t.checkout.name}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.checkout.namePlaceholder}
            autoComplete="name"
            className="input"
          />
        </Field>
        <Field label={t.checkout.phone}>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t.checkout.phonePlaceholder}
            autoComplete="tel"
            className="input"
          />
        </Field>
        {mode === 'delivery' && (
          <Field label={lang === 'de' ? 'Lieferadresse' : 'Delivery address'}>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={lang === 'de' ? 'Straße, Hausnr., PLZ' : 'Street, no., postcode'}
              autoComplete="street-address"
              className="input"
            />
          </Field>
        )}
      </div>

      {/* Stripe-style card field (visual mock) */}
      <div>
        <label className="mb-2 block font-heading text-xs font-bold uppercase tracking-[0.18em] text-charcoal/60">
          {lang === 'de' ? 'Kartendaten' : 'Card details'}
        </label>
        <div className="rounded-2xl border border-black/10 bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between gap-2 rounded-xl bg-cream-deep px-3 py-2.5 text-sm text-charcoal/50">
            <span className="tracking-[0.2em]">•••• •••• •••• 4242</span>
            <span className="text-xs">12 / 28 · CVC •••</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[0.7rem] text-charcoal/40">
            <Lock className="h-3 w-3" aria-hidden />
            {t.checkout.demoNote}
          </div>
        </div>
      </div>

      {/* order summary */}
      <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
        <div className="mb-2 font-heading text-xs font-bold uppercase tracking-[0.18em] text-charcoal/60">
          {t.checkout.summary}
        </div>
        <ul className="space-y-1.5">
          {lines.map((l) => (
            <li key={l.lineId} className="flex justify-between text-sm">
              <span className="text-charcoal/70">
                {l.qty}× {pick(l.name)}
              </span>
              <span className="font-semibold text-charcoal">
                {formatPrice(l.price * l.qty, lang)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-heading text-xs font-bold uppercase tracking-[0.18em] text-charcoal/60">
        {label}
      </span>
      {children}
    </label>
  )
}

/* -------------------------------- Success ------------------------------- */
function SuccessStep({
  orderNo,
  mode,
  location,
}: {
  orderNo: string
  mode: Mode
  location: string
}) {
  const { t, lang } = useLang()

  return (
    <div className="flex h-full flex-col items-center justify-center px-8 py-10 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.05 }}
        className="grid h-24 w-24 place-items-center rounded-full bg-green-100"
      >
        <svg viewBox="0 0 52 52" className="h-14 w-14">
          <motion.circle
            cx="26"
            cy="26"
            r="23"
            fill="none"
            stroke="#16a34a"
            strokeWidth="3"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5 }}
          />
          <motion.path
            d="M16 27 l7 7 l14 -15"
            fill="none"
            stroke="#16a34a"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.4, delay: 0.45 }}
          />
        </svg>
      </motion.div>

      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-6 inline-flex items-center gap-2 font-display text-3xl uppercase text-charcoal"
      >
        {t.success.title}
        <PartyPopper className="h-7 w-7 text-amber-brand" aria-hidden />
      </motion.h3>

      <p className="mt-3 max-w-xs text-sm text-charcoal/70">{t.success.message}</p>

      <div className="mt-6 w-full max-w-xs rounded-2xl bg-white p-4 text-left shadow-soft ring-1 ring-black/5">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide text-charcoal/50">{t.success.orderNo}</span>
          <span className="font-display text-xl text-doner-red">{orderNo}</span>
        </div>
        <div className="mt-2 border-t border-black/5 pt-2 text-sm text-charcoal/70">
          {mode === 'pickup' ? `${t.checkout.pickup} · ${location}` : t.checkout.delivery}
        </div>
      </div>

      <p className="mt-4 text-xs text-charcoal/50">{t.success.pickupInfo}</p>
      <p className="mt-4 rounded-full bg-amber-brand/15 px-3 py-1 text-[0.7rem] font-semibold text-amber-brand-dark">
        {lang === 'de' ? '⚠️ ' : '⚠️ '}
        {t.success.demoNote}
      </p>
    </div>
  )
}
