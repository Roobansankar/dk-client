import { Link } from 'react-router-dom'
import { useQuery } from '../hooks/useQuery'
import { useAuth } from '../lib/auth'
import { adminPath } from '../lib/routes'
import {
  EmptyState,
  ErrorState,
  PageHeader,
  SectionCard,
  StatGrid,
  StatusBadge,
  LoadingBlock,
} from '../components/ui'
import { RankedBars, SplitBar, TrendChart } from '../components/Charts'
import { formatTime, formatDate, relativeTime } from '../lib/format'
import { ArrowRight, CalendarClock, CalendarDays, ReceiptText } from 'lucide-react'

export default function DashboardPage() {
  const { can } = useAuth()
  const { data, loading, error, refetch } = useQuery('/admin/dashboard')

  if (loading) return <LoadingBlock label="Loading dashboard…" />
  if (error) return <ErrorState error={error} onRetry={refetch} />

  const {
    stats,
    status_distribution: status,
    appointments_over_time: trend,
    gender_distribution: gender,
    popular_services: popular,
    category_performance: categories,
    recent_appointments: recent,
  } = data

  const hasAppointments = stats.appointment_requests > 0
  const trendTotal = trend.reduce((s, d) => s + d.count, 0)
  const trendPeak = trend.reduce((a, b) => (b.count > a.count ? b : a), trend[0])
  const trendAvg = trendTotal / (trend.length || 1)

  const topStats = [
    { label: 'Appointment requests', value: stats.appointment_requests, to: adminPath('appointments') },
    {
      label: 'Confirmed',
      value: stats.confirmed_appointments,
      to: adminPath('appointments?status=confirmed'),
    },
    { label: 'Services offered', value: stats.services_offered, to: adminPath('services/female') },
    { label: 'Active pricing plans', value: stats.active_pricing_plans, to: adminPath('pricing-plans') },
  ]

  const quickLinks = [
    {
      label: 'Confirmed appointments',
      count: stats.confirmed_appointments,
      to: adminPath('appointments?status=confirmed'),
      icon: CalendarClock,
      show: can('appointments.view'),
    },
    {
      label: 'Appointment history',
      to: adminPath('appointments/history'),
      icon: CalendarDays,
      show: can('appointments.view'),
    },
    {
      label: 'Payment report',
      to: adminPath('payments'),
      icon: ReceiptText,
      show: can('payments.view'),
    },
  ].filter((l) => l.show)

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Everything the studio needs to act on, at a glance."
      />

      {quickLinks.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {quickLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="group inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-ink-soft)] transition-colors hover:border-[var(--color-ink)] hover:text-[var(--color-ink)]"
            >
              <l.icon size={15} className="text-[var(--color-faint)]" />
              {l.label}
              {l.count != null && (
                <span className="rounded-[3px] bg-[var(--color-accent-soft)] px-1.5 text-xs font-medium text-[var(--color-accent)] tabular-nums">
                  {l.count}
                </span>
              )}
              <ArrowRight
                size={13}
                className="text-[var(--color-faint)] transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          ))}
        </div>
      )}

      {/* Top statistics — one hairline-divided panel */}
      <StatGrid items={topStats} className="mb-6" />

      <div className="flex flex-col gap-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Trend */}
          <SectionCard
            title="Requests · last 30 days"
            actions={<span className="text-xs text-[var(--color-muted)]">{trendTotal} total</span>}
            className="lg:col-span-2"
            bodyClassName="flex flex-1 flex-col justify-center"
          >
            {trendTotal > 0 ? (
              <>
                <TrendChart series={trend} />
                <dl className="mt-5 grid grid-cols-3 gap-4 border-t border-[var(--color-line)] pt-5 text-sm">
                  <div>
                    <dt className="text-xs text-[var(--color-faint)]">Busiest day</dt>
                    <dd className="mt-0.5 text-[var(--color-ink)]">
                      {formatDate(trendPeak.date)}{' '}
                      <span className="text-[var(--color-muted)]">· {trendPeak.count}</span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[var(--color-faint)]">Daily average</dt>
                    <dd className="mt-0.5 text-[var(--color-ink)] tabular-nums">
                      {trendAvg.toFixed(1)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[var(--color-faint)]">Confirmed</dt>
                    <dd className="mt-0.5 text-[var(--color-ink)] tabular-nums">
                      {stats.confirmed_appointments}
                    </dd>
                  </div>
                </dl>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center py-12">
                <p className="text-center text-sm text-[var(--color-faint)]">
                  No requests in the last 30 days.
                </p>
              </div>
            )}
          </SectionCard>

          <div className="flex flex-col gap-6">
            {/* Status distribution */}
            <SectionCard title="By status" className="flex-1">
              {hasAppointments ? (
                <SplitBar
                  segments={[
                    { label: 'Confirmed', value: status.confirmed, tone: 'info' },
                    { label: 'Completed', value: status.completed, tone: 'ok' },
                    { label: 'Cancelled', value: status.cancelled, tone: 'neutral' },
                  ]}
                />
              ) : (
                <p className="py-6 text-center text-sm text-[var(--color-faint)]">
                  No appointments yet
                </p>
              )}
            </SectionCard>

            {/* Gender split */}
            <SectionCard title="Male vs female" className="flex-1">
              <SplitBar
                segments={[
                  { label: 'Female', value: gender.female, tone: 'accent' },
                  { label: 'Male', value: gender.male, tone: 'info' },
                  { label: 'Unspecified', value: gender.unisex, tone: 'neutral' },
                ]}
              />
            </SectionCard>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Popular services */}
          <SectionCard title="Popular services">
            <RankedBars items={popular} tone="accent" emptyLabel="No bookings yet" />
          </SectionCard>

          {/* Category performance */}
          <SectionCard title="Category performance">
            <RankedBars items={categories} tone="info" emptyLabel="No bookings yet" />
          </SectionCard>
        </div>

        {/* Recent activity */}
        <SectionCard
          title="Recent requests"
          actions={
            <Link
              to={adminPath('appointments')}
              className="text-xs font-medium text-[var(--color-accent)] hover:underline"
            >
              View all
            </Link>
          }
          bodyClassName="p-0"
        >
          {recent.length ? (
            <ul className="divide-y divide-[var(--color-line)]">
              {recent.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm"
                >
                  <span className="font-medium text-[var(--color-ink)]">{a.customer_name}</span>
                  <span className="text-[var(--color-muted)]">
                    {a.service_name || '—'}
                    {a.category_name ? ` · ${a.category_name}` : ''}
                  </span>
                  <span className="text-[var(--color-muted)]">
                    {formatDate(a.appointment_date)} · {formatTime(a.appointment_time)}
                  </span>
                  <span className="ml-auto flex items-center gap-3">
                    <span className="text-xs text-[var(--color-faint)]">
                      {relativeTime(a.created_at)}
                    </span>
                    <StatusBadge status={a.status} />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={CalendarDays}
              title="No appointment requests yet"
              description="Requests from the public site will show up here."
            />
          )}
        </SectionCard>
      </div>
    </div>
  )
}
