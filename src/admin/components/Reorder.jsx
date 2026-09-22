import { ArrowDown, ArrowUp } from 'lucide-react'
import { cn } from './ui'

/**
 * Lightweight reorder control — up/down buttons, keyboard-accessible, no drag
 * library. `items` is the current ordered array; `onMove(index, dir)` returns
 * the new order which the parent persists via the API `/reorder` endpoint.
 */
export function move(items, index, dir) {
  const target = index + dir
  if (target < 0 || target >= items.length) return items
  const next = items.slice()
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

export function ReorderButtons({ index, count, onMove, disabled }) {
  return (
    <span className="inline-flex overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-line-strong)]">
      <button
        type="button"
        aria-label="Move up"
        disabled={disabled || index === 0}
        onClick={() => onMove(index, -1)}
        className={cn(
          'flex h-7 w-7 items-center justify-center text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-ink)] disabled:pointer-events-none disabled:opacity-30',
        )}
      >
        <ArrowUp size={14} />
      </button>
      <button
        type="button"
        aria-label="Move down"
        disabled={disabled || index === count - 1}
        onClick={() => onMove(index, 1)}
        className="flex h-7 w-7 items-center justify-center border-l border-[var(--color-line-strong)] text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-ink)] disabled:pointer-events-none disabled:opacity-30"
      >
        <ArrowDown size={14} />
      </button>
    </span>
  )
}
