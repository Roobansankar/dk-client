import { useEffect, useMemo, useState } from 'react'
import { apiGet } from '../lib/api'
import { formatTime12h, studioDateRelation, studioNow } from '../lib/time'
import { dayPart } from '../data/bookingTimes'

/**
 * How often the slot list is re-fetched while the picker is open, so a time
 * that has just passed (or was just booked by someone else) drops out without
 * the visitor doing anything. Anything that slips through is still refused by
 * the server when the booking is submitted.
 */
const REFRESH_MS = 60_000

/**
 * The booking form's "Preferred time" options, straight from the server
 * (`GET /api/booking/slots`) — the same rules the appointment endpoint
 * enforces, so every time shown here is one the API will accept:
 *
 *   - the professional offers the service and is working then (the hours an
 *     admin set for them on that calendar date, within the studio's opening
 *     hours — a date nobody set is not available);
 *   - it's not in the past and doesn't clash with one of their confirmed
 *     appointments (plus the buffer between sessions).
 *
 * With `stylistId` the list is that professional's own free time; with
 * `stylistId = null` ("any professional") it combines everyone who offers the
 * service. A chosen professional's existing bookings also come back as
 * `status: 'booked'` so the picker can show why there is a gap.
 *
 * Returns the slots shaped for the picker (`value`, `end`, `label`, `part`,
 * `status`), plus:
 *   working         — someone is working on that date at all (false → a day off)
 *   todayExhausted  — it's today and what's left of the day can't fit the service
 *   relation        — 'past' | 'today' | 'future' | null, for the date itself
 *   loading / error — request state
 *
 * @param {{ date: string, stylistId: string|number|null, serviceId: string|number|null, enabled?: boolean }} params
 */
export function useBookingSlots({ date, stylistId, serviceId, enabled = true }) {
  const ready = Boolean(enabled && date && serviceId)
  const key = ready ? `${serviceId}|${stylistId ?? ''}|${date}` : null

  const [state, setState] = useState({ key: null, data: null, error: null })
  // Bumped on a timer to re-fetch; only ever read as an effect dependency.
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!ready) return undefined
    const id = setInterval(() => setTick((n) => n + 1), REFRESH_MS)
    return () => clearInterval(id)
  }, [ready])

  useEffect(() => {
    if (!key) return undefined

    const ctrl = new AbortController()
    const params = new URLSearchParams({ service_id: String(serviceId), date })
    if (stylistId) params.set('stylist_id', String(stylistId))

    apiGet(`/booking/slots?${params}`, { signal: ctrl.signal })
      .then((data) => setState({ key, data, error: null }))
      .catch((error) => {
        if (error.name === 'AbortError') return
        setState({ key, data: null, error })
      })

    return () => ctrl.abort()
    // `key` already encodes serviceId / stylistId / date.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick])

  return useMemo(() => {
    const relation = date ? studioDateRelation(date, studioNow()) : null
    // Only trust a response that belongs to the current selection.
    const current = state.key === key ? state : { data: null, error: null }
    const data = current.data

    const slots = (data?.slots ?? []).map((slot) => ({
      value: slot.start,
      end: slot.end,
      label: formatTime12h(slot.start),
      part: dayPart(slot.start),
      status: slot.status,
    }))

    return {
      slots,
      relation,
      working: data ? data.working : null,
      todayExhausted: Boolean(data?.today_exhausted),
      loading: ready && !current.data && !current.error,
      error: current.error,
    }
  }, [state, key, date, ready])
}
