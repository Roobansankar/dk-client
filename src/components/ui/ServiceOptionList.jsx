import { useRef } from 'react'
import clsx from 'clsx'

/**
 * The booking form's Service step — a compact, scannable vertical list of
 * service cards (name → duration → price → selected state), replacing a
 * native `<select>`. Same WAI-ARIA "Radio Group" keyboard pattern as
 * `OptionTiles` (one roving tab stop, ArrowUp/Down + Home/End to move it,
 * Space/Enter to choose) — kept as its own component rather than reusing
 * `OptionTiles` because a service's content (name + duration + price, each
 * independently aligned) doesn't fit that component's centred-tile layout.
 *
 * `services` is the live catalogue's own service objects — this never
 * invents or duplicates a price; `priceFor`/`durationFor` just read the
 * fields already on each one.
 */
export default function ServiceOptionList({
  id,
  labelledBy,
  value,
  onChange,
  services,
  formatPrice,
  disabled = false,
  invalid = false,
}) {
  const rootRef = useRef(null)

  const selectedIndex = services.findIndex((s) => String(s.id) === String(value))
  const tabbableIndex = selectedIndex >= 0 ? selectedIndex : 0

  const focusItem = (index) => {
    rootRef.current?.querySelectorAll('[role="radio"]')[index]?.focus()
  }

  const choose = (index) => {
    const service = services[index]
    if (!service || disabled) return
    onChange(service.id)
  }

  const onKeyDown = (event) => {
    if (disabled) return
    let next
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        next = (tabbableIndex + 1) % services.length
        break
      case 'ArrowUp':
      case 'ArrowLeft':
        next = (tabbableIndex - 1 + services.length) % services.length
        break
      case 'Home':
        next = 0
        break
      case 'End':
        next = services.length - 1
        break
      default:
        return
    }
    event.preventDefault()
    choose(next)
    focusItem(next)
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
      className="flex flex-col divide-y divide-line overflow-hidden rounded-lg border border-line-strong"
    >
      {services.map((service, index) => {
        const selected = String(service.id) === String(value)
        return (
          <button
            key={service.id}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={index === tabbableIndex ? 0 : -1}
            disabled={disabled}
            onClick={() => choose(index)}
            className={clsx(
              'flex items-center justify-between gap-4 px-4 py-3 text-left transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50',
              selected ? 'bg-ink text-paper' : 'bg-paper text-ink hover:bg-surface-sunken',
            )}
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{service.name}</span>
              {service.durationMin ? (
                <span
                  className={clsx(
                    'mt-0.5 block text-xs',
                    selected ? 'text-paper/70' : 'text-muted',
                  )}
                >
                  {service.durationMin} min
                </span>
              ) : null}
            </span>
            {service.priceInr != null && (
              <span className="shrink-0 text-sm font-medium tabular-nums">
                {formatPrice(service.priceInr)}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
