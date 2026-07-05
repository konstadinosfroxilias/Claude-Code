import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { business, type LocalizedText, type MenuItem } from '../data/content'

export interface CartOptions {
  meat?: string // option id
  sauce?: string // option id
}

export interface CartLine {
  lineId: string
  itemId: string
  name: LocalizedText
  price: number
  image: string
  qty: number
  options?: CartOptions
}

interface CartContextValue {
  lines: CartLine[]
  count: number
  subtotal: number
  pulse: number // increments on every add → drives cart-icon bump
  isOpen: boolean
  openCart: () => void
  closeCart: () => void
  locationId: string
  setLocationId: (id: string) => void
  add: (item: MenuItem, options?: CartOptions, qty?: number) => void
  setQty: (lineId: string, qty: number) => void
  remove: (lineId: string) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

const lineKey = (itemId: string, options?: CartOptions) =>
  [itemId, options?.meat ?? '', options?.sauce ?? ''].join('::')

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [pulse, setPulse] = useState(0)
  const [locationId, setLocationId] = useState<string>(business.locations[0].id)

  const add = useCallback((item: MenuItem, options?: CartOptions, qty = 1) => {
    const lineId = lineKey(item.id, options)
    setLines((prev) => {
      const existing = prev.find((l) => l.lineId === lineId)
      if (existing) {
        return prev.map((l) =>
          l.lineId === lineId ? { ...l, qty: l.qty + qty } : l,
        )
      }
      return [
        ...prev,
        {
          lineId,
          itemId: item.id,
          name: item.name,
          price: item.price,
          image: item.image,
          qty,
          options,
        },
      ]
    })
    setPulse((p) => p + 1)
  }, [])

  const setQty = useCallback((lineId: string, qty: number) => {
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => l.lineId !== lineId)
        : prev.map((l) => (l.lineId === lineId ? { ...l, qty } : l)),
    )
  }, [])

  const remove = useCallback((lineId: string) => {
    setLines((prev) => prev.filter((l) => l.lineId !== lineId))
  }, [])

  const clear = useCallback(() => setLines([]), [])

  const count = useMemo(() => lines.reduce((n, l) => n + l.qty, 0), [lines])
  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + l.qty * l.price, 0),
    [lines],
  )

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      count,
      subtotal,
      pulse,
      isOpen,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      locationId,
      setLocationId,
      add,
      setQty,
      remove,
      clear,
    }),
    [lines, count, subtotal, pulse, isOpen, locationId, add, setQty, remove, clear],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within a CartProvider')
  return ctx
}
