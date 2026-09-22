import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ArrowRight, Check } from 'lucide-react'
import clsx from 'clsx'
import Container from '../layout/Container'
import { useCatalogue } from '../../context/CatalogueContext'
import { useSite } from '../../context/SiteContext'
import { useStylists } from '../../context/StylistsContext'
import { useAuth } from '../../context/AuthContext'
import BookingAuthGate from '../account/BookingAuthGate'
import {
  bookingGenders,
  bookingCategories,
  genderForApi,
  getBookableServices,
} from '../../data/booking'
import { useAvailableSlots } from '../../hooks/useAvailableSlots'
import { dayParts, maxBookingWindowDays } from '../../data/bookingTimes'
import { formatInr } from '../../data/services'
import { apiPost, ApiError } from '../../lib/api'
import { loadRazorpayCheckout } from '../../lib/razorpay'
import {
  addDaysIso,
  formatTime12h,
  formatTimeRange12h,
  studioNow,
  toMinutes,
} from '../../lib/time'
import { StatusLine } from '../StateViews'
import { DateRail } from '../ui/DateRail'
import OptionTiles from '../ui/OptionTiles'
import ServiceOptionList from '../ui/ServiceOptionList'

/** Today's date in the studio's timezone (see lib/time.js) — the earliest
 *  bookable day, and the boundary for filtering out past times. */
const todayIso = () => studioNow().dateIso

/** The last date the "Select a date" rail offers — today counts as day 1 of
 *  the window, so N days total ends at N-1 days after today. */
const maxDateIso = () => addDaysIso(todayIso(), maxBookingWindowDays - 1)

const FIELD =
  'mt-2 w-full rounded-sm border border-line-strong bg-paper px-3.5 py-2.5 text-ink transition-colors focus-visible:border-ink disabled:cursor-not-allowed disabled:text-muted'
// `!` forces this to win over FIELD's `border-line-strong` — same specificity,
// same property, and `border-line-strong` sorts after `border-ink` in the
// compiled stylesheet, so without `!` an errored field's border silently stays
// the default color. Only used by the remaining native inputs/selects
// (name, phone, stylist) — the tile-based fields (OptionTiles, ServiceOptionList,
// DateRail) take their own `invalid` prop instead.
const FIELD_ERROR = 'border-ink!'
const LABEL = 'eyebrow block'

const EMPTY = {
  name: '',
  phone: '',
  gender: '',
  category: '',
  service: '',
  stylist: '',
  date: '',
  time: '',
}

/** Every field the studio needs before the trust/review step — all required. */
const REQUIRED_FIELDS = {
  name: 'Your name',
  phone: 'A phone number',
  gender: 'Gender',
  category: 'Category',
  service: 'Service',
  stylist: 'A stylist',
  date: 'Preferred date',
  time: 'Preferred time',
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Booking now requires a signed-in customer to submit (see
// Api\Public\AppointmentController::store's `auth:sanctum` requirement).
// A guest who has already made every selection is sent through the
// login/register/Google gate rather than losing them — the in-progress
// form is stashed here (sessionStorage survives the full-page round trip
// Google OAuth requires; plain component state would not) and restored once
// they return authenticated. Expires after 30 minutes so a stale draft from
// a long-abandoned session never surprises someone on an unrelated visit.
const BOOKING_DRAFT_KEY = 'dk-booking-draft'
const BOOKING_DRAFT_TTL_MS = 30 * 60 * 1000

function saveBookingDraft(form) {
  try {
    sessionStorage.setItem(BOOKING_DRAFT_KEY, JSON.stringify({ form, savedAt: Date.now() }))
  } catch {
    /* private mode — the gate still works, selections just won't survive it */
  }
}

function takeBookingDraft() {
  try {
    const raw = sessionStorage.getItem(BOOKING_DRAFT_KEY)
    sessionStorage.removeItem(BOOKING_DRAFT_KEY)
    if (!raw) return null
    const { form, savedAt } = JSON.parse(raw)
    if (!form || Date.now() - savedAt > BOOKING_DRAFT_TTL_MS) return null
    return form
  } catch {
    return null
  }
}

/** One label / value line in the review summary. */
function SummaryRow({ label, children }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-0.5 border-b border-line py-3">
      <dt className="eyebrow">{label}</dt>
      <dd className="text-ink tabular-nums">{children}</dd>
    </div>
  )
}

/**
 * Native booking form. Categories and services come from the live backend
 * catalogue; the request is submitted to `POST /api/appointments`. Time slots
 * are preferred-time choices (the studio confirms the final time). No payment
 * is handled here — any advance shown is informational and collected by the
 * studio on confirmation.
 */
export default function Booking() {
  const uid = useId()
  const { state } = useLocation()
  const site = useSite()
  const {
    categories,
    loading: catalogueLoading,
    error: catalogueError,
  } = useCatalogue()
  const { stylists, loading: stylistsLoading } = useStylists()
  const noRoster = !stylistsLoading && stylists.length === 0
  const { user: authUser, status: authStatus } = useAuth()

  const [form, setForm] = useState(() => {
    const prefill = state?.prefill
    return prefill
      ? {
          ...EMPTY,
          gender: prefill.gender ?? '',
          category: prefill.category ?? '',
          service: prefill.service != null ? String(prefill.service) : '',
        }
      : EMPTY
  })

  // Browsing/selecting stays fully guest-accessible — this only pre-fills
  // name/phone for a signed-in customer, once their profile loads, and only
  // into fields the visitor hasn't already typed something into. Ownership
  // (user_id) is never a submitted field; it's attached server-side from the
  // bearer token (see Api\Public\AppointmentController::store). "Adjust
  // state during render" (guarded to fire once) rather than an effect — the
  // session resolving is exactly the kind of one-time, prop-like transition
  // that pattern is for, not an external-system sync.
  const [appliedAuthPrefill, setAppliedAuthPrefill] = useState(false)
  if (!appliedAuthPrefill && authStatus === 'authed' && authUser) {
    setAppliedAuthPrefill(true)
    setForm((prev) => ({
      ...prev,
      name: prev.name || authUser.name || '',
      phone: prev.phone || authUser.phone || '',
    }))
  }

  // idle | review | submitting | success | error
  const [status, setStatus] = useState('idle')
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [result, setResult] = useState(null)
  const sectionRef = useRef(null)
  // Actually submitting the appointment requires a signed-in customer (see
  // routes/api.php's `auth:sanctum` on POST /appointments) — this gate is
  // what a guest sees instead when they try to continue past the form.
  const [showAuthGate, setShowAuthGate] = useState(false)

  // On return from the login/register/Google detour: once the session
  // resolves to authenticated, restore any saved in-progress booking and
  // jump straight to the review step — the visitor already passed local
  // validation before the gate appeared, so there's nothing left to re-check
  // before showing them the same summary they were about to confirm.
  const [restoredBookingDraft, setRestoredBookingDraft] = useState(false)
  if (!restoredBookingDraft && authStatus === 'authed') {
    setRestoredBookingDraft(true)
    const draft = takeBookingDraft()
    if (draft) {
      setForm(draft)
      setStatus('review')
    }
  }
  // The appointment created for the current review step, kept across a
  // failed/cancelled payment retry so "Continue" never creates a second
  // appointment — it just re-opens Checkout for the same one (see
  // `sendRequest`/`payForBooking`).
  const [bookingRef, setBookingRef] = useState(null)

  const update = (key) => (event) => {
    const { value } = event.target
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'gender' || key === 'category') {
        next.service = ''
        next.time = ''
      }
      if (key === 'service' || key === 'date') next.time = ''
      return next
    })
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev))
  }

  // Same field-update logic as `update`, but for controls that hand back a
  // raw value instead of a change event — OptionTiles (gender/category),
  // ServiceOptionList (service), DateRail (date), and the stylist field's
  // mobile-only <MobileListbox> (see components/ui/MobileListbox.jsx). Just
  // wraps `update` in a matching `{ target: { value } }` shape, so no logic
  // is duplicated: gender/category still reset service+time exactly as
  // `update` does.
  const updateValue = (key) => (value) => update(key)({ target: { value } })

  // The time picker is a group of buttons, not a native <select>, so it sets
  // `form.time` directly. The stored value stays the 24-hour "H:i" the API
  // expects; only the button label is 12-hour.
  const chooseTime = (value) => {
    setForm((prev) => ({ ...prev, time: value }))
    setFieldErrors((prev) => (prev.time ? { ...prev, time: undefined } : prev))
  }

  const categoryOptions = useMemo(() => bookingCategories(categories), [categories])
  const services = useMemo(
    () => getBookableServices(categories, form.gender, form.category),
    [categories, form.gender, form.category],
  )
  const selectedService = services.find((s) => String(s.id) === String(form.service))

  // `{ value, label }` option list for the Category <OptionTiles> below —
  // same source data as `categoryOptions`, just reshaped once. `bookingGenders`
  // already matches this shape, so Gender's <OptionTiles> reads it directly.
  const categoryListOptions = useMemo(
    () => categoryOptions.map((option) => ({ value: option.id, label: option.name })),
    [categoryOptions],
  )
  // Same reshape, but for the stylist field's mobile-only <MobileListbox> —
  // stylist has no tile-based replacement, so it keeps the native
  // <select>/<MobileListbox> split the other fields moved off of.

  const readyForSlots = Boolean(form.service && form.date)
  const {
    slots: timeSlots,
    relation: dateRelation,
    todayExhausted,
  } = useAvailableSlots({
    date: form.date,
    stylistId: form.stylist || null,
    durationMin: selectedService?.durationMin,
    openTime: site.shopOpensAt,
    closeTime: site.shopClosesAt,
  })
  const advanceAmount = Number(selectedService?.advanceAmount) || 0
  const advancePct = Number(selectedService?.advancePercentage) || 0
  const servicePrice =
    selectedService?.priceInr != null ? Number(selectedService.priceInr) : null
  const balance =
    servicePrice != null && advanceAmount > 0
      ? Math.max(servicePrice - advanceAmount, 0)
      : null
  const stylistName =
    stylists.find((s) => String(s.id) === String(form.stylist))?.name || null

  const trustPoints =
    advanceAmount > 0
      ? [
          'Your appointment is secured once the confirmation fee is received.',
          'The fee amount is shown in full above, before you continue.',
          'Your service, date, time and stylist stay visible throughout.',
          'No hidden charges — you pay only the amounts shown here.',
          'The remaining balance is payable per the studio’s policy.',
        ]
      : [
          'Your service, date, time and stylist are confirmed with you before anything is final.',
          'No payment is taken on this page.',
          'The studio contacts you directly to confirm every appointment.',
        ]

  // A previously-picked time can stop being valid after service, stylist or
  // date changes recompute availability (e.g. a longer service now overlaps
  // a confirmed appointment, or the clock moved past it). Rather than writing
  // that back into `form.time` via an effect, treat it as no longer selected
  // wherever it's read — display, validation and the submitted payload all use
  // this instead.
  const effectiveTime = timeSlots.some(
    (slot) => slot.value === form.time && slot.status === 'available',
  )
    ? form.time
    : ''

  // The chosen date is earlier than today (studio time). Nothing is bookable —
  // show a clean "date has passed" state instead of an empty grid.
  const dateHasPassed = readyForSlots && dateRelation === 'past'

  // For today's date, drop times that have already passed rather than showing
  // dead buttons. `booked` / `outside-hours` slots stay visible but disabled.
  const visibleSlots = timeSlots.filter((slot) => slot.status !== 'past')

  // Nothing left to pick: every remaining slot is booked or past closing (or,
  // on today, they've all passed). The field still renders — it shows a
  // polished empty state instead of a grid of uniformly disabled slots.
  const noSlotsAvailable =
    readyForSlots &&
    !dateHasPassed &&
    !visibleSlots.some((slot) => slot.status === 'available')

  // All of today's remaining hours are gone (vs. genuinely nothing free).
  const allTimesPassedToday = dateRelation === 'today' && todayExhausted

  const slotGroups = dayParts
    .map((part) => ({
      ...part,
      slots: visibleSlots.filter((slot) => slot.part === part.key),
    }))
    .filter((group) => group.slots.length > 0)

  // Move a scrolled-down visitor back to the top of the section when the view
  // changes (form → review → confirmation), so the new step is in view.
  useEffect(() => {
    if (status !== 'review' && status !== 'success') return
    sectionRef.current?.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'start',
    })
  }, [status])

  // Step 1: validate locally, then either show the trust/review step or —
  // for a guest — the sign-in gate (booking creation itself requires an
  // authenticated customer; browsing/selecting never has). No request yet
  // either way.
  const handleSubmit = (event) => {
    event.preventDefault()
    const errs = {}
    for (const key of Object.keys(REQUIRED_FIELDS)) {
      // `time` reads the availability-checked value — a stale selection that
      // recomputed availability has since invalidated must not pass.
      const value = key === 'time' ? effectiveTime : form[key]
      if (!String(value ?? '').trim()) {
        errs[key] = `${REQUIRED_FIELDS[key]} is required.`
      }
    }
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      setFormError('Please complete the highlighted fields to continue.')
      return
    }
    setFieldErrors({})
    setFormError(null)

    if (authStatus !== 'authed') {
      saveBookingDraft({ ...form, time: effectiveTime })
      setShowAuthGate(true)
      return
    }
    setStatus('review')
  }

  // Step 2: from the trust step, create the appointment (once — a retry
  // reuses `bookingRef` instead of creating a second one), then either finish
  // (no fee due) or collect the confirmation fee via Razorpay Checkout.
  const sendRequest = async () => {
    setStatus('submitting')
    setFormError(null)

    let booking = bookingRef
    if (!booking) {
      booking = await createBooking()
      if (!booking) return // createBooking already set the error state
    }

    // No confirmation fee for this service — the appointment created above
    // is the whole story; nothing to pay.
    if (!(Number(booking.advance_amount) > 0)) {
      setResult(booking)
      setStatus('success')
      return
    }

    await payForBooking(booking)
  }

  /** POST /appointments. Returns the created appointment, or null on a handled error. */
  const createBooking = async () => {
    // `selectedService` is re-derived from the live catalogue on every render
    // (`services.find(...)`). Under a fast gender/category/service change it
    // can momentarily fail to resolve even though `form.service` still holds
    // an id — sending then would POST null service_id/category_id and earn a
    // confusing 422. Bail out before building the payload and send the user
    // back to the form with the same highlighted-field pattern used for a
    // real 422, instead of letting a bad request reach the API.
    const serviceId = Number(selectedService?.id)
    const categoryId = Number(selectedService?.categoryId)
    if (!selectedService || !Number.isFinite(serviceId) || !Number.isFinite(categoryId)) {
      setFieldErrors((prev) => ({
        ...prev,
        service: 'Please reselect a service — this one is no longer available.',
      }))
      setFormError('Please check the highlighted fields and try again.')
      setStatus('error')
      return null
    }

    const payload = {
      customer_name: form.name.trim(),
      phone: form.phone.trim(),
      gender: genderForApi(form.gender),
      category_id: categoryId,
      service_id: serviceId,
      appointment_date: form.date,
      appointment_time: effectiveTime,
      // Required — a specific stylist must be chosen before this step is
      // reachable, so `stylist_id` is always part of the request.
      stylist_id: Number(form.stylist),
    }

    try {
      const data = await apiPost('/appointments', payload)
      setBookingRef(data)
      return data
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        // Map backend field names onto the form fields.
        const be = err.fieldErrors()
        setFieldErrors({
          name: be.customer_name,
          phone: be.phone,
          gender: be.gender,
          category: be.category_id,
          service: be.service_id,
          stylist: be.stylist_id,
          date: be.appointment_date,
          time: be.appointment_time,
        })
        setFormError('Please check the highlighted fields and try again.')
        // A field is wrong — return to the form so it can be corrected.
        setStatus('error')
      } else if (err instanceof ApiError && err.network) {
        setFormError(
          site.phone
            ? `We couldn’t reach the studio. Please try again, or call ${site.phone.display}.`
            : 'We couldn’t reach the studio. Please try again shortly.',
        )
        // Transient — stay on the review step so "Continue" can retry.
        setStatus('review')
      } else {
        setFormError(
          (err && err.message) ||
            'Something went wrong sending your request. Please try again.',
        )
        setStatus('review')
      }
      return null
    }
  }

  /**
   * Step 3: open Razorpay Standard Checkout for the server-computed
   * confirmation fee and verify the result server-side. Never trusts a
   * client-side amount — `order.amount` below is exactly what the backend
   * returned for this appointment. Every failure here (order creation,
   * cancelled/failed Checkout, signature rejected, a slot conflict surfaced
   * only at verification) lands back on the review step — `bookingRef` is
   * already set, so "Continue" retries payment for the same appointment
   * instead of creating another one.
   */
  const payForBooking = async (booking) => {
    let Razorpay
    let order
    try {
      ;[Razorpay, order] = await Promise.all([
        loadRazorpayCheckout(),
        apiPost(`/appointments/${booking.id}/payment/order`),
      ])
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? err.fieldErrors().appointment || err.message
          : err?.message || 'Could not start the payment. Please try again.',
      )
      setStatus('review')
      return
    }

    // Checkout takes over the page's interaction; drop back to the review
    // step (button re-enabled) while it's open so a dismissed/failed payment
    // leaves the customer somewhere they can retry from.
    setStatus('review')

    const checkout = new Razorpay({
      key: order.key,
      order_id: order.order_id,
      amount: order.amount,
      currency: order.currency,
      name: order.name,
      description: order.description,
      prefill: order.prefill,
      theme: { color: '#1a1a1a' },
      modal: {
        ondismiss: () => {
          setFormError('Payment was cancelled. You can try again when you’re ready.')
        },
      },
      handler: async (response) => {
        setStatus('submitting')
        setFormError(null)
        try {
          const confirmed = await apiPost(`/appointments/${booking.id}/payment/verify`, {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          })
          setResult(confirmed)
          setStatus('success')
        } catch (err) {
          setFormError(
            err instanceof ApiError
              ? err.fieldErrors().razorpay_signature ||
                  err.fieldErrors().razorpay_order_id ||
                  err.fieldErrors().appointment_time ||
                  err.fieldErrors().appointment ||
                  err.message
              : 'We couldn’t verify that payment. Please try again.',
          )
          setStatus('review')
        }
      },
    })
    checkout.on('payment.failed', () => {
      setFormError('Payment failed. Please try again.')
      setStatus('review')
    })
    checkout.open()
  }

  const resetToForm = () => {
    setStatus('idle')
    setResult(null)
    setFormError(null)
    setBookingRef(null)
  }

  const backToForm = () => {
    setStatus('idle')
    setFormError(null)
    setBookingRef(null)
  }

  const submitting = status === 'submitting'

  const reviewing = status === 'review' || status === 'submitting'

  return (
    <section
      ref={sectionRef}
      id="booking"
      className="scroll-mt-24 border-t border-line bg-surface"
    >
      <Container className="section-y">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <header className="lg:col-span-4">
            <p className="eyebrow">Booking</p>
            <h2 className="mt-4">
              {reviewing ? 'Review & confirm' : 'Book an appointment'}
            </h2>
            <p className="mt-4 text-ink-soft">
              {reviewing
                ? 'A quick look at what you are requesting before it goes to the studio.'
                : 'Tell us what you would like and when. The studio confirms every appointment before it is final.'}
            </p>
          </header>

          <div className="lg:col-span-8">
            {status === 'success' && result ? (
              <div className="border-t border-line pt-8">
                <h3 className="font-serif text-2xl text-ink">
                  {result.status === 'confirmed' ? 'Booking confirmed' : 'Request received'}
                </h3>
                <p className="mt-3 text-ink-soft">
                  Thank you, {result.customer_name || form.name || 'there'}. Your
                  reference is <span className="text-ink">{result.reference}</span>.{' '}
                  {result.status === 'confirmed' ? (
                    <>
                      Your
                      {result.service_name ? ` ${result.service_name}` : ' appointment'}
                      {result.stylist_name ? ` with ${result.stylist_name}` : ''}
                      {result.appointment_date ? ` on ${result.appointment_date}` : ''}
                      {result.appointment_time
                        ? ` at ${formatTime12h(result.appointment_time)}`
                        : ''}{' '}
                      is confirmed and the time is reserved for you.
                    </>
                  ) : (
                    <>
                      The studio will contact you
                      {result.phone ? ` on ${result.phone}` : ''} to confirm
                      {result.service_name ? ` your ${result.service_name}` : ' your appointment'}
                      {result.stylist_name ? ` with ${result.stylist_name}` : ''}
                      {result.appointment_date ? ` on ${result.appointment_date}` : ''}
                      {result.appointment_time
                        ? ` at ${formatTime12h(result.appointment_time)}`
                        : ''}
                      .
                    </>
                  )}
                </p>
                {result.advance_amount > 0 && (
                  <p className="mt-4 border-t border-line pt-4 text-sm text-ink-soft">
                    {result.payment_status === 'advance_paid' ? (
                      <>
                        A confirmation fee of{' '}
                        <span className="text-ink">{formatInr(result.advance_amount)}</span>{' '}
                        was received via Razorpay (Test Mode).{' '}
                        {result.remaining_amount > 0 && (
                          <>
                            The remaining balance of{' '}
                            <span className="text-ink">
                              {formatInr(result.remaining_amount)}
                            </span>{' '}
                            is payable per the studio&rsquo;s policy.
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        An advance of{' '}
                        <span className="text-ink">{formatInr(result.advance_amount)}</span>
                        {result.advance_percentage
                          ? ` (${result.advance_percentage}% of the service price)`
                          : ''}{' '}
                        will be collected by the studio to confirm the booking.
                      </>
                    )}
                  </p>
                )}
                <button
                  type="button"
                  onClick={resetToForm}
                  className="btn btn-outline mt-6"
                >
                  Make another request
                </button>
              </div>
            ) : reviewing ? (
              <div className="border-t border-line pt-8">
                <p className="eyebrow">
                  {advanceAmount > 0 ? 'Confirmation fee' : 'Confirm request'}
                </p>
                <h3 className="mt-3 font-serif text-2xl text-ink sm:text-3xl">
                  Confirmation Fee
                </h3>
                <p className="mt-4 max-w-prose text-ink-soft">
                  We value your time, and we want to make sure your appointment
                  is reserved especially for you. A small confirmation fee helps
                  us secure your selected time and stylist and ensures our team
                  is ready to welcome you as scheduled.
                </p>
                <p className="mt-4 max-w-prose text-ink-soft">
                  Thank you for choosing DK StyleHub and for helping us respect
                  the time of both our guests and our team.
                </p>

                <ul className="mt-7 border-t border-line text-sm">
                  {trustPoints.map((point) => (
                    <li
                      key={point}
                      className="flex items-start gap-3 border-b border-line py-3 text-ink-soft"
                    >
                      <Check
                        size={15}
                        aria-hidden="true"
                        className="mt-0.5 shrink-0 text-accent"
                      />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>

                <dl className="mt-8 border-t border-line">
                  <SummaryRow label="Service">
                    {selectedService?.name || '—'}
                  </SummaryRow>
                  <SummaryRow label="Stylist">
                    {stylistName || '—'}
                  </SummaryRow>
                  <SummaryRow label="Date &amp; time">
                    {form.date}
                    {form.date && effectiveTime ? ' · ' : ''}
                    {effectiveTime ? formatTime12h(effectiveTime) : ''}
                  </SummaryRow>
                  {servicePrice != null && (
                    <SummaryRow label="Total">{formatInr(servicePrice)}</SummaryRow>
                  )}
                  {advanceAmount > 0 && (
                    <SummaryRow label="Advance required">
                      {formatInr(advanceAmount)}
                      {advancePct ? (
                        <span className="text-muted"> · {advancePct}%</span>
                      ) : null}
                    </SummaryRow>
                  )}
                  {balance != null && (
                    <SummaryRow label="Balance">{formatInr(balance)}</SummaryRow>
                  )}
                </dl>

                <p className="mt-5 max-w-prose text-xs leading-relaxed text-muted">
                  {advanceAmount > 0
                    ? 'Continuing opens Razorpay’s secure checkout (Test Mode) to pay the confirmation fee shown above. The remaining balance is payable per the studio’s policy.'
                    : 'No payment is taken on this page — the studio confirms this appointment directly.'}
                </p>

                {formError && (
                  <p
                    role="alert"
                    className="mt-5 border-l-2 border-ink pl-4 text-sm text-ink"
                  >
                    {formError}
                  </p>
                )}

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={sendRequest}
                    className="btn"
                    disabled={submitting}
                  >
                    {submitting
                      ? 'Please wait…'
                      : advanceAmount > 0
                        ? 'Pay confirmation fee'
                        : 'Continue'}
                    {!submitting && <ArrowRight size={16} aria-hidden="true" />}
                  </button>
                  <button
                    type="button"
                    onClick={backToForm}
                    className="btn btn-outline"
                    disabled={submitting}
                  >
                    Back
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="border-t border-line pt-8" noValidate>
                {catalogueError && !catalogueLoading && (
                  <StatusLine className="mb-6">
                    We couldn’t load the service list. Please refresh the page,
                    or call the studio to book.
                  </StatusLine>
                )}

                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor={`${uid}-name`} className={LABEL}>
                      Name
                    </label>
                    <input
                      id={`${uid}-name`}
                      className={clsx(FIELD, fieldErrors.name && FIELD_ERROR)}
                      value={form.name}
                      onChange={update('name')}
                      autoComplete="name"
                      aria-invalid={Boolean(fieldErrors.name)}
                      required
                    />
                    {fieldErrors.name && (
                      <p className="mt-1.5 text-sm text-ink">{fieldErrors.name}</p>
                    )}
                  </div>

                  <div>
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
                      autoComplete="tel"
                      aria-invalid={Boolean(fieldErrors.phone)}
                      required
                    />
                    {fieldErrors.phone && (
                      <p className="mt-1.5 text-sm text-ink">{fieldErrors.phone}</p>
                    )}
                  </div>

                  <div>
                    <span id={`${uid}-gender-label`} className={LABEL}>
                      Gender
                    </span>
                    <div className="mt-2.5">
                      <OptionTiles
                        id={`${uid}-gender`}
                        labelledBy={`${uid}-gender-label`}
                        value={form.gender}
                        onChange={updateValue('gender')}
                        options={bookingGenders}
                        columns="grid-cols-2"
                        invalid={Boolean(fieldErrors.gender)}
                      />
                    </div>
                    {fieldErrors.gender && (
                      <p className="mt-1.5 text-sm text-ink">{fieldErrors.gender}</p>
                    )}
                  </div>

                  <div>
                    <span id={`${uid}-category-label`} className={LABEL}>
                      Category
                    </span>
                    <div className="mt-2.5">
                      {catalogueLoading ? (
                        <p className="text-sm text-muted">Loading…</p>
                      ) : categoryOptions.length === 0 ? (
                        <p className="text-sm text-muted">Unavailable</p>
                      ) : (
                        <OptionTiles
                          id={`${uid}-category`}
                          labelledBy={`${uid}-category-label`}
                          value={form.category}
                          onChange={updateValue('category')}
                          options={categoryListOptions}
                          invalid={Boolean(fieldErrors.category)}
                        />
                      )}
                    </div>
                    {fieldErrors.category && (
                      <p className="mt-1.5 text-sm text-ink">{fieldErrors.category}</p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <span id={`${uid}-service-label`} className={LABEL}>
                      Service
                    </span>
                    <div className="mt-2.5">
                      {!form.gender || !form.category ? (
                        <p className="text-sm text-muted">Choose gender and category first</p>
                      ) : services.length === 0 ? (
                        <p className="text-sm text-muted">
                          No services listed for this combination yet.
                        </p>
                      ) : (
                        <ServiceOptionList
                          id={`${uid}-service`}
                          labelledBy={`${uid}-service-label`}
                          value={form.service}
                          onChange={updateValue('service')}
                          services={services}
                          formatPrice={formatInr}
                          invalid={Boolean(fieldErrors.service)}
                        />
                      )}
                    </div>
                    {fieldErrors.service && (
                      <p className="mt-1.5 text-sm text-ink">{fieldErrors.service}</p>
                    )}
                  </div>

                  {/* Stylist — required. Lists the live roster from
                      GET /api/stylists; the customer must pick a specific
                      stylist before continuing, and `stylist_id` is always
                      sent on submit. */}
                  <div className="sm:col-span-2">
                    <label
                      id={`${uid}-stylist-label`}
                      htmlFor={`${uid}-stylist`}
                      className={LABEL}
                    >
                      Select stylist
                    </label>
                    <div className="mt-2.5">
  {stylistsLoading ? (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      <div className="min-h-16 rounded-lg border border-line-strong bg-paper" />
      <div className="min-h-16 rounded-lg border border-line-strong bg-paper" />
    </div>
  ) : stylists.length > 0 ? (
    <OptionTiles
      id={`${uid}-stylist`}
      labelledBy={`${uid}-stylist-label`}
      value={form.stylist}
      onChange={updateValue('stylist')}
      options={stylists.map((stylist) => ({
        value: stylist.id,
        label: stylist.name,
      }))}
      invalid={Boolean(fieldErrors.stylist)}
      columns="grid-cols-2 sm:grid-cols-3"
    />
  ) : null}
</div>

                    {noRoster && (
                      <p
                        id={`${uid}-stylist-note`}
                        className="mt-2 text-sm text-muted"
                      >
                        Our team roster is being finalised — please call the
                        studio to book with a specific stylist.
                      </p>
                    )}
                    {fieldErrors.stylist && (
                      <p className="mt-1.5 text-sm text-ink">{fieldErrors.stylist}</p>
                    )}
                  </div>

                  {/* `min-w-0`: without it, this grid item's automatic
                      minimum width defaults to DateRail's full unscrolled
                      content (dozens of date cards) instead of the available
                      column width, blowing the whole form out sideways —
                      `overflow-x-auto` inside DateRail can't clip content its
                      own container refuses to shrink for. */}
                  <div className="min-w-0">
                    <span id={`${uid}-date-label`} className={LABEL}>
                      Preferred date
                    </span>
                    <div className="mt-2.5">
                      <DateRail
                        id={`${uid}-date`}
                        labelledBy={`${uid}-date-label`}
                        value={form.date}
                        onChange={updateValue('date')}
                        minDateIso={todayIso()}
                        maxDateIso={maxDateIso()}
                        invalid={Boolean(fieldErrors.date)}
                      />
                    </div>
                    {fieldErrors.date && (
                      <p className="mt-1.5 text-sm text-ink">{fieldErrors.date}</p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <span className={LABEL} id={`${uid}-time-label`}>
                      Preferred time
                    </span>
                    <div className="mt-2.5">
                      {!readyForSlots && (
                        <p className="text-sm text-muted">
                          Select a service and date to see available times.
                        </p>
                      )}

                      {dateHasPassed && (
                        <div className="rounded-sm border border-line bg-surface px-4 py-6 text-center">
                          <p className="text-sm text-ink">That date has already passed</p>
                          <p className="mt-1 text-sm text-muted">
                            Choose today or a later date to see available times.
                          </p>
                        </div>
                      )}

                      {noSlotsAvailable && (
                        <div className="rounded-sm border border-line bg-surface px-4 py-6 text-center">
                          <p className="text-sm text-ink">
                            {allTimesPassedToday
                              ? 'Today’s remaining times have all passed'
                              : 'No available times'}
                          </p>
                          <p className="mt-1 text-sm text-muted">
                            {allTimesPassedToday
                              ? 'Try tomorrow or a later date.'
                              : `Try another date${form.stylist ? ' or stylist' : ''}.`}
                          </p>
                        </div>
                      )}

                      {readyForSlots && !dateHasPassed && !noSlotsAvailable && (
                        <div
                          role="group"
                          aria-labelledby={`${uid}-time-label`}
                          className="max-w-md space-y-4"
                        >
                          {slotGroups.map((group) => (
                            <div key={group.key}>
                              <p className="text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-muted">
                                {group.label}
                              </p>
                              <div className="mt-2 grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(6.5rem,1fr))]">
                                {group.slots.map((slot) => {
                                  const selected = effectiveTime === slot.value
                                  const disabled = slot.status !== 'available'
                                  const rangeLabel = slot.end
                                    ? formatTimeRange12h(slot.value, slot.end)
                                    : slot.label
                                  // The slot's own window length — the
                                  // currently selected service's duration for
                                  // an available slot, or the real duration
                                  // of whatever's already booked there. Never
                                  // a hardcoded number.
                                  const slotMinutes = slot.end
                                    ? toMinutes(slot.end) - toMinutes(slot.value)
                                    : null
                                  const ariaLabel =
                                    slot.status === 'booked'
                                      ? `${rangeLabel} — already booked`
                                      : slot.status === 'outside-hours'
                                        ? `${rangeLabel} — not enough time before closing`
                                        : rangeLabel
                                  return (
                                    <button
                                      key={slot.value}
                                      type="button"
                                      onClick={() => chooseTime(slot.value)}
                                      disabled={disabled}
                                      aria-pressed={selected}
                                      aria-label={ariaLabel}
                                      className={clsx(
                                        // Keyboard focus ring comes from the global :focus-visible
                                        // rule in index.css — no per-element outline utilities.
                                        'flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-sm border px-1.5 py-2 text-center text-[0.8125rem] leading-tight tabular-nums transition-colors',
                                        selected &&
                                          'border-ink bg-ink font-medium text-paper',
                                        !selected &&
                                          slot.status === 'available' &&
                                          'cursor-pointer border-line-strong bg-surface text-ink hover:border-ink hover:bg-surface-sunken',
                                        slot.status === 'booked' &&
                                          'cursor-not-allowed border-transparent bg-surface-sunken text-muted line-through decoration-1',
                                        slot.status === 'outside-hours' &&
                                          'cursor-not-allowed border-transparent bg-surface-sunken text-muted',
                                      )}
                                    >
                                      <span>{rangeLabel}</span>
                                      {slotMinutes != null && (
                                        <span
                                          className={clsx(
                                            'text-[0.625rem] font-normal',
                                            selected ? 'text-paper/70' : 'text-muted',
                                          )}
                                        >
                                          {slotMinutes}mins
                                        </span>
                                      )}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          ))}

                          {(visibleSlots.some((s) => s.status === 'booked') ||
                            visibleSlots.some((s) => s.status === 'outside-hours')) && (
                            <p className="pt-1 text-xs leading-relaxed text-muted">
                              {visibleSlots.some((s) => s.status === 'booked') && (
                                <>
                                  <span className="text-ink-soft line-through decoration-1">
                                    Struck-through
                                  </span>{' '}
                                  times are already booked
                                  {form.stylist ? ' for this stylist' : ''}.{' '}
                                </>
                              )}
                              {visibleSlots.some((s) => s.status === 'outside-hours') &&
                                'Greyed times don’t leave enough time before closing for this service.'}
                            </p>
                          )}
                        </div>
                      )}

                      {fieldErrors.time && (
                        <p className="mt-1.5 text-sm text-ink">{fieldErrors.time}</p>
                      )}
                    </div>
                  </div>
                </div>

                {advanceAmount > 0 && (
                  <p className="mt-6 border-t border-line pt-4 text-sm">
                    <span className="text-ink-soft">
                      Advance to confirm (set by the studio):{' '}
                    </span>
                    <span className="text-ink">{formatInr(advanceAmount)}</span>
                    {advancePct ? (
                      <span className="text-muted"> — {advancePct}% of the service price</span>
                    ) : null}
                    <span className="text-muted">
                      {' '}
                      · no payment is taken on this page.
                    </span>
                  </p>
                )}

                {formError && (
                  <p
                    role="alert"
                    className="mt-6 border-l-2 border-ink pl-4 text-sm text-ink"
                  >
                    {formError}
                  </p>
                )}

                <button type="submit" className="btn mt-8" disabled={submitting}>
                  {submitting ? 'Sending…' : 'Request appointment'}
                </button>
              </form>
            )}
          </div>
        </div>
      </Container>

      {showAuthGate && <BookingAuthGate onClose={() => setShowAuthGate(false)} />}
    </section>
  )
}
