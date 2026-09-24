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
 *
 * `packages` (optional) are the active pricing plans already loaded for the
 * site (PricingPlansProvider). They render as extra rows in the same list,
 * styled like services, but as independent toggles (`packageValue` /
 * `onPackageChange`) — an appointment is still booked against a service.
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
  packages = [],
  packageValue = '',
  onPackageChange,
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
    <div className="flex flex-col divide-y divide-line overflow-hidden rounded-lg border border-line-strong">
      <div
        ref={rootRef}
        id={id}
        role="radiogroup"
        aria-labelledby={labelledBy}
        aria-invalid={invalid || undefined}
        aria-disabled={disabled || undefined}
        onKeyDown={onKeyDown}
        className="flex flex-col divide-y divide-line"
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

      {onPackageChange &&
        packages.map((plan) => {
          const selected = String(plan.id) === String(packageValue)
          const meta = [
            plan.features.length > 0 ? plan.features.join(' · ') : null,
            plan.validityDays ? `Valid ${plan.validityDays} days` : null,
          ].filter(Boolean)
          return (
            <button
              key={`package-${plan.id}`}
              type="button"
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => onPackageChange(selected ? '' : String(plan.id))}
              className={clsx(
                'flex items-center justify-between gap-4 px-4 py-3 text-left text-ink transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50',
                // Lighter, accent-tinted selected state with an accent edge — a
                // package add-on, never mistaken for a second selected service.
                selected
                  ? 'bg-accent/10 shadow-[inset_3px_0_0_var(--color-accent)]'
                  : 'bg-paper hover:bg-surface-sunken',
              )}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">
                  {plan.name}
                  <span
                    className="ml-2 text-[0.6rem] font-medium uppercase tracking-[0.14em] text-accent"
                  >
                    {selected ? 'Package · Added' : 'Package'}
                  </span>
                </span>
                {meta.map((line) => (
                  <span
                    key={line}
                    className="mt-0.5 block text-xs text-muted"
                  >
                    {line}
                  </span>
                ))}
              </span>
              {plan.price != null && (
                <span className="shrink-0 text-sm font-medium tabular-nums">
                  {formatPrice(plan.price)}
                </span>
              )}
            </button>
          )
        })}
    </div>
  )
}
