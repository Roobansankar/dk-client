import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { clampQty, MAX_LINES } from '../lib/cart'

/**
 * Customer product cart (normal products + combo selections), kept in
 * localStorage so it survives reloads. A separate single-line "Buy Now"
 * selection lives in sessionStorage — it must never be merged into the cart,
 * and it has to survive the Google sign-in round trip on the way to checkout.
 *
 * Lines only record WHAT to buy (ids, selection, quantity) plus a display
 * snapshot (name, image). Prices shown anywhere in the UI are for display
 * only; the backend prices every line itself at POST /api/checkout.
 *
 * Line shapes:
 *   { key, type: 'product', productId, quantity, name, slug, image }
 *   { key, type: 'combo', comboId, productIds: string[], quantity, name, image }
 */

const CART_KEY = 'dk-cart'
const BUY_NOW_KEY = 'dk-buy-now'

function read(storage, key, fallback) {
  try {
    const raw = storage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function write(storage, key, value) {
  try {
    if (value == null) storage.removeItem(key)
    else storage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable (private mode, quota) — state still works in memory */
  }
}

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [lines, setLines] = useState(() => {
    const stored = read(localStorage, CART_KEY, [])
    return Array.isArray(stored) ? stored : []
  })
  const [buyNow, setBuyNowState] = useState(() => read(sessionStorage, BUY_NOW_KEY, null))

  useEffect(() => write(localStorage, CART_KEY, lines), [lines])
  useEffect(() => write(sessionStorage, BUY_NOW_KEY, buyNow), [buyNow])

  const add = useCallback((line) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.key === line.key)
      if (existing) {
        return prev.map((l) =>
          l.key === line.key ? { ...l, quantity: clampQty(l.quantity + line.quantity) } : l,
        )
      }
      return prev.length >= MAX_LINES ? prev : [...prev, line]
    })
  }, [])

  const setQuantity = useCallback((key, quantity) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, quantity: clampQty(quantity) } : l)))
  }, [])

  const remove = useCallback((key) => {
    setLines((prev) => prev.filter((l) => l.key !== key))
  }, [])

  const clear = useCallback(() => setLines([]), [])

  const setBuyNow = useCallback((line) => setBuyNowState(line), [])
  const setBuyNowQuantity = useCallback(
    (_key, quantity) =>
      setBuyNowState((prev) => (prev ? { ...prev, quantity: clampQty(quantity) } : prev)),
    [],
  )
  const clearBuyNow = useCallback(() => setBuyNowState(null), [])

  const value = useMemo(
    () => ({
      lines,
      count: lines.reduce((sum, l) => sum + l.quantity, 0),
      add,
      setQuantity,
      remove,
      clear,
      buyNow,
      setBuyNow,
      setBuyNowQuantity,
      clearBuyNow,
    }),
    [lines, add, setQuantity, remove, clear, buyNow, setBuyNow, setBuyNowQuantity, clearBuyNow],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
