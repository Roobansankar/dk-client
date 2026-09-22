import { useMemo, useState } from 'react'
import { Download, ReceiptText } from 'lucide-react'
import { api } from '../lib/api'
import { useQuery } from '../hooks/useQuery'
import { useDebounced } from '../hooks/useDebounced'
import { useMutation } from '../hooks/useMutation'
import { useAuth } from '../lib/auth'
import { DataTable, Pagination } from '../components/DataTable'
import { AppointmentDetail } from '../components/AppointmentDetail'
import {
  Button,
  EmptyState,
  ErrorState,
  Field,
  PageHeader,
  PaymentBadge,
  SearchInput,
  Select,
  StatGrid,
  TextInput,
  Toolbar,
} from '../components/ui'
import { formatDate, formatPrice } from '../lib/format'

const EMPTY = {
  search: '',
  gender: '',
  category_id: '',
  payment_status: '',
  date_from: '',
  date_to: '',
}

// Same three statuses / labels as the "Mark as" select and PaymentBadge (see
// AppointmentDetail.jsx and components/ui.jsx) — one payment vocabulary, not
// a second one invented for this filter.
const PAYMENT_STATUS_OPTIONS = [
  ['unpaid', 'Unpaid'],
  ['advance_paid', 'Advance paid'],
  ['paid', 'Paid in full'],
]

export default function PaymentsPage() {
  const { can } = useAuth()
  const canManage = can('appointments.manage')
  const canExport = can('payments.export')
  const canSeeCatalogue = can('services.view')

  const [filters, setFilters] = useState(EMPTY)
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState(null)
  const search = useDebounced(filters.search)

  const categories = useQuery('/admin/service-categories', {
    params: { per_page: 100 },
    enabled: canSeeCatalogue,
  })

  const params = useMemo(
    () => ({
      search,
      gender: filters.gender,
      category_id: filters.category_id,
      payment_status: filters.payment_status,
      date_from: filters.date_from,
      date_to: filters.date_to,
      page,
      per_page: 20,
    }),
    [
      search,
      filters.gender,
      filters.category_id,
      filters.payment_status,
      filters.date_from,
      filters.date_to,
      page,
    ],
  )

  const { data, meta, summary, loading, error, refetch, refetching } = useQuery('/admin/payments', {
    params,
    deps: [params],
    // A payment can be verified from the customer's own device while this
    // page sits open on the admin's — refocus alone won't catch that (the
    // admin's tab never lost focus), so this is the one view that also
    // polls, on top of the usual revalidate-on-focus. See useQuery's docblock.
    revalidateOnFocus: true,
    pollIntervalMs: 20000,
  })

  const setFilter = (patch) => {
    setFilters((f) => ({ ...f, ...patch }))
    setPage(1)
  }
  const anyFilter = Object.values(filters).some(Boolean)

  const exportMut = useMutation(
    () =>
      api.download(
        '/admin/payments/export',
        {
          search: params.search,
          gender: params.gender,
          category_id: params.category_id,
          payment_status: params.payment_status,
          date_from: params.date_from,
          date_to: params.date_to,
        },
        `dk-stylehub-payments-${new Date().toISOString().slice(0, 10)}.pdf`,
      ),
    { successMessage: 'Report downloaded.' },
  )

  const cards = summary
    ? [
        { label: 'Completed appointments', value: summary.completed_appointments },
        { label: 'Total service value', value: formatPrice(summary.total_service_value) },
        { label: 'Advance received', value: formatPrice(summary.total_advance_received) },
        { label: 'Remaining balance', value: formatPrice(summary.total_remaining) },
      ]
    : []

  const columns = [
    {
      key: 'ref',
      header: 'Reference',
      hideBelow: 'sm',
      cell: (r) => <span className="text-xs tabular-nums text-[var(--color-muted)]">{r.reference}</span>,
    },
    {
      key: 'customer',
      header: 'Customer',
      cell: (r) => (
        <div>
          <p className="font-medium text-[var(--color-ink)]">{r.customer_name}</p>
          <p className="text-xs text-[var(--color-muted)]">{r.service_name || '—'}</p>
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      hideBelow: 'md',
      cell: (r) => <span className="whitespace-nowrap">{formatDate(r.appointment_date)}</span>,
    },
    {
      key: 'price',
      header: 'Price',
      align: 'right',
      cell: (r) => <span className="tabular-nums">{formatPrice(r.service_price)}</span>,
    },
    {
      key: 'advance',
      header: 'Advance',
      align: 'right',
      hideBelow: 'sm',
      cell: (r) => (
        <span className="tabular-nums text-[var(--color-muted)]">
          {r.advance_percentage ? `${formatPrice(r.advance_amount)} · ${r.advance_percentage}%` : '—'}
        </span>
      ),
    },
    {
      key: 'remaining',
      header: 'Remaining',
      align: 'right',
      cell: (r) => (
        <span
          className={
            'tabular-nums ' +
            (r.remaining_amount > 0 ? 'text-[var(--color-warn)]' : 'text-[var(--color-ok)]')
          }
        >
          {formatPrice(r.remaining_amount)}
        </span>
      ),
    },
    {
      key: 'payment',
      header: 'Payment',
      align: 'right',
      cell: (r) => <PaymentBadge status={r.payment_status} />,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Payments & Completed"
        description="Appointments with a verified payment, plus every completed appointment, with their advance / balance record."
      >
        {canExport && (
          <Button
            size="sm"
            variant="outline"
            loading={exportMut.pending}
            disabled={!data?.length}
            onClick={() => exportMut.mutate()}
          >
            <Download size={15} /> Download PDF
          </Button>
        )}
      </PageHeader>

      {summary && <StatGrid items={cards} size="md" className="mb-5" />}

      <Toolbar layout="grid">
        <SearchInput
          placeholder="Customer or service"
          value={filters.search}
          onChange={(e) => setFilter({ search: e.target.value })}
        />
        <Field label="Gender">
          <Select value={filters.gender} onChange={(e) => setFilter({ gender: e.target.value })}>
            <option value="">All</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="unisex">Not specified</option>
          </Select>
        </Field>
        {canSeeCatalogue && (
          <Field label="Category">
            <Select
              value={filters.category_id}
              onChange={(e) => setFilter({ category_id: e.target.value })}
            >
              <option value="">All categories</option>
              {(categories.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.gender})
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Payment">
          <Select
            value={filters.payment_status}
            onChange={(e) => setFilter({ payment_status: e.target.value })}
          >
            <option value="">All</option>
            {PAYMENT_STATUS_OPTIONS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="From">
            <TextInput
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilter({ date_from: e.target.value })}
            />
          </Field>
          <Field label="To">
            <TextInput
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilter({ date_to: e.target.value })}
            />
          </Field>
        </div>
        {anyFilter && (
          <div className="flex items-end">
            <Button variant="ghost" size="sm" onClick={() => setFilter({ ...EMPTY })}>
              Clear
            </Button>
          </div>
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
              onRowClick={(r) => setSelectedId(r.id)}
              empty={
                <EmptyState
                  icon={ReceiptText}
                  title="No payments yet"
                  description={
                    anyFilter
                      ? 'Nothing matches these filters.'
                      : 'Once a payment is verified or an appointment is marked completed, it appears here with its payment record.'
                  }
                />
              }
            />
            <Pagination meta={meta} onPage={setPage} />
          </>
        )}
      </div>

      {selectedId && (
        <AppointmentDetail
          id={selectedId}
          canManage={canManage}
          onClose={() => setSelectedId(null)}
          onChanged={refetch}
        />
      )}
    </div>
  )
}
