import { useRef } from 'react'
import clsx from 'clsx'

/**
 * A single-select group of tiles — the shared "not a dropdown" selection
 * pattern reused for both the booking form's Gender and Category steps
 * (same interaction, same accessibility, different content). Implements the
 * WAI-ARIA "Radio Group" pattern: https://www.w3.org/WAI/ARIA/apg/patterns/radio/
 *
 *   - One roving tab stop (the selected tile, or the first before anything
 *     is chosen) — Tab only ever stops once on the whole group.
 *   - ArrowLeft/Up moves to the previous tile, ArrowRight/Down to the next
 *     (wrapping), Home/End jump to the ends; the group is small and wraps
 *     onto multiple visual rows, so both axes are supported rather than
 *     forcing a mental model of "left/right only".
 *   - Space/Enter (native `<button>` behaviour) selects.
 *
 * `options` is `{ value, label, hint? }[]` — `hint` is optional secondary
 * text under the label (e.g. a service's duration/price), left to the
 * caller to compute from real data rather than baked in here.
 */
export default function OptionTiles({
  id,
  labelledBy,
  value,
  onChange,
  options,
  disabled = false,
  invalid = false,
  columns = 'grid-cols-2 sm:grid-cols-3',
}) {
  const rootRef = useRef(null)

  const selectedIndex = options.findIndex((o) => String(o.value) === String(value))
  const tabbableIndex = selectedIndex >= 0 ? selectedIndex : 0

  const focusTile = (index) => {
    const button = rootRef.current?.querySelectorAll('[role="radio"]')[index]
    button?.focus()
  }

  const choose = (index) => {
    const option = options[index]
    if (!option || disabled) return
    onChange(option.value)
  }

  const onKeyDown = (event) => {
    if (disabled) return
    let next
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = (tabbableIndex + 1) % options.length
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        next = (tabbableIndex - 1 + options.length) % options.length
        break
      case 'Home':
        next = 0
        break
      case 'End':
        next = options.length - 1
        break
      default:
        return
    }
    event.preventDefault()
    choose(next)
    focusTile(next)
  }

  return (
    <div
      ref={rootRef}
      id={id}
      role="radiogroup"
      aria-labelledby={labelledBy}
      aria-invalid={invalid || undefined}
      aria-disabled={disabled || undefined}
      onKeyDown={onKeyDown}
      className={clsx('grid gap-2.5', columns)}
    >
      {options.map((option, index) => {
        const selected = String(option.value) === String(value)
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={index === tabbableIndex ? 0 : -1}
            disabled={disabled}
            onClick={() => choose(index)}
            className={clsx(
              'flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-lg border px-3 py-2.5 text-center transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50',
              selected
                ? 'border-ink bg-ink text-paper'
                : 'border-line-strong bg-paper text-ink hover:border-ink',
            )}
          >
            <span className="text-sm font-medium leading-tight">{option.label}</span>
            {option.hint && (
              <span
                className={clsx(
                  'text-xs leading-tight',
                  selected ? 'text-paper/70' : 'text-muted',
                )}
              >
                {option.hint}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
