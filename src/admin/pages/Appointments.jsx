import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarDays, RotateCw } from 'lucide-react'
import { useQuery } from '../hooks/useQuery'
import { useDebounced } from '../hooks/useDebounced'
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
import { formatDate, formatTime } from '../lib/format'

const STATUSES = ['confirmed', 'completed', 'cancelled']
const cap = (s) => s[0].toUpperCase() + s.slice(1)
const labelGender = (g) =>
  ({ male: 'Male', female: 'Female', unisex: 'Not specified' })[g] ?? g

export default function AppointmentsPage() {
  const { can } = useAuth()
  const canManage = can('appointments.manage')
  const [searchParams] = useSearchParams()

  const [filters, setFilters] = useState({
    status: searchParams.get('status') ?? '',
    date: '',
    search: '',
  })
  const [page, setPage] = useState(1)
  const search = useDebounced(filters.search)
  const [selectedId, setSelectedId] = useState(null)

  const params = useMemo(
    () => ({ status: filters.status, date: filters.date, search, page, per_page: 15 }),
    [filters.status, filters.date, search, page],
  )

  const { data, meta, loading, error, refetch, refetching } = useQuery('/admin/appointments', {
    params,
    deps: [params],
    // Pull fresh appointments when the admin returns to this tab/window (or the
    // page is restored from bfcache) so public bookings show up without a
    // manual reload. Mounting the page also fetches. Not interval polling.
    revalidateOnFocus: true,
  })

  const setFilter = (patch) => {
    setFilters((f) => ({ ...f, ...patch }))
    setPage(1)
  }

  // After a delete anywhere in this view: revalidate the list and, if the
  // removed row is the one open in the detail panel, drop that stale selection.
  const onDeleted = (appt) => {
    refetch()
    setSelectedId((cur) => (cur === appt?.id ? null : cur))
  }

  const columns = [
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
      key: 'when',
      header: 'When',
      cell: (r) => (
        <div className="whitespace-nowrap">
          <p>{formatDate(r.appointment_date)}</p>
          <p className="text-xs text-[var(--color-muted)]">{formatTime(r.appointment_time)}</p>
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
      hideBelow: 'md',
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
        title="Appointments"
        description="Requests from the public booking form. Confirm, reschedule or close them out."
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
      </PageHeader>

      <Toolbar>
        <SearchInput
          wrapperClassName="min-w-[12rem] flex-1"
          placeholder="Name, phone, reference or service"
          value={filters.search}
          onChange={(e) => setFilter({ search: e.target.value })}
        />
        <Field label="Status" className="w-40">
          <Select value={filters.status} onChange={(e) => setFilter({ status: e.target.value })}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {cap(s)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Date" className="w-44">
          <TextInput
            type="date"
            value={filters.date}
            onChange={(e) => setFilter({ date: e.target.value })}
          />
        </Field>
        {(filters.status || filters.date || filters.search) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilter({ status: '', date: '', search: '' })}
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
              onRowClick={(r) => setSelectedId(r.id)}
              empty={
                <EmptyState
                  icon={CalendarDays}
                  title="No appointments match"
                  description={
                    filters.status || filters.date || filters.search
                      ? 'Try widening the filters.'
                      : 'New requests from the website will appear here.'
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
