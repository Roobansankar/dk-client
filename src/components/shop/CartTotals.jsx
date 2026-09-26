import { formatInr } from '../../data/services'

/**
 * The total for the cart and checkout summaries, from useCartPricing.
 * `pricing.subtotal` is the tax-inclusive amount the backend charges — a
 * product's price already contains its tax — so it is shown as one figure, with
 * the tax it includes noted underneath when any applies.
 */
export default function CartTotals({ pricing }) {
  const amount = (value) =>
    value != null ? formatInr(value) : pricing.loading ? '…' : '—'
  const showTax = pricing.taxTotal != null && pricing.taxTotal > 0

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm text-ink-soft">{showTax ? 'Total' : 'Subtotal'}</span>
        <span className="text-xl font-medium tabular-nums text-ink">
          {amount(pricing.subtotal)}
        </span>
      </div>
      {showTax && (
        <p className="mt-1 text-right text-xs tabular-nums text-muted">
          Includes {amount(pricing.taxTotal)} in taxes
        </p>
      )}
    </div>
  )
}
