import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useQuery } from '../hooks/useQuery'
import { useMutation } from '../hooks/useMutation'
import {
  Button,
  ChipButton,
  Detail,
  DetailList,
  EmptyState,
  Field,
  PageHeader,
  Pill,
  SectionCard,
  Select,
  TextInput,
  Thumb,
  cn,
} from '../components/ui'
import { Check, ShieldAlert } from 'lucide-react'
import { formatDuration, formatPrice } from '../lib/format'
import { formatTimeRange12h, parseDateIso, studioNow } from '../../lib/time'

const STATUSES = ['confirmed', 'completed', 'cancelled']
const PAYMENT_STATUSES = [
  ['advance_paid', 'Advance paid'],
  ['paid', 'Paid in full'],
]
const PAYMENT_METHODS = [
  ['upi', 'UPI'],
  ['cash', 'Cash'],
  ['card', 'Card'],
]
const cap = (s) => s[0].toUpperCase() + s.slice(1)

const dayFormat = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
const formatDay = (iso) => dayFormat.format(parseDateIso(iso))

// Nothing is pre-selected: the stylist, service, date and time are all chosen.
const EMPTY = {
  customer_name: '',
  phone: '',
  gender: '',
  category_id: '',
  service_id: '',
  stylist_id: '',
  appointment_date: '',
  appointment_time: '',
  status: 'confirmed',
  payment_status: 'advance_paid',
  payment_method: '',
}

const muted = 'text-sm text-[var(--color-muted)]'

/**
 * The stylists as photo cards — the first thing chosen, like the booking page.
 * A card also says how many days that stylist has hours on, or that none are set.
 */
function StylistCards({ stylists, loading, value, onPick }) {
  if (loading) return <p className={muted}>Loading stylists…</p>
  if (stylists.length === 0) return <p className={muted}>No stylists are visible yet. Add or show one under Stylists.</p>

  return (
    <div role="radiogroup" aria-label="Stylist" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {stylists.map((stylist) => {
        const selected = String(stylist.id) === String(value)
        const days = Object.keys(stylist.date_hours ?? {}).length

        return (
          <button
            key={stylist.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onPick(stylist)}
            className={cn(
              'flex flex-col overflow-hidden rounded-[var(--radius-md)] border bg-[var(--color-surface)] text-left transition-colors',
              selected
                ? 'border-[var(--color-ink)] ring-1 ring-[var(--color-ink)]'
                : 'border-[var(--color-line)] hover:border-[var(--color-line-strong)]',
            )}
          >
            <div className="relative aspect-[4/3] w-full bg-[var(--color-surface-sunken)]">
              {stylist.image_url ? (
                <Thumb src={stylist.image_url} alt="" className="h-full w-full object-top" />
              ) : (
                <span
                  aria-hidden="true"
                  className="flex h-full w-full items-center justify-center text-3xl font-semibold text-[var(--color-muted)]"
                >
                  {stylist.name?.[0]?.toUpperCase() || '?'}
                </span>
              )}
              {selected && (
                <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-ink)] text-[var(--color-paper)] shadow-sm">
                  <Check size={13} aria-hidden="true" />
                </span>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1 px-3 pb-3 pt-2.5">
              <span className="text-sm font-semibold text-[var(--color-ink)]">{stylist.name}</span>
              {stylist.bio && (
                <span className="line-clamp-2 text-xs leading-snug text-[var(--color-muted)]">{stylist.bio}</span>
              )}
              {days === 0 ? (
                <Pill tone="warn" className="self-start">
                  No dates set
                </Pill>
              ) : (
                <span className="text-xs text-[var(--color-faint)]">
                  Available on {days} day{days === 1 ? '' : 's'}
                </span>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}

/**
 * The free times for the chosen service, stylist and date — chips to click,
 * each showing which time to which time ("2:00 - 3:00 PM"), with what is already
 * booked greyed out. Nothing is typed and nothing is pre-selected: the admin
 * picks one of the times the stylist actually has.
 */
function SlotPicker({ state, waitingFor, duration, value, onChange }) {
  if (!state.ready) return <p className={muted}>{waitingFor}</p>
  if (state.loading) return <p className={muted}>Loading times…</p>
  if (state.error) {
    return <p className="text-sm text-[var(--color-danger)]">{state.error.message || 'Could not load the times.'}</p>
  }

  const slots = state.day?.slots ?? []

  if (!slots.some((slot) => slot.status === 'available')) {
    return (
      <p className={muted}>
        {state.day?.today_exhausted
          ? 'No more times are left today.'
          : slots.length > 0
            ? 'Every time on this date is already booked.'
            : 'No free times on this date.'}
      </p>
    )
  }

  return (
    <div>
      <div role="group" aria-label="Appointment time" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {slots.map((slot) => {
          const booked = slot.status !== 'available'

          return (
            <ChipButton
              key={`${slot.status}-${slot.start}`}
              active={!booked && value === slot.start}
              disabled={booked}
              title={booked ? 'Already booked' : undefined}
              className={cn(
                'min-h-9 justify-center whitespace-nowrap text-sm tabular-nums',
                booked && 'cursor-not-allowed line-through opacity-45',
              )}
              onClick={() => onChange(slot.start)}
            >
              {formatTimeRange12h(slot.start, slot.end)}
            </ChipButton>
          )
        })}
      </div>
      <p className="mt-2 text-xs text-[var(--color-faint)]">
        From – to, for a {formatDuration(duration)} appointment. Crossed-out times are already booked.
      </p>
    </div>
  )
}

/**
 * Offline Appointment — a dedicated page (not a modal) for staff to register
 * a walk-in / phone / in-person booking. It follows the booking page's order in
 * one form: stylist → their service → a date they work → a free time → the
 * customer. Dates and times come from the hours set on the stylist's Services
 * & hours page, so only what that stylist really has can be chosen. The
 * backend snapshots duration / price / advance from the chosen service, so
 * those are shown read-only here and never sent in the payload.
 */
export default function OfflineAppointmentNewPage() {
  const navigate = useNavigate()
  const { can } = useAuth()
  const canSeeCatalogue = can('services.view')

  const [form, setForm] = useState(EMPTY)
  const [localErrors, setLocalErrors] = useState({})
  const set = (patch) => {
    setForm((f) => ({ ...f, ...patch }))
    setLocalErrors((e) => {
      if (!Object.keys(patch).some((k) => e[k])) return e
      const next = { ...e }
      Object.keys(patch).forEach((k) => delete next[k])
      return next
    })
  }

  const stylists = useQuery('/admin/stylists', { params: { per_page: 100 } })
  const categories = useQuery('/admin/service-categories', {
    params: { per_page: 100 },
    enabled: canSeeCatalogue,
  })
  // Every active service once; what each stylist offers is worked out below.
  const catalogue = useQuery('/admin/services', {
    params: { per_page: 200, status: 1 },
    enabled: canSeeCatalogue,
  })

  // 1. The stylist (only ones shown on the site — their times come from the booking rules).
  const stylistList = (stylists.data ?? []).filter((s) => s.status)
  const chosenStylist = stylistList.find((s) => String(s.id) === String(form.stylist_id))

  // 2. Only what that stylist offers: their categories, then their services in the chosen one.
  const offeredIds = new Set(chosenStylist?.service_ids ?? [])
  const offeredServices = (catalogue.data ?? []).filter((s) => offeredIds.has(s.id))
  const categoryOptions = (categories.data ?? []).filter(
    (c) => c.status !== false && offeredServices.some((s) => s.category_id === c.id),
  )
  const categoryServices = offeredServices.filter((s) => String(s.category_id) === String(form.category_id))
  const selectedService = offeredServices.find((s) => String(s.id) === String(form.service_id))

  // The chosen stylist's own price / advance % for this service, if the admin set one
  // (Stylists → Services & hours); otherwise the service's standard terms.
  const ownTerms = selectedService ? chosenStylist?.service_terms?.[selectedService.id] : null
  const price = ownTerms?.price != null ? ownTerms.price : selectedService?.price
  const advancePercentage =
    ownTerms?.advance_percentage != null ? ownTerms.advance_percentage : selectedService?.advance_percentage

  const advanceAmount = selectedService
    ? Math.round(Number(price || 0) * Number(advancePercentage || 0)) / 100
    : 0

  // 3. Only the dates this stylist was given hours on, and the free times that day — the
  // stylist's own hours minus what is already booked, by the same server rules as the
  // booking page, so only times that really work are offered.
  const availableDates = Object.keys(chosenStylist?.date_hours ?? {}).sort()
  const slotsReady = Boolean(selectedService && chosenStylist && form.appointment_date)
  const slots = useQuery('/booking/slots', {
    params: { service_id: form.service_id, stylist_id: form.stylist_id, date: form.appointment_date },
    enabled: slotsReady,
  })

  // Picking a stylist keeps what still applies to them and drops what doesn't.
  const pickStylist = (stylist) => {
    const offered = new Set(stylist.service_ids ?? [])
    const services = catalogue.data ?? []
    const keepService = offered.has(Number(form.service_id))
    const keepCategory = services.some((s) => String(s.category_id) === String(form.category_id) && offered.has(s.id))
    const keepDate = Object.hasOwn(stylist.date_hours ?? {}, form.appointment_date)

    set({
      stylist_id: String(stylist.id),
      appointment_time: '',
      ...(keepService ? {} : { service_id: '' }),
      ...(keepCategory ? {} : { category_id: '', service_id: '' }),
      ...(keepDate ? {} : { appointment_date: '' }),
    })
  }

  const { mutate, pending, fieldErrors } = useMutation(
    () =>
      api.post('/admin/appointments', {
        customer_name: form.customer_name.trim(),
        phone: form.phone.trim(),
        gender: form.gender,
        category_id: form.category_id ? Number(form.category_id) : null,
        service_id: form.service_id ? Number(form.service_id) : null,
        stylist_id: form.stylist_id ? Number(form.stylist_id) : null,
        appointment_date: form.appointment_date,
        appointment_time: form.appointment_time,
        status: form.status,
        payment_status: form.payment_status,
        payment_method: form.payment_method,
      }),
    {
      successMessage: 'Offline appointment created.',
      onSuccess: () => navigate('/admin/appointments/history'),
    },
  )

  // What the customer gets on WhatsApp once this is created — mirrors the server's rule
  // (AppointmentController::notifyOfflineCreated): one message, chosen by what was paid.
  const whatsappNote =
    form.status === 'cancelled'
      ? 'A cancelled appointment sends no WhatsApp message.'
      : form.payment_status === 'paid'
        ? 'Paid in full — the customer gets the payment receipt with the bill PDF.'
        : form.status === 'confirmed'
          ? 'Advance paid — the customer gets the booking confirmation.'
          : 'No WhatsApp message is sent unless the appointment is Confirmed or Paid in full.'

  if (!canSeeCatalogue) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Service catalogue access needed"
        description="Creating an offline appointment needs the services.view permission so you can pick a service. Ask a superadmin."
      />
    )
  }

  return (
    <div>
      <PageHeader
        title="Offline Appointment"
        description="Register a walk-in, phone booking or in-person appointment. It is recorded as an offline / admin-created appointment."
      />

      <form
        className="grid items-start gap-5 xl:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault()
          const errors = {}
          if (!form.stylist_id) errors.stylist_id = 'Select a stylist.'
          if (!form.category_id) errors.category_id = 'Select a category.'
          if (!form.service_id) errors.service_id = 'Select a service.'
          if (!form.appointment_date) errors.appointment_date = 'Select a date.'
          if (!form.appointment_time) errors.appointment_time = 'Select a time.'
          if (!form.payment_method) errors.payment_method = 'Select a payment method.'
          setLocalErrors(errors)
          if (Object.keys(errors).length === 0) mutate()
        }}
      >
        <div className="flex flex-col gap-5">
          <SectionCard title="1 · Stylist">
            <Field label="Who is doing it?" required error={localErrors.stylist_id || fieldErrors.stylist_id}>
              <StylistCards
                stylists={stylistList}
                loading={stylists.loading}
                value={form.stylist_id}
                onPick={pickStylist}
              />
            </Field>
          </SectionCard>

          <SectionCard title="2 · Service">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category" required error={localErrors.category_id || fieldErrors.category_id} reserveMessage>
                <Select
                  value={form.category_id}
                  disabled={!chosenStylist}
                  onChange={(e) => set({ category_id: e.target.value, service_id: '', appointment_time: '' })}
                >
                  <option value="">
                    {!chosenStylist ? 'Choose a stylist first' : categoryOptions.length === 0 ? 'No services offered' : 'Select'}
                  </option>
                  {categoryOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.gender})
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Service" required error={localErrors.service_id || fieldErrors.service_id} reserveMessage>
                <Select
                  value={form.service_id}
                  disabled={!form.category_id}
                  onChange={(e) => set({ service_id: e.target.value, appointment_time: '' })}
                >
                  <option value="">{!form.category_id ? 'Choose a category first' : 'Select a service'}</option>
                  {categoryServices.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            {selectedService && (
              <div className="mt-2 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-sunken)] p-3.5">
                <DetailList columns={4} className="gap-y-2">
                  <Detail label="Duration" value={formatDuration(selectedService.duration_minutes)} />
                  <Detail label="Price" value={formatPrice(price)} />
                  <Detail label="Advance %" value={advancePercentage ? `${advancePercentage}%` : '—'} />
                  <Detail label="Advance amount" value={advancePercentage ? formatPrice(advanceAmount) : '—'} />
                </DetailList>
                <p className="mt-2 text-xs text-[var(--color-faint)]">
                  {ownTerms
                    ? `Uses ${chosenStylist.name}'s own price and advance for this service. Recorded when the appointment is saved.`
                    : 'Recorded from the current service configuration when the appointment is saved.'}
                </p>
              </div>
            )}
          </SectionCard>
        </div>

        <div className="flex flex-col gap-5">
          <SectionCard title="3 · Date & time">
            <div className="grid gap-4">
              <Field
                label="Appointment date"
                required
                error={localErrors.appointment_date || fieldErrors.appointment_date}
                reserveMessage
              >
                <Select
                  value={form.appointment_date}
                  onChange={(e) => set({ appointment_date: e.target.value, appointment_time: '' })}
                  disabled={!chosenStylist || availableDates.length === 0}
                >
                  <option value="">
                    {!chosenStylist ? 'Choose a stylist first' : availableDates.length === 0 ? 'No dates set' : 'Select a date'}
                  </option>
                  {availableDates.map((iso) => (
                    <option key={iso} value={iso}>
                      {formatDay(iso)}
                      {iso === studioNow().dateIso ? ' · today' : ''}
                    </option>
                  ))}
                </Select>
                {chosenStylist && availableDates.length === 0 && (
                  <p className="mt-1.5 text-xs text-[var(--color-muted)]">
                    {chosenStylist.name} has no dates set yet, so no times can be offered.{' '}
                    <Link to={`/admin/stylists/${chosenStylist.id}/setup`} className="underline">
                      Set their hours
                    </Link>
                    .
                  </p>
                )}
              </Field>
              <Field
                label="Appointment time"
                required
                error={localErrors.appointment_time || fieldErrors.appointment_time}
                reserveMessage
              >
                <SlotPicker
                  state={{
                    ready: slotsReady,
                    loading: slots.loading || slots.refetching,
                    error: slots.error,
                    day: slots.data,
                  }}
                  waitingFor={
                    !chosenStylist
                      ? 'Choose a stylist to see when they are free.'
                      : !selectedService
                        ? 'Choose a service to see the times.'
                        : 'Choose a date to see the free times.'
                  }
                  duration={selectedService?.duration_minutes}
                  value={form.appointment_time}
                  onChange={(time) => set({ appointment_time: time })}
                />
              </Field>
            </div>
          </SectionCard>

          <SectionCard title="4 · Customer" bodyClassName="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-2">
            <Field label="Customer name" required error={fieldErrors.customer_name} reserveMessage className="xl:col-span-2">
              <TextInput value={form.customer_name} onChange={(e) => set({ customer_name: e.target.value })} />
            </Field>
            <Field label="Phone" required error={fieldErrors.phone} reserveMessage>
              <TextInput
                type="tel"
                inputMode="tel"
                value={form.phone}
                onChange={(e) => set({ phone: e.target.value })}
              />
            </Field>
            <Field label="Gender" required error={fieldErrors.gender} reserveMessage>
              <Select value={form.gender} onChange={(e) => set({ gender: e.target.value })}>
                <option value="">Select</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="unisex">Not specified</option>
              </Select>
            </Field>
          </SectionCard>
        </div>

        <div className="xl:col-span-2">
          <SectionCard title="5 · Status & payment" bodyClassName="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Field label="Appointment status" error={fieldErrors.status} reserveMessage>
              <Select value={form.status} onChange={(e) => set({ status: e.target.value })}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {cap(s)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Payment status" error={fieldErrors.payment_status} reserveMessage>
              <Select value={form.payment_status} onChange={(e) => set({ payment_status: e.target.value })}>
                {PAYMENT_STATUSES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Payment method"
              required
              error={localErrors.payment_method || fieldErrors.payment_method}
              className="sm:col-span-2 xl:col-span-1"
              reserveMessage
            >
              <div role="group" aria-label="Payment method" className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map(([v, l]) => (
                  <ChipButton
                    key={v}
                    active={form.payment_method === v}
                    className="min-h-10 justify-center text-sm"
                    onClick={() => set({ payment_method: v })}
                  >
                    {l}
                  </ChipButton>
                ))}
              </div>
            </Field>
            <p className="text-xs text-[var(--color-muted)] sm:col-span-2 xl:col-span-3" data-testid="whatsapp-note">
              <span className="font-semibold text-[var(--color-ink-soft)]">WhatsApp: </span>
              {whatsappNote}
            </p>
          </SectionCard>
        </div>

        <div className="flex items-center justify-end gap-2 xl:col-span-2">
          <Button variant="ghost" type="button" onClick={() => navigate('/admin/appointments/history')} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" loading={pending}>
            Create appointment
          </Button>
        </div>
      </form>
    </div>
  )
}
