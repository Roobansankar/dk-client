import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Container from '../../components/layout/Container'
import { OrderPill } from '../../components/account/AccountOrders'
import {
  ORDER_PAYMENT_LABEL,
  ORDER_STATUS_LABEL,
  formatOrderDate,
} from '../../components/account/orderLabels'
import { Skeleton } from '../../components/StateViews'
import { useApiResource } from '../../hooks/useApi'
import { formatInr } from '../../data/services'

/** One of the customer's own orders (GET /account/orders/{id}; 404 for anyone else's). */
export default function OrderDetail() {
  const { id } = useParams()
  const { data: order, loading, error } = useApiResource(`/account/orders/${id}`)

  return (
    <>
      <title>{order ? `Order ${order.order_number} — DK StyleHub` : 'Order — DK StyleHub'}</title>

      <div className="border-t border-line bg-surface">
        <Container className="section-y">
          <Link
            to="/account"
            className="inline-flex items-center gap-2 text-eyebrow font-medium uppercase tracking-[0.14em] text-ink-soft no-underline hover:text-ink"
          >
            <ArrowLeft size={14} aria-hidden="true" /> My account
          </Link>

          {loading ? (
            <div className="mt-8 max-w-2xl" aria-hidden="true">
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="mt-6 h-3 w-full" />
              <Skeleton className="mt-3 h-3 w-4/5" />
            </div>
          ) : error || !order ? (
            <div className="mt-8 max-w-md text-ink-soft">
              <p>
                {error?.status === 404
                  ? 'We couldn’t find that order.'
                  : 'Something went wrong loading this order. Please try again.'}
              </p>
            </div>
          ) : (
            <div className="mt-8 max-w-2xl">
              <p className="eyebrow">Order</p>
              <h1 className="mt-3 font-serif text-[clamp(1.75rem,4vw,2.5rem)] leading-tight text-ink">
                {order.order_number}
              </h1>
              <p className="mt-2 text-sm text-ink-soft tabular-nums">
                Placed {formatOrderDate(order.created_at)}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <OrderPill settled={order.payment_status === 'paid'}>
                  {ORDER_PAYMENT_LABEL[order.payment_status] || order.payment_status}
                </OrderPill>
                <OrderPill settled={order.status === 'delivered'}>
                  {ORDER_STATUS_LABEL[order.status] || order.status}
                </OrderPill>
              </div>

              <ul className="mt-8 divide-y divide-line border-y border-line">
                {order.items.map((item) => (
                  <li key={item.id} className="py-4">
                    <div className="flex items-baseline justify-between gap-4">
                      <p className="text-ink">
                        {item.type === 'combo' && (
                          <span className="mr-2 text-[0.6rem] font-medium uppercase tracking-[0.18em] text-accent">
                            Combo
                          </span>
                        )}
                        {item.name}
                        {item.quantity > 1 && <span className="text-ink-soft"> × {item.quantity}</span>}
                      </p>
                      <p className="shrink-0 tabular-nums text-ink">{formatInr(item.line_total)}</p>
                    </div>
                    {item.selected_products?.length > 0 && (
                      <ul className="mt-1.5 space-y-0.5 text-sm text-ink-soft">
                        {item.selected_products.map((p) => (
                          <li key={p.product_id ?? p.name} className="flex justify-between gap-3">
                            <span>{p.name}</span>
                            <span className="tabular-nums">{formatInr(p.price)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>

              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-soft">Amount paid</dt>
                  <dd className="text-lg font-medium tabular-nums text-ink">
                    {formatInr(order.amount_paid ?? order.total)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-soft">Contact</dt>
                  <dd className="text-ink">
                    {order.customer_name} · {order.phone}
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </Container>
      </div>
    </>
  )
}
