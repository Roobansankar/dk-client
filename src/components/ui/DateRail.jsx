import { useEffect, useMemo, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import { parseDateIso, toDateIso } from '../../lib/time'

/**
 * "Select a date" — a horizontal rail of date cards (day name / large date
 * number / month), replacing a native <input type="date">. Visual
 * direction: design-references/date-ref.png.
 *
 * Dates are generated dynamically from minDateIso/maxDateIso (never
 * hardcoded) — every day in that inclusive range gets a card, so a past date
 * or one outside the studio's booking window is never rendered at all,
 * rather than rendered-but-disabled.
 *
 * Accessible as a single-select "listbox of buttons": one roving tab stop
 * (the selected date, or the first date before anything is chosen) plus
 * ArrowLeft/ArrowRight/Home/End to move it — the standard composite-widget
 * keyboard pattern, so Tab only ever stops once here regardless of how many
 * dates are in range. aria-current="date" marks the selected card.
 *
 * The rail itself is a native overflow-x-auto scroller — touch swipe works
 * for free — with prev/next arrow buttons that nudge it by one viewport
 * width. Selecting a date (by click or by keyboard) scrolls it into view, so
 * the selected card is never scrolled out of sight.
 */

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
}) {
  const scrollerRef = useRef(null)
  const cardRefs = useRef(new Map())

  const dates = useMemo(
    () => dateRange(minDateIso, maxDateIso),
    [minDateIso, maxDateIso],
  )

  const selectedIndex = dates.indexOf(value)

  // The roving tab stop: the selected date if there is one, else the first —
  // never more than one card in the whole rail is ever Tab-reachable.
  const tabbableIndex = selectedIndex >= 0 ? selectedIndex : 0

  const scrollToIndex = (index, behavior = 'smooth') => {
    cardRefs.current.get(dates[index])?.scrollIntoView({
      behavior,
      inline: 'nearest',
      block: 'nearest',
    })
  }

  // Keep the selected card in view when it changes from elsewhere (e.g. a
  // prefill), without fighting the visitor's own scroll on every render.
  useEffect(() => {
    if (selectedIndex >= 0) scrollToIndex(selectedIndex, 'auto')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const choose = (index) => {
    const iso = dates[index]

    if (!iso || disabled) return

    onChange(iso)
    scrollToIndex(index)
  }

  const onKeyDown = (event) => {
    if (disabled) return

    let next

    switch (event.key) {
      case 'ArrowRight':
        next = Math.min(dates.length - 1, tabbableIndex + 1)
        break
      case 'ArrowLeft':
        next = Math.max(0, tabbableIndex - 1)
        break
      case 'Home':
        next = 0
        break
      case 'End':
        next = dates.length - 1
        break
      default:
        return
    }

    event.preventDefault()
    choose(next)
    cardRefs.current.get(dates[next])?.focus()
  }

  const nudge = (direction) => {
    const el = scrollerRef.current

    if (!el) return

    el.scrollBy({
      left: direction * el.clientWidth * 0.8,
      behavior: 'smooth',
    })
  }

  if (dates.length === 0) return null

  return (
    // min-w-0 overrides the grid/flex default min-width: auto, which
    // would otherwise size this item to the rail's full unscrolled content
    // width instead of allowing the horizontal scroller to contain it.
    <div className="flex min-w-0 items-center gap-2">
      <button
        type="button"
        aria-label="Previous dates"
        onClick={() => nudge(-1)}
        disabled={disabled}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line-strong bg-surface text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft size={16} aria-hidden="true" />
      </button>

      <div
        ref={scrollerRef}
        id={id}
        role="listbox"
        aria-labelledby={labelledBy}
        aria-invalid={invalid || undefined}
        aria-disabled={disabled || undefined}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="no-scrollbar flex min-w-0 flex-1 snap-x gap-2.5 overflow-x-auto scroll-px-1 py-1"
      >
        {dates.map((iso, index) => {
          const date = parseDateIso(iso)
          const selected = iso === value

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
              tabIndex={index === tabbableIndex ? 0 : -1}
              disabled={disabled}
              onClick={() => choose(index)}
              className={clsx(
                'flex w-16 shrink-0 snap-start flex-col items-center gap-0.5 rounded-lg border px-2 py-3 text-center transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50',
                selected
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

              <span className="text-xl font-semibold tabular-nums leading-tight">
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
            </button>
          )
        })}
      </div>

      <button
        type="button"
        aria-label="Next dates"
        onClick={() => nudge(1)}
        disabled={disabled}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line-strong bg-surface text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    </div>
  )
}