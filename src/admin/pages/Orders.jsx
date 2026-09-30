import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, Phone, ShoppingBag, ShoppingCart, PackageCheck } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useQuery } from '../hooks/useQuery'
import { useMutation } from '../hooks/useMutation'
import { useDebounced } from '../hooks/useDebounced'
import { Modal, ConfirmDialog } from '../components/Modal'
import { DataTable, Pagination } from '../components/DataTable'
import {
  Button,
  Detail,
  DetailList,
  EmptyState,
  ErrorState,
  Field,
  PageHeader,
  Pill,
  SearchInput,
  Select,
  SourceBadge,
  Toolbar,
} from '../components/ui'
import { formatDate, formatDateTime } from '../lib/format'

/** ₹ with paise only when present. */
const money = (value) =>
  value === null || value === undefined || value === ''
    ? '—'
    : new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(Number(value))

const FULFILMENT = {
  confirmed: ['Confirmed', 'info'],
  delivered: ['Delivered', 'ok'],
}

// Legacy states from the old pending → confirmed → dispatched flow: shown on
// older orders only, never offered as a filter or an action.
const LEGACY_FULFILMENT = {
  pending: ['Awaiting confirmation', 'warn'],
  dispatched: ['Dispatched', 'info'],
}

const PAYMENT_METHOD = { upi: 'UPI', cash: 'Cash', card: 'Card' }

const PAYMENT = {
  paid: ['Paid', 'ok'],
  unpaid: ['Unpaid', 'warn'],
  failed: ['Payment failed', 'danger'],
  refunded: ['Refunded', 'neutral'],
}

function FulfilmentBadge({ status }) {
  const [label, tone] = FULFILMENT[status] ?? LEGACY_FULFILMENT[status] ?? [status ?? '—', 'neutral']
  return <Pill tone={tone}>{label}</Pill>
}

function OrderPaymentBadge({ status }) {
  const [label, tone] = PAYMENT[status] ?? [status ?? '—', 'neutral']
  return <Pill tone={tone}>{label}</Pill>
}

/**
 * The only admin action on an order: Confirmed → Delivered. Every paid order
 * (online after a verified Razorpay payment, or an offline bill paid at the
 * counter) starts Confirmed. Payment is never an admin action. The backend
 * enforces the same rule; older pending / dispatched orders can also be
 * delivered.
 */
const DELIVER = {
  status: 'delivered',
  from: ['confirmed', 'pending', 'dispatched'],
  label: 'Delivered',
  icon: PackageCheck,
  title: 'Mark as delivered?',
  message: 'Mark delivered only once the customer has received the products.',
}

const itemSummary = (order) =>
  (order.items ?? [])
    .map((item) => (item.quantity > 1 ? `${item.name} × ${item.quantity}` : item.name))
    .join(', ')

/** A tel: link for the customer's phone — the admin's first action on a new order. */
function PhoneLink({ phone, className, onClick }) {
  if (!phone) return <span>—</span>

  return (
    <a
      href={`tel:${String(phone).replace(/[^\d+]/g, '')}`}
      onClick={onClick}
      className={
        className ??
        'inline-flex items-center gap-1 font-medium text-[var(--color-accent)] underline-offset-2 hover:underline'
      }
    >
      <Phone size={13} aria-hidden="true" />
      {phone}
    </a>
  )
}

export default function OrdersPage() {
  const { can } = useAuth()
  const canManage = can('orders.manage')

  const [filters, setFilters] = useState({
    status: '',
    search: '',
  })

  const [page, setPage] = useState(1)
  const search = useDebounced(filters.search)
  const [selectedId, setSelectedId] = useState(null)

  const params = useMemo(
    () => ({
      status: filters.status,
      search,
      page,
      per_page: 15,
    }),
    [filters.status, search, page],
  )

  const { data, meta, loading, error, refetch, refetching } = useQuery('/admin/orders', {
    params,
    deps: [params],
    // New paid orders arrive from customers' own devices — re-pull when the
    // admin returns to this tab. Event-driven, not polling.
    revalidateOnFocus: true,
  })

  const setFilter = (patch) => {
    setFilters((f) => ({ ...f, ...patch }))
    setPage(1)
  }

  const filtered = filters.status || filters.search

  const exportMut = useMutation(
    () =>
      api.download(
        '/admin/orders/export',
        { status: params.status, search: params.search },
        `dk-stylehub-orders-${new Date().toISOString().slice(0, 10)}.xlsx`,
      ),
    { successMessage: 'Orders exported.' },
  )

  const columns = [
    {
      key: 'order',
      header: 'Order',
      cell: (r) => (
        <div className="whitespace-nowrap">
          <p className="font-medium text-[var(--color-ink)]">{r.order_number}</p>
          <p className="text-xs text-[var(--color-muted)]">{formatDateTime(r.created_at)}</p>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      cell: (r) => (
        <div>
          <p className="text-[var(--color-ink)]">
            {r.customer_name}
            {r.source === 'offline' && (
              <span className="ml-2 align-middle">
                <SourceBadge source="offline" />
              </span>
            )}
          </p>
          <PhoneLink phone={r.phone} onClick={(e) => e.stopPropagation()} />
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Items',
      hideBelow: 'md',
      cell: (r) => <p className="line-clamp-2 max-w-xs">{itemSummary(r)}</p>,
    },
    {
      key: 'amount',
      header: 'Amount paid',
      cell: (r) => (
        <span className="whitespace-nowrap tabular-nums text-[var(--color-ink)]">
          {money(r.amount_paid ?? r.total)}
        </span>
      ),
    },
    {
      key: 'payment',
      header: 'Payment',
      hideBelow: 'sm',
      cell: (r) => <OrderPaymentBadge status={r.payment_status} />,
    },
    {
      key: 'status',
      header: 'Fulfilment',
      cell: (r) => <FulfilmentBadge status={r.status} />,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Paid product orders — from the website, and offline bills from the studio. Every order starts Confirmed; mark it Delivered once the customer has the products."
      >
        {canManage && (
          <Link to="/admin/offline-billing" className="btn btn-sm">
            <ShoppingCart size={15} /> Offline bill
          </Link>
        )}
        <Button
          size="sm"
          variant="outline"
          loading={exportMut.pending}
          disabled={!data?.length}
          onClick={() => exportMut.mutate()}
        >
          <Download size={15} /> Download Excel
        </Button>
      </PageHeader>

      <Toolbar>
        <SearchInput
          wrapperClassName="min-w-[12rem] flex-1"
          placeholder="Order number, name or phone"
          value={filters.search}
          onChange={(e) => setFilter({ search: e.target.value })}
        />

        <Field label="Fulfilment" className="w-48">
          <Select
            value={filters.status}
            onChange={(e) => setFilter({ status: e.target.value })}
          >
            <option value="">All</option>

            {Object.entries(FULFILMENT).map(([value, [label]]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>

        {filtered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilter({ status: '', search: '' })}
          >
            Clear
          </Button>
        )}
      </Toolbar>

      <div className="card">
        {error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={data}
              loading={loading}
              refetching={refetching}
              serialFrom={meta?.from ?? 1}
              onRowClick={(r) => setSelectedId(r.id)}
              empty={
                <EmptyState
                  icon={ShoppingBag}
                  title={filtered ? 'No orders match' : 'No orders yet'}
                  description={
                    filtered
                      ? 'Try widening the filters.'
                      : 'Orders appear here once a customer’s payment has been verified.'
                  }
                />
              }
            />

            <Pagination meta={meta} onPage={setPage} />
          </>
        )}
      </div>

      {selectedId && (
        <OrderDetail
          id={selectedId}
          canManage={canManage}
          onClose={() => setSelectedId(null)}
          onChanged={refetch}
        />
      )}
    </div>
  )
}

function OrderDetail({ id, canManage, onClose, onChanged }) {
  const { data: order, loading, error, refetch } = useQuery(`/admin/orders/${id}`)
  const [confirmStep, setConfirmStep] = useState(null)

  // Bill / invoice PDF for this order — same file WhatsApp sends the customer.
  // Mirrors AppointmentDetail's bill download.
  const billMut = useMutation(
    () =>
      api.download(
        `/admin/orders/${id}/bill`,
        {},
        `bill-${order?.order_number || id}.pdf`,
      ),
    { successMessage: 'Bill downloaded.' },
  )

  const statusMut = useMutation(
    (status) => api.patch(`/admin/orders/${id}/status`, { status }),
    {
      successMessage: 'Order updated.',
      onSuccess: () => {
        setConfirmStep(null)
        refetch()
        onChanged?.()
      },
    },
  )

  const canDeliver = Boolean(order) && DELIVER.from.includes(order.status)

  return (
    <>
      <Modal
        open
        onClose={onClose}
        size="lg"
        title={order ? order.order_number : 'Order'}
        description={order ? `Placed ${formatDateTime(order.created_at)}` : undefined}
        footer={
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            {canManage && order ? (
              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-label="Fulfilment"
              >
                <Button
                  size="sm"
                  variant={canDeliver ? 'primary' : 'outline'}
                  disabled={!canDeliver || statusMut.pending}
                  onClick={() => setConfirmStep(DELIVER)}
                  title={
                    order.status === 'delivered'
                      ? 'Already delivered'
                      : canDeliver
                        ? undefined
                        : 'This order can’t be marked delivered'
                  }
                >
                  <DELIVER.icon size={14} /> {DELIVER.label}
                </Button>
              </div>
            ) : (
              <span />
            )}

            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        }
      >
        {loading ? (
          <p className="py-10 text-center text-sm text-[var(--color-muted)]">
            Loading…
          </p>
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : (
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-2">
              <OrderPaymentBadge status={order.payment_status} />

              <FulfilmentBadge status={order.status} />

              <SourceBadge source={order.source} />

              {order.paid_at && (
                <span className="text-xs text-[var(--color-faint)]">
                  Paid {formatDateTime(order.paid_at)}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-accent-soft)] px-3.5 py-3">
              <div>
                <p className="label mb-0.5">Customer</p>

                <p className="text-sm font-medium text-[var(--color-ink)]">
                  {order.customer_name}
                </p>
              </div>

              <PhoneLink
                phone={order.phone}
                className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-accent)] px-3 py-1.5 text-base font-semibold tabular-nums text-[var(--color-ink)] no-underline hover:bg-[var(--color-surface)]"
              />

              {order.customer_address && (
                <p className="w-full whitespace-pre-line text-sm text-[var(--color-ink-soft)]">
                  {order.customer_address}
                </p>
              )}
            </div>

            <div>
              <p className="label">Items</p>

              <ul className="mt-2 divide-y divide-[var(--color-line)] border-y border-[var(--color-line)] text-sm">
                {order.items.map((item) => (
                  <li key={item.id} className="py-2.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-[var(--color-ink)]">
                        {item.type === 'combo' && (
                          <Pill tone="info" className="mr-2">
                            Combo
                          </Pill>
                        )}

                        {item.name}

                        <span className="text-[var(--color-muted)]">
                          {' '}
                          × {item.quantity}
                        </span>
                      </p>

                      <p className="shrink-0 tabular-nums text-[var(--color-ink)]">
                        {money(item.line_total)}
                      </p>
                    </div>

                    {item.quantity > 1 && (
                      <p className="text-xs text-[var(--color-muted)] tabular-nums">
                        {money(item.unit_price)} each
                      </p>
                    )}

                    {item.selected_products?.length > 0 && (
                      <ul className="mt-1.5 space-y-0.5 border-l-2 border-[var(--color-line)] pl-3 text-[var(--color-ink-soft)]">
                        {item.selected_products.map((p) => (
                          <li
                            key={p.product_id ?? p.name}
                            className="flex justify-between gap-3"
                          >
                            <span>{p.name}</span>

                            <span className="tabular-nums">
                              {money(p.price)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <DetailList columns={3}>
              <Detail
                label="Amount paid"
                value={
                  <span className="tabular-nums">
                    {money(order.amount_paid ?? order.total)}
                  </span>
                }
              />

              <Detail
                label="Order date"
                value={formatDate(order.created_at)}
              />

              {order.payment_method ? (
                <Detail
                  label="Payment method"
                  value={PAYMENT_METHOD[order.payment_method] ?? order.payment_method}
                />
              ) : (
                <Detail
                  label="Razorpay payment"
                  value={
                    <span className="break-all text-xs">
                      {order.razorpay_payment_id || '—'}
                    </span>
                  }
                />
              )}
            </DetailList>

            <div>
              <Button
                size="sm"
                variant="outline"
                loading={billMut.pending}
                onClick={() => billMut.mutate()}
              >
                <Download size={15} /> Download Bill (PDF)
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmStep}
        onClose={() => setConfirmStep(null)}
        onConfirm={() => statusMut.mutate(confirmStep.status)}
        pending={statusMut.pending}
        title={confirmStep?.title}
        message={confirmStep?.message}
        confirmLabel={confirmStep?.label}
        destructive={false}
      />
    </>
  )
}