/**
 * Display-side mirror of the backend's OrderPricing (app/Support/OrderPricing.php).
 * The backend stays authoritative — POST /api/checkout re-prices every line —
 * these helpers only keep what the customer sees in step with what they pay.
 *
 * Amounts are worked in paise with the same per-unit rounding as the backend.
 *
 * Tax is always INSIDE the price. A product's selling price, and a combo's bundle
 * and item prices, are what the customer pays; the tax % is the part of that
 * price which is tax (taxIncluded) — ₹1000 at 5% is charged as ₹1000, of which
 * ₹47.62 is tax. Nothing is added on top.
 */

const toPaise = (amount) => Math.round(Number(amount || 0) * 100)
const toRupees = (paise) => paise / 100

/**
 * Split a tax-INCLUSIVE unit price into { base, tax, total } in rupees. The price
 * already contains the tax, so `total` is that same price and `tax` is the part
 * of it that is tax: ₹1000 at 5% → base ₹952.38 + tax ₹47.62 = total ₹1000.
 */
export function taxIncluded(price, taxPercent) {
  const totalPaise = toPaise(price)
  const pct = Number(taxPercent) || 0
  const basePaise =
    totalPaise > 0 && pct > 0 ? Math.round(totalPaise / (1 + pct / 100)) : totalPaise

  return {
    base: toRupees(basePaise),
    tax: toRupees(totalPaise - basePaise),
    total: toRupees(totalPaise),
  }
}

/**
 * Unit price of a combo selection (tax included): the bundle price when every
 * product is selected and one is configured, else the sum of the selected
 * combo-specific prices.
 */
export function comboBasePrice(combo, chosenItems) {
  const complete =
    combo.items.length > 0 && chosenItems.length === combo.items.length

  if (complete && combo.bundlePrice != null) return Number(combo.bundlePrice)

  return chosenItems.reduce((sum, item) => sum + Number(item.price), 0)
}

/** "5% tax" style label, or null when no tax applies. */
export function taxLabel(taxPercent) {
  const pct = Number(taxPercent) || 0
  return pct > 0 ? `${Number(pct.toFixed(2))}% tax` : null
}
