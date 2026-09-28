import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import { parseDateIso, toDateIso } from '../../lib/time'

/**
 * "Select a date" — a week at a time: exactly 7 date cards (day name / large
 * date number / month), with Previous/Next buttons turning the page to the
 * next or previous 7 days. Replaces a native <input type="date">. Visual
 * direction: design-references/date-ref.png.
 *
 * Dates are generated dynamically from minDateIso/maxDateIso (never
 * hardcoded) — every day in that inclusive range gets a card, so a past date
 * or one outside the studio's booking window is never rendered at all,
 * rather than rendered-but-disabled. The last page can hold fewer than 7 —
 * the remaining grid cells stay empty rather than stretching the real cards.
 *
 * Accessible as a single-select "listbox of buttons": one roving tab stop
 * (the selected date, or the first date before anything is chosen) plus
 * ArrowLeft/ArrowRight/Home/End to move it, turning the page automatically
 * when a move crosses a week boundary — the standard composite-widget
 * keyboard pattern, so Tab only ever stops once here regardless of how many
 * weeks are in range. aria-current="date" marks the selected card.
 *
 * `isDateDisabled(iso)` greys out a day that can't be booked (e.g. a date the
 * chosen professional has no hours for): it stays in the rail so the gap is
 * visible, but it can't be selected and arrow-key navigation skips over it.
 *
 * `dateNote(iso)` optionally returns a short label shown on that day's card
 * (e.g. a studio holiday name like "Diwali") — also exposed via the card's
 * title and aria-label so the full text survives truncation.
 */

const PAGE_SIZE = 7

const DAY_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const MONTH_LABEL = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

/** "28 Sep" */
const formatShort = (iso) => {
  const date = parseDateIso(iso)
  return `${date.getDate()} ${MONTH_LABEL[date.getMonth()]}`
}

/**
 * Every date from minIso to maxIso, inclusive — deterministic,
 * timezone-safe (local calendar days only).
 */
function dateRange(minIso, maxIso) {
  if (!minIso || !maxIso) return []

  const out = []
  const cursor = parseDateIso(minIso)
  const end = parseDateIso(maxIso)

  while (cursor <= end) {
    out.push(toDateIso(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }

  return out
}

export function DateRail({
  id,
  labelledBy,
  value,
  onChange,
  minDateIso,
  maxDateIso,
  invalid = false,
  disabled = false,
  isDateDisabled,
  dateNote,
}) {
  const cardRefs = useRef(new Map())
  // An iso a keyboard move is headed for, on a week it isn't showing yet — the
  // focus effect below picks it up once the page turn mounts its card. A ref,
  // not state: it drives a DOM side effect, not a render.
  const pendingFocusRef = useRef(null)

  const dates = useMemo(
    () => dateRange(minDateIso, maxDateIso),
    [minDateIso, maxDateIso],
  )

  const isOff = (iso) => Boolean(isDateDisabled?.(iso))

  const selectedIndex = dates.indexOf(value)

  // The roving tab stop: the selected date if there is one, else the first
  // bookable one — never more than one card in the whole rail is ever
  // Tab-reachable.
  const firstOpen = dates.findIndex((iso) => !isOff(iso))
  const tabbableIndex = selectedIndex >= 0 ? selectedIndex : Math.max(0, firstOpen)

  const lastPage = Math.max(0, Math.ceil(dates.length / PAGE_SIZE) - 1)
  const pageOf = (index) => Math.min(lastPage, Math.max(0, Math.floor(index / PAGE_SIZE)))
  const firstOpenIso = dates[firstOpen]

  const [page, setPage] = useState(() => pageOf(Math.max(0, selectedIndex >= 0 ? selectedIndex : firstOpen)))

  // Keep the visible week in step with the selected date (e.g. a prefill), and
  // — with nothing picked yet — with which date is first bookable (e.g. the
  // professional changed, and only a few of their dates are open). Adjusted
  // during render rather than in an effect, so the right week shows on the
  // very same render instead of flashing the old one first; see "Adjusting
  // state when a prop changes" in the React docs for this pattern.
  const [trackedValue, setTrackedValue] = useState(value)
  const [trackedFirstOpenIso, setTrackedFirstOpenIso] = useState(firstOpenIso)
  if (value !== trackedValue) {
    setTrackedValue(value)
    if (selectedIndex >= 0) setPage(pageOf(selectedIndex))
  } else if (firstOpenIso !== trackedFirstOpenIso) {
    setTrackedFirstOpenIso(firstOpenIso)
    if (selectedIndex < 0 && firstOpen >= 0) setPage(pageOf(firstOpen))
  }

  const visible = dates.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  // A keyboard move that turned the page: focus the card it was headed for
  // once it exists.
  useEffect(() => {
    const iso = pendingFocusRef.current
    if (!iso) return

    const card = cardRefs.current.get(iso)
    if (card) {
      card.focus()
      pendingFocusRef.current = null
    }
  }, [page])

  const choose = (index) => {
    const iso = dates[index]

    if (!iso || disabled || isOff(iso)) return

    onChange(iso)
  }

  // The nearest bookable index from `from` (exclusive) in `direction`, or -1.
  const stepTo = (from, direction) => {
    for (let i = from + direction; i >= 0 && i < dates.length; i += direction) {
      if (!isOff(dates[i])) return i
    }
    return -1
  }

  const onKeyDown = (event) => {
    if (disabled) return

    let next

    switch (event.key) {
      case 'ArrowRight':
        next = stepTo(tabbableIndex, 1)
        break
      case 'ArrowLeft':
        next = stepTo(tabbableIndex, -1)
        break
      case 'Home':
        next = firstOpen
        break
      case 'End':
        next = dates.reduce((last, iso, i) => (isOff(iso) ? last : i), -1)
        break
      default:
        return
    }

    event.preventDefault()
    if (next < 0) return
    choose(next)

    // Same week: the card already exists, focus it now. A different week:
    // it doesn't exist until the page turn (above) mounts it — hand off to
    // the focus effect instead.
    const iso = dates[next]
    const card = cardRefs.current.get(iso)
    if (card) card.focus()
    else pendingFocusRef.current = iso
  }

  if (dates.length === 0) return null

  const rangeLabel =
    visible.length > 1 ? `${formatShort(visible[0])} – ${formatShort(visible.at(-1))}` : formatShort(visible[0])

  const turnButton =
    'grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line-strong bg-surface text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="Previous week"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={disabled || page === 0}
          className={turnButton}
        >
          <ChevronLeft size={16} aria-hidden="true" />
        </button>

        <span className="text-sm font-medium tabular-nums text-ink-soft" aria-live="polite">
          {rangeLabel}
        </span>

        <button
          type="button"
          aria-label="Next week"
          onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
          disabled={disabled || page === lastPage}
          className={turnButton}
        >
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>

      <div
        id={id}
        role="listbox"
        aria-labelledby={labelledBy}
        aria-invalid={invalid || undefined}
        aria-disabled={disabled || undefined}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="grid grid-cols-7 gap-1.5 sm:gap-2"
      >
        {Array.from({ length: PAGE_SIZE }, (_, slot) => {
          const iso = visible[slot]
          if (!iso) return <div key={`blank-${slot}`} aria-hidden="true" />

          const index = page * PAGE_SIZE + slot
          const date = parseDateIso(iso)
          const selected = iso === value
          const off = isOff(iso)
          const note = dateNote?.(iso) ?? null

          return (
            <button
              key={iso}
              ref={(el) => {
                if (el) cardRefs.current.set(iso, el)
                else cardRefs.current.delete(iso)
              }}
              type="button"
              role="option"
              aria-selected={selected}
              aria-label={`${DAY_LABEL[date.getDay()]} ${date.getDate()} ${MONTH_LABEL[date.getMonth()]}${note ? ` — ${note}` : ''}${off && !note ? ' — not available' : ''}`}
              tabIndex={index === tabbableIndex ? 0 : -1}
              disabled={disabled}
              aria-disabled={off || undefined}
              title={note ?? (off ? 'Not available' : undefined)}
              onClick={() => choose(index)}
              className={clsx(
                'flex min-w-0 flex-col items-center gap-0.5 rounded-lg border px-1 py-3 text-center transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50',
                off
                  ? 'cursor-not-allowed border-transparent bg-surface-sunken text-muted opacity-60'
                  : selected
                    ? 'border-ink bg-ink text-paper'
                    : 'border-line-strong bg-paper text-ink hover:border-ink',
              )}
            >
              <span
                className={clsx(
                  'text-[0.7rem] font-medium uppercase tracking-[0.06em]',
                  selected ? 'text-paper/70' : 'text-muted',
                )}
              >
                {DAY_LABEL[date.getDay()]}
              </span>

              <span
                className={clsx(
                  'text-xl font-semibold tabular-nums leading-tight',
                  off && 'line-through decoration-1',
                )}
              >
                {date.getDate()}
              </span>

              <span
                className={clsx(
                  'text-[0.7rem] uppercase tracking-[0.06em]',
                  selected ? 'text-paper/70' : 'text-muted',
                )}
              >
                {MONTH_LABEL[date.getMonth()]}
              </span>

              {note && (
                <span
                  className={clsx(
                    'max-w-full truncate px-0.5 text-[0.65rem] font-medium leading-tight',
                    selected ? 'text-paper/80' : 'text-ink-soft',
                  )}
                >
                  {note}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
