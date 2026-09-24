/**
 * Display-side mirror of the backend's OrderPricing (app/Support/OrderPricing.php).
 * The backend stays authoritative — POST /api/checkout re-prices every line —
 * these helpers only keep what the customer sees in step with what they pay.
 *
 * Amounts are worked in paise with the same per-unit rounding as the backend,
 * so ₹1000 at 5% → ₹1050 and a ₹1400 bundle at 5% → ₹1470.
 */

const toPaise = (amount) => Math.round(Number(amount || 0) * 100)
const toRupees = (paise) => paise / 100

/** Split a base (pre-tax) unit amount into { base, tax, total } in rupees. */
export function withTax(baseAmount, taxPercent) {
  const basePaise = toPaise(baseAmount)
  const pct = Number(taxPercent) || 0
  const taxPaise =
    basePaise > 0 && pct > 0 ? Math.round(basePaise * (pct / 100)) : 0

  return {
    base: toRupees(basePaise),
    tax: toRupees(taxPaise),
    total: toRupees(basePaise + taxPaise),
  }
}

/**
 * Pre-tax unit price of a combo selection: the bundle price when every
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
