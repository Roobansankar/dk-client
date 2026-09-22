import { useEffect, useMemo, useState } from 'react'
import { apiGet } from '../lib/api'
import { formatTime12h, fromMinutes, studioDateRelation, studioNow, toMinutes } from '../lib/time'
import { bufferMinutes, dayPart, nextBookableMinute, resolveShopHours, studioBreaks } from '../data/bookingTimes'

/**
 * How often "now" is re-sampled while this hook is mounted, purely so a
 * visitor who leaves the form open past a rounding boundary (e.g. it turns
 * 10:40 while they're still deciding) sees the slot list correct itself
 * without touching anything. Deliberately coarse — correctness at the moment
 * of choosing matters more than a live-ticking clock, and any slot that
 * slips past this window is still caught authoritatively on submit
 * (StoreAppointmentRequest re-derives the same floor server-side).
 */
const NOW_REFRESH_MS = 20_000

/**
 * Clips each [start, end) block to [dayStart, dayEnd), drops any that
 * collapse to nothing, then sorts and merges overlapping/touching blocks —
 * so the free-time computation below never has to reason about overlaps.
 */
function mergeBlocks(blocks, dayStart, dayEnd) {
  const clipped = blocks
    .map(([start, end]) => [Math.max(start, dayStart), Math.min(end, dayEnd)])
    .filter(([start, end]) => start < end)
    .sort((a, b) => a[0] - b[0])

  const merged = []
  for (const block of clipped) {
    const last = merged[merged.length - 1]
    if (last && block[0] <= last[1]) {
      last[1] = Math.max(last[1], block[1])
    } else {
      merged.push(block)
    }
  }
  return merged
}

/** The gaps left in [dayStart, dayEnd) once every merged block is removed. */
function freeIntervals(dayStart, dayEnd, mergedBlocks) {
  const free = []
  let cursor = dayStart
  for (const [start, end] of mergedBlocks) {
    if (cursor < start) free.push([cursor, start])
    cursor = Math.max(cursor, end)
  }
  if (cursor < dayEnd) free.push([cursor, dayEnd])
  return free
}

/**
 * The booking form's "Preferred time" options: dynamically generated start
 * times, each stepping by the SELECTED SERVICE's own duration (not a fixed
 * interval) —
 *
 *   available — bookable now
 *   booked    — an existing CONFIRMED appointment for the chosen stylist,
 *               shown at its own actual start time (not forced onto the
 *               newly selected service's cadence) so the picker still shows
 *               the studio is busy there, greyed out and non-selectable
 *
 * The day (from the first possible start through closing) is first reduced
 * to its free stretches by carving out the studio's fixed break and every
 * CONFIRMED appointment's window — padded by `bufferMinutes` on both sides,
 * the same buffer the backend enforces (see
 * App\Support\AppointmentSlots::ONLINE_BUFFER_MINUTES). Each free stretch is
 * then independently packed with back-to-back `duration`-length slots
 * starting at ITS OWN start — so a booking's cleared buffer, or the break's
 * end, is never wasted waiting for some fixed day-wide cadence to catch up
 * (e.g. a 5:30–6:10 booking's buffer clears at 6:20, and 6:20 is exactly
 * where the next available slot starts, regardless of what time the day's
 * cadence "would have" been on). A slot whose start has already passed,
 * whose full duration would run past closing, or that starts inside/crosses
 * the break is therefore never generated at all — it's simply absent.
 *
 * The very first possible start is:
 *   - today:  "now" (studio time), rounded up to the next 10 minutes —
 *             clamped to opening if that's later.
 *   - future: the studio's opening time.
 *
 * Also returns `relation` ('past' | 'today' | 'future' | null) and
 * `todayExhausted` (true when it's today and the current time already
 * leaves no room for even the first possible slot — e.g. the studio has
 * closed, or a short remainder of the day can't fit the service) so the form
 * can distinguish "today has nothing left" from "no available times" in
 * general, without re-deriving it from the slot list.
 *
 * "Any available stylist" (no `stylistId`) is never range-checked against a
 * calendar, matching AppointmentSlots' own rule for unassigned bookings.
 *
 * `openTime` / `closeTime` are the studio's saved opening hours ("H:i", from
 * `useSite()`); when absent or unusable the picker falls back to the studio
 * defaults in `bookingTimes.js`.
 *
 * Recalculates whenever `date`, `stylistId`, `durationMin` or the hours
 * change — AND on a coarse timer (see `NOW_REFRESH_MS`) purely so "now"
 * itself never goes stale while the form sits open across a rounding
 * boundary. Any edge this still misses is caught authoritatively on submit
 * (StoreAppointmentRequest re-derives the identical floor server-side) —
 * this is a display correctness guarantee, not the source of truth.
 */
export function useAvailableSlots({ date, stylistId, durationMin, openTime, closeTime }) {
  const [busy, setBusy] = useState([])
  // Bumped every NOW_REFRESH_MS purely to force the memo below to re-sample
  // `studioNow()` — never read for its own value.
  const [nowTick, setNowTick] = useState(0)

  useEffect(() => {
    if (!date || !stylistId) return

    const ctrl = new AbortController()

    apiGet(
      `/appointments/busy?stylist_id=${encodeURIComponent(stylistId)}&date=${encodeURIComponent(date)}`,
      { signal: ctrl.signal },
    )
      .then((rows) => setBusy(Array.isArray(rows) ? rows : []))
      .catch((err) => {
        if (err.name === 'AbortError') return
        // Can't confirm availability — fail open with no known conflicts
        // rather than blocking every slot on a transient network error.
        setBusy([])
      })

    return () => ctrl.abort()
  }, [date, stylistId])

  useEffect(() => {
    const id = setInterval(() => setNowTick((n) => n + 1), NOW_REFRESH_MS)
    return () => clearInterval(id)
  }, [])

  return useMemo(() => {
    const { openingTime, closingTime } = resolveShopHours(openTime, closeTime)
    const now = studioNow()
    const relation = studioDateRelation(date, now)

    // "Any available stylist" is never range-checked (matches AppointmentSlots),
    // so ignore whatever `busy` still holds from a previously chosen stylist.
    const effectiveBusy = (date && stylistId ? busy : []).filter((w) => w.start && w.end)

    // A duration we can do slot arithmetic with: finite and positive. Anything
    // else leaves us unable to generate a cadence at all, so no slot is
    // offered (we never guess a fallback length).
    const duration = Number(durationMin)
    const durationUsable = Number.isFinite(duration) && duration > 0

    if (relation === 'past' || !durationUsable || relation === null) {
      return { slots: [], relation, todayExhausted: false }
    }

    const openMin = toMinutes(openingTime)
    const closeMin = toMinutes(closingTime)
    const firstPossible =
      relation === 'today' ? Math.max(openMin, nextBookableMinute(now.minutes)) : openMin

    // It's today, and even the earliest possible start can't fit the full
    // service before closing — nothing left to offer for the rest of today.
    const todayExhausted = relation === 'today' && firstPossible + duration > closeMin

    const blocked = mergeBlocks(
      [
        ...studioBreaks.map(([start, end]) => [toMinutes(start), toMinutes(end)]),
        ...effectiveBusy.map((w) => [
          toMinutes(w.start) - bufferMinutes,
          toMinutes(w.end) + bufferMinutes,
        ]),
      ],
      firstPossible,
      closeMin,
    )

    const slots = []
    for (const [freeStart, freeEnd] of freeIntervals(firstPossible, closeMin, blocked)) {
      for (let t = freeStart; t + duration <= freeEnd; t += duration) {
        const start = fromMinutes(t)
        // `end` is the selected service's own duration applied to this
        // slot's start — exactly what booking here would produce. Never a
        // hardcoded length: it's the same `duration` this whole cadence is
        // already built from.
        slots.push({
          value: start,
          end: fromMinutes(t + duration),
          label: formatTime12h(start),
          part: dayPart(start),
          status: 'available',
        })
      }
    }

    // Existing bookings stay visible (greyed, non-selectable) at their own
    // actual time, rather than being silently hidden — so the picker still
    // shows why a gap exists. Only ones that overlap the bookable window at
    // all are worth showing (an already-finished one earlier today is not).
    for (const w of effectiveBusy) {
      const wStart = toMinutes(w.start)
      const wEnd = toMinutes(w.end)
      if (wEnd <= firstPossible || wStart >= closeMin) continue
      // A booked slot's own real end time (from the appointment it actually
      // belongs to) — not the currently selected service's duration, which
      // may differ from whatever is already booked there.
      slots.push({
        value: w.start,
        end: w.end,
        label: formatTime12h(w.start),
        part: dayPart(w.start),
        status: 'booked',
      })
    }

    slots.sort((a, b) => toMinutes(a.value) - toMinutes(b.value))

    return { slots, relation, todayExhausted }
    // `nowTick` is intentionally listed with no use inside the body — it
    // exists purely to force a re-sample of `studioNow()` on each tick.
  }, [busy, date, stylistId, durationMin, openTime, closeTime, nowTick])
}
