/**
 * Wall-clock time arithmetic for the booking form's "Preferred time" picker.
 *
 * Every value that crosses the API boundary — `form.time`, the payload's
 * `appointment_time`, a busy window's `start`/`end` — stays a 24-hour "H:i"
 * string, exactly like the backend (`App\Support\AppointmentSlots`). This
 * module only ever converts to 12-hour for on-screen display; nothing here
 * changes what gets submitted.
 *
 * The overlap check mirrors `AppointmentSlots::overlaps()` exactly: a
 * half-open interval, so an appointment ending at 11:00 does not conflict
 * with one starting at 11:00.
 */

/** "H:i" -> minutes since midnight. */
export function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** minutes since midnight -> "H:i", zero-padded. */
export function fromMinutes(totalMinutes) {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** "H:i" + N minutes -> "H:i". */
export function addMinutes(hhmm, minutes) {
  return fromMinutes(toMinutes(hhmm) + minutes)
}

/** "14:00" -> "2:00 PM", "00:30" -> "12:30 AM", "12:00" -> "12:00 PM". */
export function formatTime12h(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  const period = h < 12 ? 'AM' : 'PM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}

/**
 * "17:30" + "18:10" -> "5:30 - 6:10 PM" (the shared AM/PM is dropped from the
 * start time); "11:50" + "12:30" -> "11:50 AM - 12:30 PM" (shown on both
 * sides once the period actually changes across the range).
 */
export function formatTimeRange12h(startHHMM, endHHMM) {
  const startLabel = formatTime12h(startHHMM)
  const endLabel = formatTime12h(endHHMM)
  const [startPeriod] = startLabel.split(' ').slice(-1)
  const [endPeriod] = endLabel.split(' ').slice(-1)
  const start = startPeriod === endPeriod ? startLabel.replace(` ${startPeriod}`, '') : startLabel
  return `${start} - ${endLabel}`
}

/** Half-open interval overlap: [aStart, aEnd) ∩ [bStart, bEnd) ≠ ∅. */
export function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return toMinutes(aStart) < toMinutes(bEnd) && toMinutes(bStart) < toMinutes(aEnd)
}

/**
 * The studio's wall-clock timezone.
 *
 * There is no timezone setting in the backend — `config/app.php` runs in UTC
 * and `appointment_time` is stored as a zone-less "H:i" string. DK StyleHub is
 * an India studio (contact details: +91 number, INR pricing, Chennai address),
 * so "is this slot in the past?" for *today* must be judged against India time
 * — not the visitor's device clock, and not UTC (which is 5.5h behind and would
 * wrongly keep afternoon slots open all evening).
 */
export const STUDIO_TIME_ZONE = 'Asia/Kolkata'

/**
 * The current date and time-of-day in the studio's timezone, regardless of
 * where the visitor's device is set. Returns `{ dateIso, minutes }` where
 * `dateIso` is "YYYY-MM-DD" and `minutes` is minutes since studio-local
 * midnight — directly comparable to `toMinutes(slotStart)`.
 */
export function studioNow(base = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: STUDIO_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(base)
  const part = (type) => parts.find((p) => p.type === type)?.value ?? '00'
  let hour = Number(part('hour'))
  if (hour === 24) hour = 0 // some engines render midnight as "24"
  return {
    dateIso: `${part('year')}-${part('month')}-${part('day')}`,
    minutes: hour * 60 + Number(part('minute')),
  }
}

/**
 * How a chosen "YYYY-MM-DD" relates to today in the studio's timezone:
 * 'past' (before today — nothing bookable), 'today' (past-time filtering
 * applies), or 'future' (clock time is irrelevant). `null` when no date.
 */
export function studioDateRelation(dateIso, now = studioNow()) {
  if (!dateIso) return null
  if (dateIso < now.dateIso) return 'past'
  if (dateIso === now.dateIso) return 'today'
  return 'future'
}

/**
 * "YYYY-MM-DD" <-> a local calendar Date, for pure date arithmetic (adding
 * days, generating a range). Deliberately NOT used for anything involving a
 * time-of-day — this is calendar-day math only, so it's exact regardless of
 * the visitor's device timezone: a "Y-M-D" triple in means the same triple
 * out, never shifted by an hour/DST boundary the way `new Date(isoString)`
 * (UTC-parsed) can be.
 */
export function parseDateIso(dateIso) {
  const [y, m, d] = dateIso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** The inverse of `parseDateIso` — a local calendar Date -> "YYYY-MM-DD". */
export function toDateIso(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** "YYYY-MM-DD" + N calendar days -> "YYYY-MM-DD" (N may be negative). */
export function addDaysIso(dateIso, days) {
  const date = parseDateIso(dateIso)
  date.setDate(date.getDate() + days)
  return toDateIso(date)
}
