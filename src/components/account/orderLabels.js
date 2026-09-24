/** Customer-facing labels for product order states (see App\Models\Order). */
export const ORDER_STATUS_LABEL = {
  pending: 'Awaiting confirmation',
  confirmed: 'Confirmed',
  dispatched: 'Dispatched',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export const ORDER_PAYMENT_LABEL = {
  unpaid: 'Unpaid',
  paid: 'Paid',
  failed: 'Payment failed',
  refunded: 'Refunded',
}

/** '2026-09-23T05:00:32Z' → '23 Sep 2026'. */
export function formatOrderDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
