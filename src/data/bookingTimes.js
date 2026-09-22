import { toMinutes } from '../lib/time'

/**
 * Studio-wide scheduling constants for the booking form's "Preferred time"
 * picker.
 *
 * The picker no longer offers a fixed 30-minute grid — slot start times step
 * by the SELECTED SERVICE's own duration (see `useAvailableSlots.js`), so a
 * 40-minute service is offered at 5:40, 6:20, 7:00… while a 90-minute one is
 * offered at 10:00, 11:30, 1:00…
 *
 * The first and last bookable times still come from the studio's saved
 * opening hours (`shop_opens_at` / `shop_closes_at`, edited in the admin
 * Settings → Shop Hours section and read through `useSite()`) — these
 * constants are only the fallback used whenever the saved hours are missing
 * or unusable.
 */

export const defaultOpeningTime = '10:00'
export const defaultClosingTime = '19:30'

/**
 * How many days ahead the "Preferred date" rail lets a visitor pick, counting
 * today as day 1. There is no admin-configurable booking window today, so
 * this is a fixed, deliberately generous default — long enough for genuine
 * planning-ahead bookings, short enough that the rail never offers a date the
 * studio couldn't sensibly plan for.
 */
export const maxBookingWindowDays = 60

/** Minutes required between one session's end and the next one's start, for
 *  the SAME stylist. Mirrors the backend's `AppointmentSlots::ONLINE_BUFFER_MINUTES`
 *  — see StoreAppointmentRequest / PaymentController::verify. */
export const bufferMinutes = 10

/**
 * The studio's fixed breaks — a slot may not start inside one, or run through
 * it. Mirrors the backend's `AppointmentSlots::STUDIO_BREAKS`.
 */
export const studioBreaks = [['13:00', '14:00']]

/**
 * Granularity the earliest bookable moment of "today" rounds UP to — the
 * single authoritative copy of this rule on the frontend (see
 * `nextBookableMinute` below). Mirrors the backend's
 * `AppointmentSlots::SLOT_ROUNDING_MINUTES`; the two must be kept in step by
 * convention, since a literal can't be shared across PHP and JS. The backend
 * re-derives and enforces this independently on submit — this copy only
 * ever affects what the picker *offers*, never what's actually accepted.
 */
export const slotRoundingMinutes = 10

/**
 * The earliest bookable minute-of-day strictly after `nowMinutes` — rounded
 * UP to the next `slotRoundingMinutes` boundary, and always later than
 * `nowMinutes` itself (never equal): 10:00 (600) -> 10:10 (610), 10:01 (601)
 * -> 10:10 (610), 10:09 (609) -> 10:10 (610), 10:10 (610) -> 10:20 (620),
 * 10:40 (640) -> 10:50 (650). Matches `AppointmentSlots::earliestBookableTime`
 * exactly — this is the ONE place either "now" itself gets rounded.
 */
export function nextBookableMinute(nowMinutes) {
  return (
    Math.floor(nowMinutes / slotRoundingMinutes) * slotRoundingMinutes + slotRoundingMinutes
  )
}

const isHHMM = (v) => typeof v === 'string' && /^\d{2}:\d{2}$/.test(v)

/**
 * The studio's opening and closing time for the day, falling back to the
 * studio defaults whenever the supplied values are missing or malformed, or
 * don't leave room for even a single minute of business — the picker always
 * has a well-formed window to work from, and any stale edge is re-checked
 * server-side on submit.
 *
 * @param {string|null|undefined} open   "H:i" opening time
 * @param {string|null|undefined} close  "H:i" closing time
 * @returns {{ openingTime: string, closingTime: string }}
 */
export function resolveShopHours(open, close) {
  let opening = isHHMM(open) ? open : defaultOpeningTime
  let closing = isHHMM(close) ? close : defaultClosingTime

  if (toMinutes(closing) - toMinutes(opening) < 1) {
    opening = defaultOpeningTime
    closing = defaultClosingTime
  }

  return { openingTime: opening, closingTime: closing }
}

/**
 * Which part of the day a "H:i" start belongs to, for the grouped picker.
 * Boundaries are the conventional ones (noon, 5 PM) — not business rules.
 */
export function dayPart(hhmm) {
  const min = toMinutes(hhmm)
  if (min < 12 * 60) return 'morning'
  if (min < 17 * 60) return 'afternoon'
  return 'evening'
}

export const dayParts = [
  { key: 'morning', label: 'Morning' },
  { key: 'afternoon', label: 'Afternoon' },
  { key: 'evening', label: 'Evening' },
]
