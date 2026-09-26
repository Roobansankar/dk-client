import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { Package, RefreshCw } from 'lucide-react'
import { ApiError } from '../../lib/api'
import { formatInr } from '../../data/services'
import { Skeleton } from '../StateViews'
import { ORDER_PAYMENT_LABEL, ORDER_STATUS_LABEL, formatOrderDate } from './orderLabels'

export function OrderPill({ children, settled }) {
  return (
    <span
      className={clsx(
        'rounded-full border px-2.5 py-0.5 text-xs',
        settled ? 'border-accent/50 text-ink' : 'border-line text-ink-soft',
      )}
    >
      {children}
    </span>
  )
}

/** "Product orders" section of the account page (GET /account/orders). */
export default function AccountOrders({ orders }) {
  return (
    <section>
      <h2 className="flex items-center gap-2 font-serif text-xl text-ink">
        <Package size={18} aria-hidden="true" className="text-muted" /> Product orders
      </h2>

      <div className="mt-5">
        {orders.loading ? (
          <ul aria-hidden="true">
            {Array.from({ length: 2 }).map((_, i) => (
              <li key={i} className="border-t border-line py-5 first:border-t-0">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="mt-4 h-3 w-full max-w-sm" />
              </li>
            ))}
          </ul>
        ) : orders.error ? (
          <div className="flex flex-col items-start gap-3 border border-line bg-surface px-6 py-8 text-sm">
            <p className="text-ink-soft">
              {orders.error instanceof ApiError && orders.error.network
                ? 'We couldn’t reach the server. Please check your connection and try again.'
                : 'Something went wrong loading your orders.'}
            </p>
            <button type="button" onClick={orders.refetch} className="btn btn-outline">
              <RefreshCw size={14} aria-hidden="true" /> Try again
            </button>
          </div>
        ) : orders.items.length === 0 ? (
          <p className="text-sm text-ink-soft">
            No product orders yet.{' '}
            <Link to="/products" className="text-ink underline underline-offset-4">
              Browse products
            </Link>
          </p>
        ) : (
          <ul>
            {orders.items.map((order) => (
              <li key={order.id} className="border-t border-line py-5 first:border-t-0">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <Link
                    to={`/account/orders/${order.id}`}
                    className="-my-2 inline-block py-2 font-serif text-lg text-ink no-underline hover:underline"
                  >
                    {order.order_number}
                  </Link>
                  <span className="tabular-nums text-ink">
                    {formatInr(order.amount_paid ?? order.total)}
                  </span>
                </div>
                <p className="mt-1 break-words text-sm text-ink-soft">
                  <span className="tabular-nums">{formatOrderDate(order.created_at)}</span>
                  <span aria-hidden="true" className="mx-2 text-line-strong">·</span>
                  {order.items
                    .map((item) => (item.quantity > 1 ? `${item.name} × ${item.quantity}` : item.name))
                    .join(', ')}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <OrderPill settled={order.payment_status === 'paid'}>
                    {ORDER_PAYMENT_LABEL[order.payment_status] || order.payment_status}
                  </OrderPill>
                  <OrderPill settled={order.status === 'delivered'}>
                    {ORDER_STATUS_LABEL[order.status] || order.status}
                  </OrderPill>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
