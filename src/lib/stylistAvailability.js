import { parseDateIso } from './time'

/**
 * A professional's effective hours on one calendar date, from the pieces the
 * API returns on a stylist row (`date_hours`, `date_closures`, `weekly_hours`
 * — see StylistResource / the admin setup payload). Mirrors
 * backend/app/Support/BookingAvailability::windows()'s precedence exactly —
 * keep the two in step by hand if either changes:
 *   0. a studio-wide holiday on that date (studioHolidays) — the whole studio
 *      is closed, so no hours whatever anyone's own hours say;
 *   1. a specific override for that date (date_hours[iso]) — if it exists it
 *      is the whole answer, custom hours or (once cleared) simply absent;
 *   2. otherwise, an explicit day off for that date (date_closures) — none;
 *   3. otherwise, the standing weekly schedule for that weekday
 *      (weekly_hours[Sun=0…Sat=6]), which may itself be empty.
 *
 * @param {{date_hours?: Record<string, {start:string,end:string}[]>, date_closures?: string[], weekly_hours?: Record<string, {start:string,end:string}[]>}} row
 * @param {string} iso  "YYYY-MM-DD"
 * @param {(string | {date:string})[]} studioHolidays  studio-wide closed dates (or {date,name} rows)
 * @returns {{start:string,end:string}[]}
 */
export function stylistHoursOn(row, iso, studioHolidays = []) {
  if (isStudioHoliday(iso, studioHolidays)) return []

  const specific = row?.date_hours?.[iso]
  if (specific?.length > 0) return specific

  if (row?.date_closures?.includes(iso)) return []

  const weekday = parseDateIso(iso).getDay()
  return row?.weekly_hours?.[String(weekday)] ?? []
}

/** Whether a calendar date is a studio-wide holiday (whole studio closed). */
export function isStudioHoliday(iso, studioHolidays = []) {
  return studioHolidays.some((h) => (typeof h === 'string' ? h : h?.date) === iso)
}

/** The holiday name for a date, if it is a studio-wide holiday. */
export function studioHolidayName(iso, studioHolidays = []) {
  const found = studioHolidays.find((h) => (typeof h === 'string' ? h : h?.date) === iso)
  return typeof found === 'object' ? (found?.name ?? null) : null
}

/** Whether a professional has any bookable hours at all on this date. */
export function isStylistOpenOn(row, iso, studioHolidays = []) {
  return stylistHoursOn(row, iso, studioHolidays).length > 0
}
