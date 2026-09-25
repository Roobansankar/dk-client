import { toMinutes } from '../lib/time'

/**
 * Constants for the booking form's date and time pickers.
 *
 * Which times are actually bookable is decided on the server, per professional
 * (the hours set for them on that date, the service length, existing bookings and the studio's
 * opening hours) — see `hooks/useBookingSlots.js`. Nothing about opening
 * hours, breaks or buffers is duplicated here any more.
 */

/**
 * How many days ahead the "Preferred date" rail lets a visitor pick, counting
 * today as day 1. There is no admin-configurable booking window today, so
 * this is a fixed, deliberately generous default — long enough for genuine
 * planning-ahead bookings, short enough that the rail never offers a date the
 * studio couldn't sensibly plan for.
 */
export const maxBookingWindowDays = 60

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
