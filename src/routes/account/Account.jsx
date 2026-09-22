import { useId, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { CalendarClock, CalendarDays, LogOut, RefreshCw, Sparkles } from 'lucide-react'
import Container from '../../components/layout/Container'
import { useAuth } from '../../context/AuthContext'
import { ApiError } from '../../lib/api'
import { formatTime12h, studioDateRelation, studioNow } from '../../lib/time'
import { formatInr } from '../../data/services'
import { useAccountAppointments } from '../../hooks/useAccountAppointments'
import { Skeleton } from '../../components/StateViews'

const BOOKING = { pathname: '/', hash: '#booking' }

const FIELD =
  'mt-2 w-full rounded-sm border border-line-strong bg-paper px-3.5 py-2.5 text-ink transition-colors focus-visible:border-ink disabled:cursor-not-allowed disabled:text-muted'
const FIELD_ERROR = 'border-ink!'
const LABEL = 'eyebrow block'

const STATUS_LABEL = {
  pending: 'Pending confirmation',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rejected: 'Declined',
}
const PAYMENT_LABEL = {
  unpaid: 'No payment yet',
  advance_paid: 'Confirmation fee paid',
  paid: 'Fully paid',
}
/** Statuses/payment states that read as "settled" — a quiet accent border
 *  instead of the neutral hairline, so the eye finds what's actually done. */
const SETTLED_STATUS = new Set(['confirmed', 'completed'])
const SETTLED_PAYMENT = new Set(['advance_paid', 'paid'])

function initials(name) {
  if (!name) return '?'
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
}

function Avatar({ user, size = 16 }) {
  const cls = size === 20 ? 'h-20 w-20 text-2xl' : 'h-16 w-16 text-xl'
  if (user?.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt=""
        className={clsx('shrink-0 rounded-full border border-line object-cover', cls)}
      />
    )
  }
  return (
    <span
      aria-hidden="true"
      className={clsx(
        'flex shrink-0 items-center justify-center rounded-full border border-line bg-surface-sunken font-serif text-ink-soft',
        cls,
      )}
    >
      {initials(user?.name)}
    </span>
  )
}

/** True for an appointment that's still ahead of the customer, not cancelled/declined/completed. */
function isUpcoming(appointment, now) {
  return (
    studioDateRelation(appointment.appointment_date, now) !== 'past' &&
    !['cancelled', 'rejected', 'completed'].includes(appointment.status)
  )
}

function sortKey(a) {
  return `${a.appointment_date || ''} ${a.appointment_time || ''}`
}

function memberSince(createdAt) {
  if (!createdAt) return null
  const d = new Date(createdAt)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function Pill({ children, settled }) {
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

/* ------------------------------------------------------------------ */
/* Header                                                              */
/* ------------------------------------------------------------------ */

function AccountHeader({ user, onLogout }) {
  const since = memberSince(user?.created_at)
  return (
    <div className="flex flex-wrap items-start justify-between gap-6">
      <div className="flex items-center gap-5">
        <Avatar user={user} size={20} />
        <div>
          <p className="eyebrow">My Account</p>
          <h1 className="mt-1 font-serif text-2xl text-ink sm:text-3xl">{user?.name || 'Your profile'}</h1>
          <p className="mt-1.5 text-sm text-ink-soft">
            {[user?.email, user?.phone].filter(Boolean).join(' · ') || '—'}
          </p>
          {since && <p className="mt-0.5 text-xs text-muted">Member since {since}</p>}
        </div>
      </div>
      <button type="button" onClick={onLogout} className="btn btn-outline shrink-0">
        <LogOut size={15} aria-hidden="true" />
        Log out
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */

function StatTile({ label, value, loading }) {
  return (
    <div className="border border-line bg-surface px-4 py-4 text-center sm:px-5">
      {loading ? (
        <Skeleton className="mx-auto h-7 w-12" />
      ) : (
        <p className="font-serif text-2xl text-ink sm:text-3xl">{value}</p>
      )}
      <p className="eyebrow mt-1.5">{label}</p>
    </div>
  )
}

function OverviewStats({ appointments }) {
  const stats = useMemo(() => {
    if (appointments.loading || appointments.error) return null
    const now = studioNow()
    const items = appointments.items
    return {
      total: items.length,
      upcoming: items.filter((a) => isUpcoming(a, now)).length,
      completed: items.filter((a) => a.status === 'completed').length,
      totalSpent: items.reduce((sum, a) => sum + (Number(a.amount_received) || 0), 0),
    }
  }, [appointments])

  const tiles = [
    { label: 'Appointments', value: stats?.total ?? 0 },
    { label: 'Upcoming', value: stats?.upcoming ?? 0 },
    { label: 'Completed', value: stats?.completed ?? 0 },
    { label: 'Total spent', value: stats ? formatInr(stats.totalSpent) : formatInr(0) },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Account overview">
      {tiles.map((tile) => (
        <StatTile key={tile.label} {...tile} loading={appointments.loading} />
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Upcoming appointment                                                */
/* ------------------------------------------------------------------ */

function BookingCta({ compact }) {
  return (
    <div
      className={clsx(
        'flex flex-col items-start gap-4 border border-dashed border-line-strong bg-surface px-6 text-left sm:flex-row sm:items-center sm:justify-between',
        compact ? 'py-6' : 'py-10 text-center sm:text-left',
      )}
    >
      <div className="flex items-start gap-4">
        <span
          aria-hidden="true"
          className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line-strong text-ink-soft sm:flex"
        >
          <Sparkles size={16} strokeWidth={1.75} />
        </span>
        <div>
          <p className="font-serif text-lg text-ink">No upcoming appointment</p>
          <p className="mt-1 text-sm text-muted">
            Book your next visit and it will show up here with its status and payment record.
          </p>
        </div>
      </div>
      <Link to={BOOKING} className="btn shrink-0">
        Book an appointment
      </Link>
    </div>
  )
}

function UpcomingAppointmentCard({ appointment }) {
  return (
    <div className="border border-line-strong bg-surface p-6 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="eyebrow flex items-center gap-1.5 text-muted">
          <CalendarClock size={13} aria-hidden="true" /> Next appointment
        </span>
        <span className="text-xs uppercase tracking-[0.12em] text-muted">{appointment.reference}</span>
      </div>

      <p className="mt-3 font-serif text-xl text-ink sm:text-2xl">
        {appointment.service_name || 'Appointment'}
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="eyebrow">Stylist</dt>
          <dd className="mt-1 text-ink-soft">{appointment.stylist_name || 'Any available'}</dd>
        </div>
        <div>
          <dt className="eyebrow">Date</dt>
          <dd className="mt-1 tabular-nums text-ink-soft">{appointment.appointment_date || '—'}</dd>
        </div>
        <div>
          <dt className="eyebrow">Time</dt>
          <dd className="mt-1 tabular-nums text-ink-soft">
            {appointment.appointment_time ? formatTime12h(appointment.appointment_time) : '—'}
          </dd>
        </div>
        <div>
          <dt className="eyebrow">Price</dt>
          <dd className="mt-1 tabular-nums text-ink-soft">
            {appointment.service_price != null ? formatInr(appointment.service_price) : '—'}
          </dd>
        </div>
      </dl>

      <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-5">
        <Pill settled={SETTLED_STATUS.has(appointment.status)}>
          {STATUS_LABEL[appointment.status] || appointment.status}
        </Pill>
        <Pill settled={SETTLED_PAYMENT.has(appointment.payment_status)}>
          {PAYMENT_LABEL[appointment.payment_status] || appointment.payment_status}
        </Pill>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Appointment history                                                 */
/* ------------------------------------------------------------------ */

function AppointmentRow({ appointment }) {
  return (
    <li className="border-t border-line py-5 first:border-t-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="font-serif text-lg text-ink">{appointment.service_name || 'Appointment'}</p>
        <span className="text-xs uppercase tracking-[0.12em] text-muted">{appointment.reference}</span>
      </div>
      <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-soft">
        {appointment.category_name && (
          <div className="flex gap-1.5">
            <dt className="text-muted">Category</dt>
            <dd>{appointment.category_name}</dd>
          </div>
        )}
        <div className="flex gap-1.5">
          <dt className="text-muted">Stylist</dt>
          <dd>{appointment.stylist_name || 'Any available'}</dd>
        </div>
        {appointment.appointment_date && (
          <div className="flex gap-1.5">
            <dt className="text-muted">Date</dt>
            <dd className="tabular-nums">{appointment.appointment_date}</dd>
          </div>
        )}
        {appointment.appointment_time && (
          <div className="flex gap-1.5">
            <dt className="text-muted">Time</dt>
            <dd className="tabular-nums">{formatTime12h(appointment.appointment_time)}</dd>
          </div>
        )}
        {appointment.service_price != null && (
          <div className="flex gap-1.5">
            <dt className="text-muted">Price</dt>
            <dd className="tabular-nums">{formatInr(appointment.service_price)}</dd>
          </div>
        )}
      </dl>
      <div className="mt-3 flex flex-wrap gap-2">
        <Pill settled={SETTLED_STATUS.has(appointment.status)}>
          {STATUS_LABEL[appointment.status] || appointment.status}
        </Pill>
        <Pill settled={SETTLED_PAYMENT.has(appointment.payment_status)}>
          {PAYMENT_LABEL[appointment.payment_status] || appointment.payment_status}
        </Pill>
      </div>
    </li>
  )
}

function AppointmentsPanel({ appointments }) {
  if (appointments.loading) {
    return (
      <ul aria-hidden="true">
        {Array.from({ length: 3 }).map((_, i) => (
          <li key={i} className="border-t border-line py-5 first:border-t-0">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="mt-4 h-3 w-full max-w-sm" />
            <Skeleton className="mt-3 h-5 w-40" />
          </li>
        ))}
      </ul>
    )
  }

  if (appointments.error) {
    return (
      <div className="flex flex-col items-start gap-3 border border-line bg-surface px-6 py-8 text-sm">
        <p className="text-ink-soft">
          {appointments.error instanceof ApiError && appointments.error.network
            ? 'We couldn’t reach the server. Please check your connection and try again.'
            : 'Something went wrong loading your appointments.'}
        </p>
        <button type="button" onClick={appointments.refetch} className="btn btn-outline">
          <RefreshCw size={14} aria-hidden="true" /> Try again
        </button>
      </div>
    )
  }

  if (appointments.items.length === 0) {
    return <BookingCta />
  }

  const now = studioNow()
  const sorted = [...appointments.items].sort((a, b) => sortKey(b).localeCompare(sortKey(a)))
  const upcoming = appointments.items
    .filter((a) => isUpcoming(a, now))
    .sort((a, b) => sortKey(a).localeCompare(sortKey(b)))
  const next = upcoming[0] || null

  return (
    <div className="space-y-12">
      <section>
        <h2 className="flex items-center gap-2 font-serif text-xl text-ink">
          <CalendarClock size={18} aria-hidden="true" className="text-muted" /> Upcoming appointment
        </h2>
        <div className="mt-5">{next ? <UpcomingAppointmentCard appointment={next} /> : <BookingCta compact />}</div>
      </section>

      <section>
        <h2 className="flex items-center gap-2 font-serif text-xl text-ink">
          <CalendarDays size={18} aria-hidden="true" className="text-muted" /> Appointment history
        </h2>
        <ul className="mt-5">
          {sorted.map((a) => (
            <AppointmentRow key={a.id} appointment={a} />
          ))}
        </ul>
      </section>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Profile + password                                                  */
/* ------------------------------------------------------------------ */

function ProfileSection() {
  const uid = useId()
  const { user, updateProfile } = useAuth()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const startEdit = () => {
    setForm({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '' })
    setFieldErrors({})
    setFormError(null)
    setSuccess(null)
    setEditing(true)
  }

  const update = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }))
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setFormError(null)
    try {
      await updateProfile({ name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() || null })
      setEditing(false)
      setSuccess('Your profile has been updated.')
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setFieldErrors(err.fieldErrors())
        setFormError('Please check the highlighted fields and try again.')
      } else if (err instanceof ApiError && err.network) {
        setFormError('We couldn’t reach the server. Please check your connection and try again.')
      } else {
        setFormError((err && err.message) || 'Something went wrong. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (!editing) {
    return (
      <div>
        {success && <p className="mb-5 border-l-2 border-line-strong pl-4 text-sm text-ink-soft">{success}</p>}
        <dl className="border-t border-line">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-0.5 border-b border-line py-3">
            <dt className="eyebrow">Name</dt>
            <dd className="text-ink">{user?.name}</dd>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-0.5 border-b border-line py-3">
            <dt className="eyebrow">Email</dt>
            <dd className="text-ink">{user?.email}</dd>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-0.5 border-b border-line py-3">
            <dt className="eyebrow">Phone</dt>
            <dd className="text-ink">{user?.phone || '—'}</dd>
          </div>
        </dl>
        <button type="button" onClick={startEdit} className="btn btn-outline mt-6">
          Edit details
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div>
        <label htmlFor={`${uid}-name`} className={LABEL}>
          Name
        </label>
        <input
          id={`${uid}-name`}
          className={clsx(FIELD, fieldErrors.name && FIELD_ERROR)}
          value={form.name}
          onChange={update('name')}
          required
        />
        {fieldErrors.name && <p className="mt-1.5 text-sm text-ink">{fieldErrors.name}</p>}
      </div>
      <div className="mt-5">
        <label htmlFor={`${uid}-email`} className={LABEL}>
          Email
        </label>
        <input
          id={`${uid}-email`}
          type="email"
          className={clsx(FIELD, fieldErrors.email && FIELD_ERROR)}
          value={form.email}
          onChange={update('email')}
          required
        />
        {fieldErrors.email && <p className="mt-1.5 text-sm text-ink">{fieldErrors.email}</p>}
      </div>
      <div className="mt-5">
        <label htmlFor={`${uid}-phone`} className={LABEL}>
          Phone
        </label>
        <input
          id={`${uid}-phone`}
          type="tel"
          inputMode="tel"
          className={clsx(FIELD, fieldErrors.phone && FIELD_ERROR)}
          value={form.phone}
          onChange={update('phone')}
        />
        {fieldErrors.phone && <p className="mt-1.5 text-sm text-ink">{fieldErrors.phone}</p>}
      </div>

      {formError && (
        <p role="alert" className="mt-5 border-l-2 border-ink pl-4 text-sm text-ink">
          {formError}
        </p>
      )}

      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <button type="submit" className="btn" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save changes'}
        </button>
        <button type="button" onClick={() => setEditing(false)} className="btn btn-outline" disabled={submitting}>
          Cancel
        </button>
      </div>
    </form>
  )
}

function PasswordSection() {
  const uid = useId()
  const { updatePassword } = useAuth()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ current_password: '', password: '', password_confirmation: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const update = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }))
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setFormError(null)
    try {
      await updatePassword(form)
      setForm({ current_password: '', password: '', password_confirmation: '' })
      setSuccess('Your password has been updated.')
      setOpen(false)
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setFieldErrors(err.fieldErrors())
        setFormError('Please check the highlighted fields and try again.')
      } else {
        setFormError((err && err.message) || 'Something went wrong. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) {
    return (
      <div>
        {success && <p className="mb-4 border-l-2 border-line-strong pl-4 text-sm text-ink-soft">{success}</p>}
        <button type="button" onClick={() => setOpen(true)} className="btn btn-outline">
          Change password
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-sm">
      <div>
        <label htmlFor={`${uid}-current`} className={LABEL}>
          Current password
        </label>
        <input
          id={`${uid}-current`}
          type="password"
          className={clsx(FIELD, fieldErrors.current_password && FIELD_ERROR)}
          value={form.current_password}
          onChange={update('current_password')}
          autoComplete="current-password"
          required
        />
        {fieldErrors.current_password && (
          <p className="mt-1.5 text-sm text-ink">{fieldErrors.current_password}</p>
        )}
      </div>
      <div className="mt-5">
        <label htmlFor={`${uid}-new`} className={LABEL}>
          New password
        </label>
        <input
          id={`${uid}-new`}
          type="password"
          className={clsx(FIELD, fieldErrors.password && FIELD_ERROR)}
          value={form.password}
          onChange={update('password')}
          autoComplete="new-password"
          required
        />
        {fieldErrors.password && <p className="mt-1.5 text-sm text-ink">{fieldErrors.password}</p>}
      </div>
      <div className="mt-5">
        <label htmlFor={`${uid}-confirm`} className={LABEL}>
          Confirm new password
        </label>
        <input
          id={`${uid}-confirm`}
          type="password"
          className={FIELD}
          value={form.password_confirmation}
          onChange={update('password_confirmation')}
          autoComplete="new-password"
          required
        />
      </div>

      {formError && (
        <p role="alert" className="mt-5 border-l-2 border-ink pl-4 text-sm text-ink">
          {formError}
        </p>
      )}

      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <button type="submit" className="btn" disabled={submitting}>
          {submitting ? 'Saving…' : 'Update password'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn btn-outline" disabled={submitting}>
          Cancel
        </button>
      </div>
    </form>
  )
}

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

export default function Account() {
  const { user, logout } = useAuth()
  const appointments = useAccountAppointments()

  return (
    <>
      <title>My Account — DK StyleHub</title>
      <meta name="description" content="Manage your DK StyleHub profile and appointments." />

      <div className="border-t border-line bg-surface">
        <Container className="section-y">
          <AccountHeader user={user} onLogout={logout} />

          <div className="mt-10">
            <OverviewStats appointments={appointments} />
          </div>

          <div className="mt-14 grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="order-2 lg:order-1 lg:col-span-7">
              <AppointmentsPanel appointments={appointments} />
            </div>

            <div className="order-1 lg:order-2 lg:col-span-5">
              <h2 className="font-serif text-xl text-ink">Profile details</h2>
              <div className="mt-6">
                <ProfileSection />
              </div>
              <div className="mt-10 border-t border-line pt-8">
                <h2 className="font-serif text-xl text-ink">Password</h2>
                <div className="mt-6">
                  <PasswordSection />
                </div>
              </div>
            </div>
          </div>
        </Container>
      </div>
    </>
  )
}
