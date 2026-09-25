import { formatTime12h } from './time'

/**
 * Weekly working hours, as the API sends them: a list of seven days (index =
 * weekday, 0 = Sunday … 6 = Saturday), each a list of `{ start, end }` ranges
 * in "H:i". A day with no ranges is a day off.
 */

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const DAY_NAMES_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

/** The week as people read it: Monday first, Sunday last. */
export const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

/** "10:00" + "13:00" → "10:00 AM – 1:00 PM". */
export const formatRange = (range) =>
  `${formatTime12h(range.start)} – ${formatTime12h(range.end)}`

/** Does this weekly schedule have any working time at all? */
export const hasAnyHours = (week) => (week ?? []).some((day) => day?.length > 0)

/**
 * Group consecutive days that share the same hours, in reading order:
 * `[{ label: 'Mon–Sat', off: false, text: '10:00 AM – 1:00 PM, 2:00 PM – 7:30 PM' },
 *   { label: 'Sun', off: true, text: 'Off' }]`.
 */
export function describeWeek(week) {
  const rangesOf = (day) => week?.[day] ?? []
  const groups = []

  for (const day of DISPLAY_ORDER) {
    const key = JSON.stringify(rangesOf(day))
    const last = groups[groups.length - 1]

    if (last && last.key === key) last.days.push(day)
    else groups.push({ key, days: [day] })
  }

  return groups.map(({ days }) => {
    const ranges = rangesOf(days[0])
    const first = DAY_NAMES[days[0]]
    const lastName = DAY_NAMES[days[days.length - 1]]

    return {
      label: days.length === 1 ? first : `${first}–${lastName}`,
      off: ranges.length === 0,
      text: ranges.length === 0 ? 'Off' : ranges.map(formatRange).join(', '),
    }
  })
}
