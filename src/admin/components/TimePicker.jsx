import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Clock } from 'lucide-react'
import { Button, cn } from './ui'
import { formatTime12h } from '../../lib/time'

/**
 * Choose a time by clicking, in 12-hour AM/PM — whatever the browser's or the
 * computer's regional settings. A native time box follows those settings (and
 * shows 14:30 on a 24-hour setup); this one always offers Hour (1–12), Minute
 * (00–59) and AM/PM columns, like the browser's own picker but in Indian
 * 12-hour time.
 *
 * `value` and `onChange` use 24-hour "H:i" ("14:30"), or '' for "not chosen".
 * Nothing is pre-selected: pick an hour, then AM/PM (the minutes start at :00
 * once an hour is picked); the value is reported as soon as all three are set,
 * and every later click adjusts it.
 */

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1)
const MINUTES = Array.from({ length: 60 }, (_, i) => i)
const PERIODS = ['AM', 'PM']
const pad = (n) => String(n).padStart(2, '0')

/** "14:30" → { hour: 2, minute: 30, period: 'PM' }; '' → nothing chosen. */
function split(value) {
  if (!value) return { hour: null, minute: null, period: null }

  const [h, m] = value.split(':').map(Number)

  return { hour: h % 12 === 0 ? 12 : h % 12, minute: m, period: h < 12 ? 'AM' : 'PM' }
}

/** The three parts back to "H:i", or '' while any is still missing. */
function join({ hour, minute, period }) {
  if (hour == null || minute == null || period == null) return ''

  return `${pad((hour % 12) + (period === 'PM' ? 12 : 0))}:${pad(minute)}`
}

/** One scrolling column of choices (roving focus: one Tab stop, arrow keys inside). */
function Column({ label, items, selected, format, onPick }) {
  const listRef = useRef(null)

  // Show the chosen item in the middle of its own column (never scrolls the page).
  useEffect(() => {
    const list = listRef.current
    const item = list?.querySelector('[aria-selected="true"]')

    if (list && item) list.scrollTop = item.offsetTop - list.clientHeight / 2 + item.clientHeight / 2
  }, [])

  const onKeyDown = (event) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return

    const buttons = [...listRef.current.querySelectorAll('button')]
    const index = buttons.indexOf(document.activeElement)
    const next = event.key === 'ArrowDown' ? Math.min(index + 1, buttons.length - 1) : Math.max(index - 1, 0)

    buttons[next]?.focus()
    event.preventDefault()
  }

  const tabStop = selected ?? items[0]

  return (
    <ul
      ref={listRef}
      role="listbox"
      aria-label={label}
      onKeyDown={onKeyDown}
      className="relative flex max-h-56 min-w-[3.75rem] flex-col gap-0.5 overflow-y-auto p-1.5"
    >
      {items.map((item) => (
        <li key={item} role="presentation">
          <button
            type="button"
            role="option"
            aria-selected={item === selected}
            tabIndex={item === tabStop ? 0 : -1}
            onClick={() => onPick(item)}
            className={cn(
              'w-full rounded-[var(--radius-sm,0.375rem)] px-3 py-1.5 text-center text-sm tabular-nums text-[var(--color-ink)] transition-colors',
              'hover:bg-[var(--color-surface-sunken)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]',
              item === selected &&
                'bg-[color-mix(in_oklab,var(--color-accent)_20%,transparent)] font-semibold ring-1 ring-[var(--color-accent)]',
            )}
          >
            {format(item)}
          </button>
        </li>
      ))}
    </ul>
  )
}

export function TimePicker({ value, onChange, label, disabled = false, invalid = false, placeholder = 'Select time' }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(() => split(value))
  const [position, setPosition] = useState(null)
  const triggerRef = useRef(null)
  const panelRef = useRef(null)

  const close = useCallback((restoreFocus = false) => {
    setOpen(false)
    setPosition(null)
    if (restoreFocus) triggerRef.current?.focus()
  }, [])

  // Under the button — or above it when there isn't room — and always inside the window.
  const place = useCallback(() => {
    const trigger = triggerRef.current
    const panel = panelRef.current

    if (!trigger || !panel) return

    const box = trigger.getBoundingClientRect()
    const { offsetWidth: width, offsetHeight: height } = panel
    const below = box.bottom + 6
    const fitsBelow = below + height <= window.innerHeight - 8

    setPosition({
      left: Math.min(Math.max(8, box.left), Math.max(8, window.innerWidth - width - 8)),
      top: fitsBelow || box.top - height - 6 < 8 ? below : box.top - height - 6,
    })
  }, [])

  useLayoutEffect(() => {
    if (open) place()
  }, [open, place])

  useEffect(() => {
    if (!open) return undefined

    const onPointerDown = (event) => {
      if (!panelRef.current?.contains(event.target) && !triggerRef.current?.contains(event.target)) close()
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') close(true)
    }
    const onMove = (event) => {
      // the columns scrolling inside the panel must not re-place it
      if (!panelRef.current?.contains(event.target)) place()
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', onMove)
    window.addEventListener('scroll', onMove, true)

    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onMove)
      window.removeEventListener('scroll', onMove, true)
    }
  }, [open, close, place])

  // Once placed, move focus into the picker (one Tab stop per column).
  useEffect(() => {
    if (open && position) panelRef.current?.querySelector('button[tabindex="0"]')?.focus({ preventScroll: true })
    // only when it first appears
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, position === null])

  const openPicker = () => {
    setDraft(split(value))
    setOpen(true)
  }

  const pick = (patch) => {
    const next = { ...draft, ...patch }

    // choosing an hour settles the minutes at :00 until they are chosen
    if (patch.hour != null && next.minute == null) next.minute = 0

    setDraft(next)

    const time = join(next)
    if (time) onChange(time)
  }

  const chosen = join(draft)

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={invalid || undefined}
        onClick={() => (open ? close() : openPicker())}
        className={cn('field flex items-center justify-between gap-2 text-left', !value && 'text-[var(--color-faint)]')}
      >
        <span className="sr-only">{label}: </span>
        <span className="truncate">{value ? formatTime12h(value) : placeholder}</span>
        <Clock size={15} aria-hidden="true" className="shrink-0 text-[var(--color-muted)]" />
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label={`Choose ${label}`}
            style={{
              position: 'fixed',
              top: position?.top ?? 0,
              left: position?.left ?? 0,
              visibility: position ? 'visible' : 'hidden',
            }}
            className="z-[var(--z-dropdown)] rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface-raised)] shadow-[var(--shadow-pop)]"
          >
            <div className="flex divide-x divide-[var(--color-line)]">
              <Column label="Hour" items={HOURS} selected={draft.hour} format={pad} onPick={(hour) => pick({ hour })} />
              <Column label="Minute" items={MINUTES} selected={draft.minute} format={pad} onPick={(minute) => pick({ minute })} />
              <Column label="AM or PM" items={PERIODS} selected={draft.period} format={(p) => p} onPick={(period) => pick({ period })} />
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-[var(--color-line)] px-3 py-2">
              <span className="text-xs text-[var(--color-muted)]" aria-live="polite">
                {chosen ? formatTime12h(chosen) : 'Choose hour, minute and AM/PM'}
              </span>
              <Button size="sm" onClick={() => close(true)}>
                Done
              </Button>
            </div>
          </div>,
          document.querySelector('.admin-app') || document.body,
        )}
    </>
  )
}
