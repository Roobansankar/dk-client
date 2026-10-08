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
import { addDaysIso, formatTimeRange12h, isoRange, parseDateIso, studioNow } from '../../lib/time'
import { isStylistOpenOn, stylistHoursOn } from '../../lib/stylistAvailability'

/** How far ahead the date dropdown offers — comfortably past a typical walk-in booking. */
const OFFLINE_DATE_WINDOW_DAYS = 120

const STATUSES = ['confirmed', 'completed', 'cancelled']
const PAYMENT_STATUSES = [
  ['unpaid', 'Unpaid'],
  ['advance_paid', 'Advance paid'],
  ['paid', 'Paid in full'],
]
const PAYMENT_METHODS = [
  ['upi', 'UPI'],
  ['cash', 'Cash'],
  ['card', 'Card'],
]
const cap = (s) => s[0].toUpperCase() + s.slice(1)

/**
 * The "Combo Offer" pseudo-category. With it chosen, the Service list shows the
 * active Pricing Plans (the public "Combo Offers"), and the chosen plan's price
 * and duration are what the appointment records and the time picker uses.
 */
const COMBO = 'combo'

const dayFormat = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
const formatDay = (iso) => dayFormat.format(parseDateIso(iso))

// Nothing is pre-selected: the stylist, services, date and time are all chosen.
const EMPTY = {
  customer_name: '',
  phone: '',
  gender: '',
  category_id: '',
  service_ids: [],
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
    <div role="radiogroup" aria-label="Stylist" className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
      {stylists.map((stylist) => {
        const selected = String(stylist.id) === String(value)
        const days = Object.keys(stylist.date_hours ?? {}).length
        const hasWeeklySchedule = Object.keys(stylist.weekly_hours ?? {}).length > 0

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
            <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-[var(--color-surface-sunken)]">
              {stylist.image_url ? (
                <Thumb
                  src={stylist.image_url}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover object-center"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 flex items-center justify-center text-2xl font-semibold text-[var(--color-muted)]"
                >
                  {stylist.name?.[0]?.toUpperCase() || '?'}
                </span>
              )}
              {selected && (
                <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-ink)] text-[var(--color-paper)] shadow-sm">
                  <Check size={11} aria-hidden="true" />
                </span>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-0.5 px-2 pb-2 pt-2">
              <span className="truncate text-xs font-semibold text-[var(--color-ink)]">{stylist.name}</span>
              <span className="line-clamp-1 min-h-[1rem] text-[11px] leading-snug text-[var(--color-muted)]">
                {stylist.bio || ' '}
              </span>
              {hasWeeklySchedule ? (
                <span className="text-[11px] text-[var(--color-faint)]">
                  Weekly{days > 0 && ` · ${days} day${days === 1 ? '' : 's'}`}
                </span>
              ) : days === 0 ? (
                <Pill tone="warn" className="self-start px-1.5 py-0 text-[11px]">
                  No dates set
                </Pill>
              ) : (
                <span className="text-[11px] text-[var(--color-faint)]">
                  {days} day{days === 1 ? '' : 's'}
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
  // Studio-wide closed days — no professional can be booked on these dates.
  const holidays = useQuery('/admin/studio-holidays')
  const studioHolidays = Array.isArray(holidays.data) ? holidays.data : []
  const categories = useQuery('/admin/service-categories', {
    params: { per_page: 100 },
    enabled: canSeeCatalogue,
  })
  // Every active service once; what each stylist offers is worked out below.
  const catalogue = useQuery('/admin/services', {
    params: { per_page: 200, status: 1 },
    enabled: canSeeCatalogue,
  })
  // Combo Offers = the active pricing plans (same list the homepage shows).
  const plans = useQuery('/pricing-plans', { enabled: canSeeCatalogue })
  const planList = Array.isArray(plans.data) ? plans.data : []

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
  const isCombo = form.category_id === COMBO
  const selectedPlan = isCombo ? planList.find((p) => String(p.id) === String(form.service_ids?.[0] ?? '')) : null
  // Multi-service: every picked id resolved against what the stylist offers.
  // Durations add up into ONE combined slot; names join with commas (incl. WhatsApp).
  const selectedIds = isCombo
    ? []
    : (Array.isArray(form.service_ids) ? form.service_ids : []).map(String)
  const selectedServices = isCombo
    ? []
    : selectedIds.map((id) => offeredServices.find((s) => String(s.id) === id)).filter(Boolean)
  const duration = selectedPlan
    ? selectedPlan.duration_minutes
    : selectedServices.reduce((sum, s) => sum + (Number(s.duration_minutes) || 0), 0)

  // The chosen stylist's own price / advance % per service, if the admin set
  // one (Stylists → Services & hours); otherwise each service's standard
  // terms (mirrors Service::termsFor). Totals are summed; advance % is
  // re-derived like the server.
  const termsFor = (s) => {
    const own = chosenStylist?.service_terms?.[s.id]
    return {
      price: own?.price != null ? Number(own.price) : Number(s.price) || 0,
      percentage: own?.advance_percentage != null ? Number(own.advance_percentage) : Number(s.advance_percentage) || 0,
      ownPrice: own?.price != null,
    }
  }
  const price = selectedServices.reduce((sum, s) => sum + termsFor(s).price, 0)
  const advanceAmount = selectedServices.reduce((sum, s) => {
    const { price: p, percentage: pct } = termsFor(s)
    return sum + Math.round(p * pct) / 100
  }, 0)
  const advancePercentage = price > 0 ? Math.round((advanceAmount / price) * 100 * 100) / 100 : 0

  // 3. Only the dates this stylist actually works — a specific date, their standing
  // weekly schedule, or (once cleared) neither — and the free times that day: the
  // stylist's own hours minus what is already booked, by the same server rules as the
  // booking page, so only times that really work are offered.
  const availableDates = chosenStylist
    ? isoRange(studioNow().dateIso, addDaysIso(studioNow().dateIso, OFFLINE_DATE_WINDOW_DAYS - 1)).filter((iso) =>
        isStylistOpenOn(chosenStylist, iso, studioHolidays),
      )
    : []
  // The chosen stylist's working hours on the chosen date (same precedence as the server).
  const dateHours =
    chosenStylist && form.appointment_date ? stylistHoursOn(chosenStylist, form.appointment_date, studioHolidays) : []
  const slotsReady = Boolean(
    (selectedServices.length > 0 || selectedPlan?.duration_minutes) && chosenStylist && form.appointment_date,
  )
  const serviceSlots = useQuery('/booking/slots', {
    params: { service_ids: selectedIds, stylist_id: form.stylist_id, date: form.appointment_date },
    enabled: slotsReady && !isCombo,
  })
  // A combo offer's times are sized by the plan's duration.
  const comboSlots = useQuery('/admin/appointments/combo-slots', {
    params: { pricing_plan_id: selectedPlan?.id, stylist_id: form.stylist_id, date: form.appointment_date },
    enabled: slotsReady && isCombo,
  })
  const slots = isCombo ? comboSlots : serviceSlots

  // Picking a stylist keeps the service picks they still offer and drops the rest.
  const pickStylist = (stylist) => {
    const offered = new Set(stylist.service_ids ?? [])
    const kept = (Array.isArray(form.service_ids) ? form.service_ids : [])
      .map(String)
      .filter((id) => form.category_id === COMBO || offered.has(Number(id)))
    // A combo offer isn't tied to a stylist's services, so it stays selected.
    const keepCategory =
      form.category_id === COMBO ||
      (catalogue.data ?? []).some(
        (s) => String(s.category_id) === String(form.category_id) && offered.has(s.id),
      )
    const keepDate = Boolean(form.appointment_date) && isStylistOpenOn(stylist, form.appointment_date, studioHolidays)

    set({
      stylist_id: String(stylist.id),
      appointment_time: '',
      service_ids: kept,
      ...(keepCategory ? {} : { category_id: '' }),
      ...(keepDate ? {} : { appointment_date: '' }),
    })
  }

  // Toggle one service in the multi-select (category is only a browse lens —
  // picks in other categories stay).
  const toggleService = (id) => {
    const idStr = String(id)
    const current = (Array.isArray(form.service_ids) ? form.service_ids : []).map(String)
    set({
      appointment_time: '',
      service_ids: current.includes(idStr)
        ? current.filter((v) => v !== idStr)
        : [...current, idStr],
    })
  }

  const { mutate, pending, fieldErrors } = useMutation(
    () =>
      api.post('/admin/appointments', {
        customer_name: form.customer_name.trim(),
        phone: form.phone.trim(),
        gender: form.gender,
        ...(isCombo
          ? { pricing_plan_id: selectedPlan ? Number(selectedPlan.id) : null }
          : {
              category_id: selectedServices[0] ? Number(selectedServices[0].category_id) : form.category_id ? Number(form.category_id) : null,
              service_id: selectedServices[0] ? Number(selectedServices[0].id) : null,
              service_ids: selectedServices.map((s) => Number(s.id)),
            }),
        stylist_id: form.stylist_id ? Number(form.stylist_id) : null,
        appointment_date: form.appointment_date,
        appointment_time: form.appointment_time,
        status: form.status,
        payment_status: form.payment_status,
        // Nothing collected yet → no payment method to record.
        payment_method: form.payment_status === 'unpaid' ? null : form.payment_method,
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
          ? form.payment_status === 'unpaid'
            ? 'Unpaid — the customer gets the just-booked message (no amount).'
            : 'Advance paid — the customer gets the booking confirmation.'
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
        className="grid gap-5"
        onSubmit={(e) => {
          e.preventDefault()
          const errors = {}
          if (!form.stylist_id) errors.stylist_id = 'Select a stylist.'
          if (!form.category_id) errors.category_id = 'Select a category.'
          if (isCombo) {
            if (!selectedPlan) errors.service_ids = 'Select a combo offer.'
          } else if (selectedServices.length === 0) {
            errors.service_ids = 'Select at least one service.'
          }
          if (!form.appointment_date) errors.appointment_date = 'Select a date.'
          if (!form.appointment_time) errors.appointment_time = 'Select a time.'
          if (form.payment_status !== 'unpaid' && !form.payment_method) errors.payment_method = 'Select a payment method.'
          setLocalErrors(errors)
          if (Object.keys(errors).length === 0) mutate()
        }}
      >
        {/* Single full-width column at every size, in order 1 → 5. */}
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

        <SectionCard title="2 · Services">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category" required error={localErrors.category_id || fieldErrors.category_id} reserveMessage>
              <Select
                value={form.category_id}
                disabled={!chosenStylist}
                onChange={(e) => set({ category_id: e.target.value, appointment_time: '' })}
              >
                <option value="">{!chosenStylist ? 'Choose a stylist first' : 'Select'}</option>
                {categoryOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.gender})
                  </option>
                ))}
                <option value={COMBO}>Combo Offer</option>
              </Select>
            </Field>
            <Field
              label={isCombo ? 'Combo offer' : `Services${selectedServices.length > 0 ? ` (${selectedServices.length} selected)` : ''}`}
              required
              error={localErrors.service_ids || fieldErrors.service_ids || fieldErrors.service_id || fieldErrors.pricing_plan_id}
              reserveMessage
            >
              {isCombo ? (
                <Select
                  value={selectedPlan ? String(selectedPlan.id) : ''}
                  disabled={!form.category_id}
                  onChange={(e) => set({ service_ids: e.target.value ? [e.target.value] : [], appointment_time: '' })}
                >
                  <option value="">
                    {plans.loading
                      ? 'Loading combo offers…'
                      : planList.length === 0
                        ? 'No combo offers available'
                        : 'Select a combo offer'}
                  </option>
                  {planList.map((p) => (
                    <option key={p.id} value={p.id} disabled={!p.duration_minutes}>
                      {p.name} — {formatPrice(p.price)} ·{' '}
                      {p.duration_minutes ? formatDuration(p.duration_minutes) : 'no time set (edit the plan)'}
                    </option>
                  ))}
                </Select>
              ) : (
                <div
                  role="group"
                  aria-label="Services"
                  className="max-h-56 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-line)]"
                >
                  {!form.category_id ? (
                    <p className="px-3 py-2.5 text-sm text-[var(--color-muted)]">Choose a category first</p>
                  ) : categoryServices.length === 0 ? (
                    <p className="px-3 py-2.5 text-sm text-[var(--color-muted)]">No services in this category.</p>
                  ) : (
                    categoryServices.map((s) => {
                      const checked = selectedIds.includes(String(s.id))
                      const terms = termsFor(s)
                      return (
                        <label
                          key={s.id}
                          className={cn(
                            'flex cursor-pointer items-center gap-2.5 border-b border-[var(--color-line)] px-3 py-2 text-sm last:border-b-0',
                            checked ? 'bg-[var(--color-accent-soft)]' : 'hover:bg-[var(--color-surface-sunken)]',
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleService(s.id)}
                            className="h-4 w-4 shrink-0 accent-[var(--color-accent)]"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium text-[var(--color-ink)]">{s.name}</span>
                            <span className="block text-xs text-[var(--color-muted)]">
                              {formatDuration(s.duration_minutes)} · {formatPrice(terms.price)}
                              {terms.ownPrice && ` (${chosenStylist.name}'s price · standard ${formatPrice(s.price)})`}
                            </span>
                          </span>
                          {checked && <Check size={14} aria-hidden="true" className="shrink-0 text-[var(--color-accent)]" />}
                        </label>
                      )
                    })
                  )}
                </div>
              )}
            </Field>
          </div>
          {selectedServices.length > 0 && !isCombo && (
            <p className="mt-2 text-xs text-[var(--color-muted)]">
              {selectedServices.map((s) => s.name).join(', ')}
              {duration > 0 && ` · ${formatDuration(duration)} total`}
            </p>
          )}

          {selectedPlan && (
            <div className="mt-2 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-sunken)] p-3.5">
              <DetailList columns={4} className="gap-y-2">
                <Detail label="Pricing plan" value={selectedPlan.name} />
                <Detail label="Duration" value={formatDuration(selectedPlan.duration_minutes)} />
                <Detail label="Price" value={formatPrice(selectedPlan.price)} />
                <Detail label="Advance %" value="—" />
              </DetailList>
              <p className="mt-2 text-xs text-[var(--color-faint)]">
                Recorded as a Combo Offer from this pricing plan&apos;s price and time when the appointment is saved.
              </p>
            </div>
          )}

          {selectedServices.length > 0 && !isCombo && (
            <div className="mt-2 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-sunken)] p-3.5">
              <DetailList columns={4} className="gap-y-2">
                <Detail label="Services" value={selectedServices.map((s) => s.name).join(', ')} />
                <Detail label="Duration" value={formatDuration(duration)} />
                <Detail label="Price" value={formatPrice(price)} />
                <Detail label="Advance %" value={advancePercentage ? `${advancePercentage}%` : '—'} />
              </DetailList>
              <p className="mt-2 text-xs text-[var(--color-faint)]">
                {selectedServices.length > 1
                  ? `Combined time for ${selectedServices.length} services in one slot. Recorded when the appointment is saved.`
                  : 'Recorded from the current service configuration when the appointment is saved.'}
              </p>
            </div>
          )}
        </SectionCard>

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
              {chosenStylist && dateHours.length > 0 && (
                <p className="mt-1.5 text-xs text-[var(--color-muted)]" data-testid="stylist-hours">
                  {chosenStylist.name} works {dateHours.map((h) => formatTimeRange12h(h.start, h.end)).join(', ')} on this date.
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
                    : selectedServices.length === 0 && !selectedPlan
                      ? 'Choose services to see the times.'
                      : 'Choose a date to see the free times.'
                }
                duration={duration}
                value={form.appointment_time}
                onChange={(time) => set({ appointment_time: time })}
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="4 · Customer" bodyClassName="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          <Field label="Customer name" required error={fieldErrors.customer_name} reserveMessage className="sm:col-span-2 md:col-span-1">
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

        <SectionCard title="5 · Payment" bodyClassName="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
            required={form.payment_status !== 'unpaid'}
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

        <div className="flex items-center justify-end gap-2">
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
