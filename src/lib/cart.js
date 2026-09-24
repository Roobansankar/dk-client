/**
 * Cart line builders + limits, shared by CartContext and the shop UI. Lines
 * record only WHAT to buy plus a display snapshot — never an authoritative
 * price (see context/CartContext.jsx).
 */

/** Backend limits (StoreProductCheckoutRequest). */
export const MAX_QUANTITY = 20
export const MAX_LINES = 50

export const clampQty = (n) => Math.min(MAX_QUANTITY, Math.max(1, Math.floor(Number(n) || 1)))

/** Clamp a requested quantity to 1…min(MAX_QUANTITY, stock) when stock is known. */
export const clampQtyToStock = (n, stock) => {
  const base = clampQty(n)
  if (stock == null) return base
  return Math.min(base, Math.max(0, Math.floor(Number(stock))))
}

/** Build a cart line. Identical selections share a key, so they merge. */
export function productLine(product, quantity = 1) {
  return {
    key: `p-${product.id}`,
    type: 'product',
    productId: String(product.id),
    quantity: clampQty(quantity),
    name: product.name,
    slug: product.slug,
    image: product.image ?? null,
  }
}

export function comboLine(combo, productIds, quantity = 1) {
  const ids = [...new Set(productIds.map(String))].sort()
  return {
    key: `c-${combo.id}-${ids.join('.')}`,
    type: 'combo',
    comboId: String(combo.id),
    productIds: ids,
    quantity: clampQty(quantity),
    name: combo.name,
    image: combo.image ?? null,
  }
}
