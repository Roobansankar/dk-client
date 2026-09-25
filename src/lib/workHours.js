import { formatTime12h } from './time'

/**
 * Working hours are set per calendar date: `{ "2026-10-06": [{ start, end }, …] }`
 * with times in "H:i". A date that isn't listed is a date the professional
 * isn't available — nothing is open by default.
 */

/** "10:00" + "13:00" → "10:00 AM – 1:00 PM". */
export const formatRange = (range) =>
  `${formatTime12h(range.start)} – ${formatTime12h(range.end)}`
