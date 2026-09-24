import { useMemo, useState } from 'react'
import { Download, History, RotateCw } from 'lucide-react'
import { api } from '../lib/api'
import { useQuery } from '../hooks/useQuery'
import { useDebounced } from '../hooks/useDebounced'
import { useMutation } from '../hooks/useMutation'
import { useAuth } from '../lib/auth'
import { DataTable, Pagination } from '../components/DataTable'
import { AppointmentDetail } from '../components/AppointmentDetail'
import { DeleteAppointmentAction } from '../components/DeleteAppointmentAction'
import {
  Button,
  EmptyState,
  ErrorState,
  Field,
  PageHeader,
  PaymentBadge,
  SearchInput,
  Select,
  SourceBadge,
  StatusBadge,
  TextInput,
  Toolbar,
} from '../components/ui'
import { formatDate, formatDateTime } from '../lib/format'

const STATUSES = ['confirmed', 'completed', 'cancelled']
const cap = (s) => s[0].toUpperCase() + s.slice(1)
const labelGender = (g) =>
  ({ male: 'Male', female: 'Female', unisex: 'Not specified' })[g] ?? g

const EMPTY = {
  search: '',
  status: '',
  source: '',
  gender: '',
  category_id: '',
  service_id: '',
  date_from: '',
  date_to: '',
}

export default function AppointmentHistoryPage() {
  const { can } = useAuth()
  const canManage = can('appointments.manage')
  const canSeeCatalogue = can('services.view')

  const [filters, setFilters] = useState(EMPTY)
  const [sort, setSort] = useState('appointment_date:desc')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState(null)
  const search = useDebounced(filters.search)

  const categories = useQuery('/admin/service-categories', {
    params: { per_page: 100 },
    enabled: canSeeCatalogue,
  })
  const services = useQuery('/admin/services', {
    params: { per_page: 200, category_id: filters.category_id || undefined },
    deps: [filters.category_id],
    enabled: canSeeCatalogue,
  })

  const [sortField, sortDir] = sort.split(':')
  const params = useMemo(
    () => ({
      search,
      status: filters.status,
      source: filters.source,
      gender: filters.gender,
      category_id: filters.category_id,
      service_id: filters.service_id,
      date_from: filters.date_from,
      date_to: filters.date_to,
      sort: sortField,
      direction: sortDir,
      page,
      per_page: 20,
    }),
    [
      search,
      filters.status,
      filters.source,
      filters.gender,
      filters.category_id,
      filters.service_id,
      filters.date_from,
      filters.date_to,
      sortField,
      sortDir,
      page,
    ],
  )

  const { data, meta, loading, error, refetch, refetching } = useQuery('/admin/appointments', {
    params,
    deps: [params],
    // Revalidate when the admin tab regains focus / is restored from bfcache so
    // new public bookings appear without a manual reload. Not interval polling.
    revalidateOnFocus: true,
  })

  const setFilter = (patch) => {
    setFilters((f) => ({ ...f, ...patch }))
    setPage(1)
  }
  const anyFilter = Object.values(filters).some(Boolean)

  const exportMut = useMutation(
    () =>
      api.download(
        '/admin/appointments/export',
        {
          search: params.search,
          status: params.status,
          source: params.source,
          gender: params.gender,
          category_id: params.category_id,
          service_id: params.service_id,
          date_from: params.date_from,
          date_to: params.date_to,
        },
        `dk-stylehub-appointments-${new Date().toISOString().slice(0, 10)}.xlsx`,
      ),
    { successMessage: 'Appointments exported.' },
  )

  // After a delete anywhere in this view: revalidate the list and, if the
  // removed row is the one open in the detail panel, drop that stale selection.
  const onDeleted = (appt) => {
    refetch()
    setSelectedId((cur) => (cur === appt?.id ? null : cur))
  }

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
          <p className="text-xs text-[var(--color-muted)]">{r.phone}</p>
        </div>
      ),
    },
    {
      key: 'service',
      header: 'Service',
      hideBelow: 'md',
      cell: (r) => (
        <div>
          <p>{r.service_name || '—'}</p>
          <p className="text-xs text-[var(--color-muted)]">
            {r.category_name || '—'} · {labelGender(r.gender)}
          </p>
        </div>
      ),
    },
    {
      key: 'stylist',
      header: 'Stylist',
      hideBelow: 'md',
      cell: (r) => <span>{r.stylist_name || '—'}</span>,
    },
    {
      key: 'appt',
      header: 'Appointment',
      cell: (r) => (
        <div className="whitespace-nowrap text-xs text-[var(--color-muted)]">
          <p className="text-sm text-[var(--color-ink-soft)]">{formatDate(r.appointment_date)}</p>
          <p>created {formatDateTime(r.created_at)}</p>
        </div>
      ),
    },
    {
      key: 'payment',
      header: 'Payment',
      hideBelow: 'lg',
      cell: (r) => <PaymentBadge status={r.payment_status} />,
    },
    {
      key: 'source',
      header: 'Source',
      hideBelow: 'lg',
      cell: (r) => <SourceBadge source={r.source} />,
    },
    {
      key: 'status',
      header: 'Status',
      align: 'right',
      cell: (r) => <StatusBadge status={r.status} />,
    },
    ...(canManage
      ? [
          {
            key: 'actions',
            header: '',
            align: 'right',
            // On phones the row is tight — delete there goes through the detail
            // dialog (tap the row → Delete). Desktop keeps the quick row action.
            hideBelow: 'md',
            cell: (r) => (
              <DeleteAppointmentAction appointment={r} onDeleted={onDeleted} />
            ),
          },
        ]
      : []),
  ]

  return (
    <div>
      <PageHeader
        title="Appointment History"
        description="The full record — every request, past and present, with payment status."
      >
        <Button
          variant="outline"
          size="sm"
          onClick={refetch}
          loading={refetching}
          disabled={refetching}
        >
          <RotateCw size={14} /> Refresh
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportMut.mutate()}
          loading={exportMut.pending}
          disabled={!data?.length}
        >
          <Download size={14} /> Export Excel
        </Button>
      </PageHeader>

      <Toolbar layout="grid">
        <SearchInput
          wrapperClassName="sm:col-span-2 lg:col-span-1"
          placeholder="Name, phone, ref or service"
          value={filters.search}
          onChange={(e) => setFilter({ search: e.target.value })}
        />
        <Field label="Status">
          <Select value={filters.status} onChange={(e) => setFilter({ status: e.target.value })}>
            <option value="">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {cap(s)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Gender">
          <Select value={filters.gender} onChange={(e) => setFilter({ gender: e.target.value })}>
            <option value="">All</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="unisex">Not specified</option>
          </Select>
        </Field>
        <Field label="Source">
          <Select value={filters.source} onChange={(e) => setFilter({ source: e.target.value })}>
            <option value="">All</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
          </Select>
        </Field>
        <Field label="Sort">
          <Select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="appointment_date:desc">Appointment · newest</option>
            <option value="appointment_date:asc">Appointment · oldest</option>
            <option value="created_at:desc">Created · newest</option>
            <option value="created_at:asc">Created · oldest</option>
          </Select>
        </Field>

        {canSeeCatalogue && (
          <>
            <Field label="Category">
              <Select
                value={filters.category_id}
                onChange={(e) => setFilter({ category_id: e.target.value, service_id: '' })}
              >
                <option value="">All categories</option>
                {(categories.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.gender})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Service">
              <Select
                value={filters.service_id}
                onChange={(e) => setFilter({ service_id: e.target.value })}
              >
                <option value="">All services</option>
                {(services.data ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
          </>
        )}

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

        {anyFilter && (
          <div className="flex items-end">
            <Button variant="ghost" size="sm" onClick={() => setFilter({ ...EMPTY })}>
              Clear all
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
              serialFrom={meta?.from ?? 1}
              onRowClick={(r) => setSelectedId(r.id)}
              empty={
                <EmptyState
                  icon={History}
                  title="Nothing in the history yet"
                  description={
                    anyFilter
                      ? 'No appointments match these filters.'
                      : 'Once appointments come in, the full record shows here.'
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
