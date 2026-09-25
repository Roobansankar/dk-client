import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button, cn } from './ui'
import { parseDateIso, toDateIso } from '../../lib/time'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const monthTitle = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' })
const longDate = new Intl.DateTimeFormat('en-IN', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

/**
 * How each kind of day looks in the grid. `regular` is an ordinary working day
 * from the weekly pattern; `weekly-off` is a normal day off in that pattern;
 * `custom` and `off` are dates set on the calendar itself.
 */
const DAY_KIND_STYLES = {
  regular: 'border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-muted)]',
  'weekly-off': 'border-transparent bg-[var(--color-surface-sunken)] text-[var(--color-faint)]',
  custom:
    'border-[var(--color-accent)] bg-[color-mix(in_oklab,var(--color-accent)_12%,transparent)] text-[var(--color-ink-soft)]',
  off: 'border-[color-mix(in_oklab,var(--color-danger)_40%,transparent)] bg-[var(--color-danger-tint)] text-[var(--color-danger)]',
}

/**
 * A month grid (weeks start on Monday) for picking one or many dates.
 *
 * `describe(iso)` says what each date is — `{ kind, text, title }` with `kind`
 * one of DAY_KIND_STYLES' keys — so this stays a plain calendar and the caller
 * decides what a day means. Dates before `minIso` or after `maxIso` can't be
 * selected. Click toggles a date; Shift-click selects everything between the
 * last click and this one (the caller handles that in `onDayClick`).
 *
 * @param {{
 *   year: number, month: number,                    // month is 0–11
 *   onMonthChange: (year: number, month: number) => void,
 *   minIso: string, maxIso: string, todayIso: string,
 *   selected: Set<string>,
 *   onDayClick: (iso: string, opts: { shift: boolean }) => void,
 *   describe: (iso: string) => { kind: string, text: string, title: string },
 * }} props
 */
export function MonthCalendar({
  year,
  month,
  onMonthChange,
  minIso,
  maxIso,
  todayIso,
  selected,
  onDayClick,
  describe,
}) {
  const first = new Date(year, month, 1)
  const lead = (first.getDay() + 6) % 7 // blanks before the 1st, Monday-first
  const dayCount = new Date(year, month + 1, 0).getDate()

  const cells = [
    ...Array(lead).fill(null),
    ...Array.from({ length: dayCount }, (_, i) => toDateIso(new Date(year, month, i + 1))),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const goto = (delta) => {
    const next = new Date(year, month + delta, 1)
    onMonthChange(next.getFullYear(), next.getMonth())
  }
  const prevDisabled = toDateIso(new Date(year, month, 0)) < minIso
  const nextDisabled = toDateIso(new Date(year, month + 1, 1)) > maxIso
  const today = parseDateIso(todayIso)
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            aria-label="Previous month"
            disabled={prevDisabled}
            onClick={() => goto(-1)}
          >
            <ChevronLeft size={15} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            aria-label="Next month"
            disabled={nextDisabled}
            onClick={() => goto(1)}
          >
            <ChevronRight size={15} />
          </Button>
        </div>
        <h3 className="text-sm font-semibold text-[var(--color-ink)]" aria-live="polite">
          {monthTitle.format(first)}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          disabled={isCurrentMonth}
          onClick={() => onMonthChange(today.getFullYear(), today.getMonth())}
        >
          Today
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="pb-1 text-center text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[var(--color-faint)]"
          >
            {day}
          </div>
        ))}

        {cells.map((iso, index) => {
          if (!iso) return <div key={`blank-${index}`} aria-hidden="true" />

          const outside = iso < minIso || iso > maxIso
          const { kind, text, title } = describe(iso)
          const isSelected = selected.has(iso)

          return (
            <button
              key={iso}
              type="button"
              disabled={outside}
              aria-pressed={isSelected}
              aria-label={`${longDate.format(parseDateIso(iso))} — ${title}`}
              title={title}
              onClick={(e) => onDayClick(iso, { shift: e.shiftKey })}
              className={cn(
                'flex h-14 flex-col justify-between rounded-[var(--radius-md)] border p-1.5 text-left transition-colors sm:h-[4.5rem] sm:p-2',
                DAY_KIND_STYLES[kind] ?? DAY_KIND_STYLES.regular,
                !outside && 'hover:border-[var(--color-ink)]',
                isSelected && 'border-[var(--color-ink)] ring-2 ring-[var(--color-ink)]',
                outside && 'cursor-not-allowed opacity-35',
              )}
            >
              <span
                className={cn(
                  'text-sm tabular-nums text-[var(--color-ink)]',
                  iso === todayIso ? 'font-bold underline decoration-2 underline-offset-2' : 'font-medium',
                )}
              >
                {parseDateIso(iso).getDate()}
              </span>
              <span className="hidden truncate text-[0.6875rem] leading-tight sm:block">{text}</span>
            </button>
          )
        })}
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-[var(--color-muted)]" aria-label="Legend">
        {[
          ['regular', 'Regular hours'],
          ['custom', 'Custom hours'],
          ['off', 'Day off (set here)'],
          ['weekly-off', 'Weekly day off'],
        ].map(([kind, label]) => (
          <li key={kind} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={cn('h-3.5 w-3.5 rounded-sm border', DAY_KIND_STYLES[kind])} />
            {label}
          </li>
        ))}
      </ul>
    </div>
  )
}
