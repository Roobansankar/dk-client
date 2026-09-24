import { Minus, Plus } from 'lucide-react'
import clsx from 'clsx'
import { MAX_QUANTITY } from '../../lib/cart'

/** Compact − n + control, clamped to 1…min(MAX_QUANTITY, max). */
export default function QuantityStepper({ value, onChange, max = MAX_QUANTITY, label = 'Quantity', className, disabled }) {
  const btn =
    'inline-flex h-9 w-9 items-center justify-center text-ink-soft transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-40'
  const limit = Math.max(1, Math.min(MAX_QUANTITY, Math.floor(Number(max) || MAX_QUANTITY)))

  return (
    <div
      role="group"
      aria-label={label}
      className={clsx(
        'inline-flex items-center rounded-[var(--radius-sm)] border border-line-strong',
        className,
      )}
    >
      <button
        type="button"
        className={btn}
        onClick={() => onChange(value - 1)}
        disabled={disabled || value <= 1}
        aria-label="Decrease quantity"
      >
        <Minus size={14} aria-hidden="true" />
      </button>
      <span className="min-w-[2rem] text-center text-sm tabular-nums text-ink" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className={btn}
        onClick={() => onChange(value + 1)}
        disabled={disabled || value >= limit}
        aria-label="Increase quantity"
      >
        <Plus size={14} aria-hidden="true" />
      </button>
    </div>
  )
}
