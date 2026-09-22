import clsx from 'clsx'

/**
 * Small, design-consistent loading / error / empty helpers. They reuse the
 * existing tokens (surface-sunken, line, muted) — no new colours, no motion
 * beyond a quiet pulse. Nothing here changes an approved section's layout.
 */

export function Skeleton({ className }) {
  return (
    <span
      aria-hidden="true"
      className={clsx('block animate-pulse rounded-md bg-surface-sunken', className)}
    />
  )
}

/** A grid of hairline cards used while services / previews load. */
export function CardSkeletonGrid({ count = 6, className }) {
  return (
    <ul className={clsx('grid gap-5 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <li
          key={i}
          className="rounded-sm border border-line bg-surface p-6"
          aria-hidden="true"
        >
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="mt-4 h-3 w-full" />
          <Skeleton className="mt-2 h-3 w-4/5" />
          <Skeleton className="mt-6 h-3 w-24" />
        </li>
      ))}
    </ul>
  )
}

/** Barely-there status line, in the existing caption voice. */
export function StatusLine({ children, className }) {
  return (
    <p className={clsx('text-sm text-muted', className)} role="status">
      {children}
    </p>
  )
}

/** The bordered note used elsewhere for development/pricing disclaimers. */
export function Notice({ children, className }) {
  return (
    <p
      className={clsx(
        'border-l-2 border-line-strong pl-4 text-xs text-muted',
        className,
      )}
    >
      {children}
    </p>
  )
}
