import { formatInr } from '../../data/services'

/**
 * Subtotal / taxes / total rows for the cart and checkout summaries, from
 * useCartPricing. `pricing.subtotal` is the tax-inclusive amount the backend
 * charges; the pre-tax subtotal and tax rows are shown only when tax applies.
 */
export default function CartTotals({ pricing }) {
  const amount = (value) =>
    value != null ? formatInr(value) : pricing.loading ? '…' : '—'
  const showTax = pricing.taxTotal != null && pricing.taxTotal > 0

  return (
    <div>
      {showTax && (
        <dl className="mb-3 space-y-1.5 text-sm text-ink-soft">
          <div className="flex items-baseline justify-between gap-4">
            <dt>Subtotal</dt>
            <dd className="tabular-nums">{amount(pricing.baseSubtotal)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt>Taxes</dt>
            <dd className="tabular-nums">{amount(pricing.taxTotal)}</dd>
          </div>
        </dl>
      )}
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm text-ink-soft">{showTax ? 'Total' : 'Subtotal'}</span>
        <span className="text-xl font-medium tabular-nums text-ink">
          {amount(pricing.subtotal)}
        </span>
      </div>
    </div>
  )
}
