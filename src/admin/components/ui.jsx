import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { forwardRef, useCallback, useEffect, useId, useRef, useState } from 'react'
import { Link as RouterLink, NavLink } from 'react-router-dom'
import { ImageOff, Loader2 } from 'lucide-react'
import { resolveMediaUrl } from '../../lib/env'

export const cn = (...args) => twMerge(clsx(args))

/**
 * Image that degrades to a neutral placeholder when the src is missing or fails
 * to load (e.g. an orphaned path). Fills its container.
 */
export function Thumb({ src, alt = '', className, iconSize = 18 }) {
  const [failed, setFailed] = useState(false)
  const resolvedSrc = resolveMediaUrl(src)
  if (!resolvedSrc || failed) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-[var(--color-surface-sunken)] text-[var(--color-faint)]',
          className,
        )}
        aria-label={alt || 'No image'}
      >
        <ImageOff size={iconSize} />
      </div>
    )
  }
  return (
    <img
      src={resolvedSrc}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn('object-cover', className)}
    />
  )
}

/* -- Button -------------------------------------------------------------- */
export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading, className, children, ...props },
  ref,
) {
  const variants = {
    primary: 'btn',
    outline: 'btn btn-outline',
    ghost: 'btn btn-ghost',
    danger: 'btn btn-danger',
  }
  return (
    <button
      ref={ref}
      className={cn(variants[variant], size === 'sm' && 'btn-sm', className)}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 size={15} className="animate-spin" />}
      {children}
    </button>
  )
})

/* -- Form controls ----------------------------------------------------- */
/**
 * Field wrapper: label + control + message row (error or hint).
 * - `reserveMessage` keeps a blank line so inline validation never shifts
 *   the layout — use it on form fields; leave it off for filter controls.
 * - errors are announced to screen readers (role="alert").
 * - pass `htmlFor` to bind the label to a control with that id.
 */
export function Field({
  label,
  error,
  hint,
  required,
  children,
  className,
  htmlFor,
  reserveMessage = false,
}) {
  const showMessage = error || hint || reserveMessage
  return (
    <div className={cn('min-w-0', className)}>
      {label && (
        <label className="label" htmlFor={htmlFor}>
          {label}
          {required && (
            <span className="text-[var(--color-danger)]" aria-hidden="true">
              {' '}
              *
            </span>
          )}
          {required && <span className="sr-only"> (required)</span>}
        </label>
      )}
      {children}
      {showMessage && (
        <p
          className={cn(
            'mt-1.5 text-xs leading-tight',
            reserveMessage && 'min-h-[1.05rem]',
            error ? 'text-[var(--color-danger)]' : 'text-[var(--color-faint)]',
          )}
          {...(error ? { role: 'alert' } : {})}
        >
          {error || hint || ' '}
        </p>
      )}
    </div>
  )
}

export const TextInput = forwardRef(function TextInput({ className, ...props }, ref) {
  return <input ref={ref} className={cn('field', className)} {...props} />
})

export const Textarea = forwardRef(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn('field min-h-[5rem] py-2 leading-relaxed', className)}
      {...props}
    />
  )
})

export const Select = forwardRef(function Select({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={cn('field', className)} {...props}>
      {children}
    </select>
  )
})

export function Toggle({ checked, onChange, label, disabled, id }) {
  return (
    <label
      htmlFor={id}
      className={cn(
        'inline-flex cursor-pointer items-center gap-2.5 select-none',
        disabled && 'cursor-not-allowed opacity-55',
      )}
    >
      <span className="relative inline-flex">
        <input
          id={id}
          type="checkbox"
          role="switch"
          className="peer sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span
          className="h-5 w-9 rounded-full border border-[var(--color-line-strong)] bg-[var(--color-surface-sunken)] transition-colors peer-checked:border-[var(--color-accent)] peer-checked:bg-[var(--color-accent)] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--color-focus)]"
          aria-hidden
        />
        <span
          className="pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-[var(--color-surface)] shadow-sm transition-transform peer-checked:translate-x-4"
          aria-hidden
        />
      </span>
      {label && <span className="text-sm text-[var(--color-ink-soft)]">{label}</span>}
    </label>
  )
}

/* -- Status pill ----------------------------------------------------- */
const TONES = {
  ok: 'text-[var(--color-ok)] bg-[var(--color-ok-tint)] border-[color-mix(in_oklab,var(--color-ok)_30%,transparent)]',
  warn: 'text-[var(--color-warn)] bg-[var(--color-warn-tint)] border-[color-mix(in_oklab,var(--color-warn)_30%,transparent)]',
  info: 'text-[var(--color-info)] bg-[var(--color-info-tint)] border-[color-mix(in_oklab,var(--color-info)_30%,transparent)]',
  danger:
    'text-[var(--color-danger)] bg-[var(--color-danger-tint)] border-[color-mix(in_oklab,var(--color-danger)_30%,transparent)]',
  neutral:
    'text-[var(--color-neutral)] bg-[var(--color-neutral-tint)] border-[color-mix(in_oklab,var(--color-neutral)_30%,transparent)]',
}

export function Pill({ tone = 'neutral', children, className }) {
  return <span className={cn('pill border', TONES[tone], className)}>{children}</span>
}

const APPOINTMENT_TONE = {
  confirmed: 'info',
  completed: 'ok',
  cancelled: 'neutral',
}

export function StatusBadge({ status }) {
  return (
    <Pill tone={APPOINTMENT_TONE[status] ?? 'neutral'}>
      {status ? status[0].toUpperCase() + status.slice(1) : 'Unknown'}
    </Pill>
  )
}

export function ActiveBadge({ active }) {
  return <Pill tone={active ? 'ok' : 'neutral'}>{active ? 'Active' : 'Inactive'}</Pill>
}

const PAYMENT_TONE = { unpaid: 'warn', advance_paid: 'info', paid: 'ok' }
const PAYMENT_LABEL = {
  unpaid: 'Unpaid',
  advance_paid: 'Advance paid',
  paid: 'Paid',
}

export function PaymentBadge({ status }) {
  return (
    <Pill tone={PAYMENT_TONE[status] ?? 'neutral'}>{PAYMENT_LABEL[status] ?? status ?? '—'}</Pill>
  )
}

const SOURCE_TONE = { online: 'neutral', offline: 'info' }
const SOURCE_LABEL = { online: 'Online', offline: 'Offline' }

export function SourceBadge({ source }) {
  return (
    <Pill tone={SOURCE_TONE[source] ?? 'neutral'}>{SOURCE_LABEL[source] ?? source ?? '—'}</Pill>
  )
}

/* -- Feedback states ------------------------------------------------- */
export function Spinner({ className, size = 18 }) {
  return <Loader2 size={size} className={cn('animate-spin text-[var(--color-muted)]', className)} />
}

export function LoadingBlock({ label = 'Loading…', className }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center gap-2.5 py-16 text-sm text-[var(--color-muted)]',
        className,
      )}
    >
      <Spinner />
      {label}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-6 py-16 text-center',
        className,
      )}
    >
      {Icon && (
        <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-sunken)] text-[var(--color-muted)]">
          <Icon size={19} />
        </span>
      )}
      <p className="text-sm font-medium text-[var(--color-ink)]">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-[var(--color-muted)]">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ErrorState({ error, onRetry, className }) {
  const msg =
    error?.status === 403
      ? "You don't have access to this section."
      : error?.message || 'Could not load this data.'
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-16 text-center', className)}>
      <p className="text-sm font-medium text-[var(--color-danger)]">{msg}</p>
      {onRetry && error?.status !== 403 && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

export function Skeleton({ className }) {
  return (
    <span
      className={cn(
        'block animate-pulse rounded bg-[var(--color-surface-sunken)]',
        className,
      )}
    />
  )
}

/* -- Page chrome ---------------------------------------------------- */
export function PageHeader({ title, description, children }) {
  return (
    <div className="mb-7 flex flex-col gap-3 border-b border-[var(--color-line)] pb-5 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[var(--color-ink)]">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm text-[var(--color-muted)]">{description}</p>
        )}
      </div>
      {children && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>
      )}
    </div>
  )
}

/** Titled group inside a long form or modal — hairline-separated, the first one flush. */
export function FormSection({ title, hint, children }) {
  return (
    <section className="flex flex-col gap-4 border-t border-[var(--color-line)] pt-5 first:border-t-0 first:pt-0">
      <div>
        <h3 className="text-sm font-semibold text-[var(--color-ink)]">{title}</h3>
        {hint && <p className="mt-0.5 text-xs text-[var(--color-muted)]">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

/**
 * Card with an optional hairline header (title / description / actions) and a
 * padded body. The single container for grouped content across the admin —
 * Settings groups, dashboard panels, offline-appointment form sections.
 */
export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
  as: Tag = 'section',
}) {
  return (
    <Tag className={cn('card flex flex-col', className)}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-3 border-b border-[var(--color-line)] px-5 py-3.5">
          <div className="min-w-0">
            {title && (
              <h2 className="text-sm font-semibold text-[var(--color-ink)]">{title}</h2>
            )}
            {description && (
              <p className="mt-0.5 text-xs text-[var(--color-muted)]">{description}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn('p-5', bodyClassName)}>{children}</div>
    </Tag>
  )
}

/**
 * The filter bar that sits above a table or list. Consistent container,
 * padding and mobile wrap for every list page. `layout="flex"` (default)
 * for a few controls; `layout="grid"` for a dense multi-filter set.
 */
export function Toolbar({ children, className, layout = 'flex' }) {
  return (
    <div
      className={cn(
        'card mb-5 p-3 sm:p-3.5',
        layout === 'grid'
          ? 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4'
          : 'flex flex-wrap items-end gap-3',
        className,
      )}
    >
      {children}
    </div>
  )
}

/** Labelled search field — used in every Toolbar. */
export const SearchInput = forwardRef(function SearchInput(
  { label = 'Search', className, wrapperClassName, id, ...props },
  ref,
) {
  const autoId = useId()
  const inputId = id || autoId
  return (
    <Field label={label} htmlFor={inputId} className={wrapperClassName}>
      <input
        ref={ref}
        id={inputId}
        type="search"
        className={cn('field', className)}
        {...props}
      />
    </Field>
  )
})

/**
 * A single hairline-divided panel of stats — the one pattern for KPI rows
 * (dashboard, payments summary). Each item optionally links somewhere.
 */
export function StatGrid({ items, columns = 4, size = 'lg', className }) {
  const cols =
    columns === 3
      ? 'sm:grid-cols-3 sm:divide-y-0'
      : columns === 2
        ? 'sm:grid-cols-2 sm:divide-y-0'
        : 'xl:grid-cols-4 xl:divide-y-0'
  const valueSize = size === 'md' ? 'text-xl' : 'text-2xl'
  return (
    <div
      className={cn(
        'card grid grid-cols-2 divide-x divide-y divide-[var(--color-line)]',
        cols,
        className,
      )}
    >
      {items.map((s) => {
        const inner = (
          <>
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--color-faint)]">
              {s.label}
            </p>
            <p
              className={cn(
                'mt-1.5 font-semibold tracking-[-0.02em] text-[var(--color-ink)] tabular-nums',
                valueSize,
              )}
            >
              {s.value}
            </p>
            {s.hint && (
              <p className="mt-0.5 text-xs text-[var(--color-muted)]">{s.hint}</p>
            )}
          </>
        )
        return s.to ? (
          <LinkSlot key={s.label} to={s.to}>
            {inner}
          </LinkSlot>
        ) : (
          <div key={s.label} className="p-4 sm:p-5">
            {inner}
          </div>
        )
      })}
    </div>
  )
}

function LinkSlot({ to, children }) {
  return (
    <RouterLink
      to={to}
      className="p-4 transition-colors hover:bg-[var(--color-surface-hover)] sm:p-5"
    >
      {children}
    </RouterLink>
  )
}

/**
 * Toggle chip — the one control for multi-select filters, role/permission
 * pickers and preset buttons. Selected state is exposed via aria-pressed.
 */
export function ChipButton({ active, className, children, ...props }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn('chip', className)}
      {...props}
    >
      {children}
    </button>
  )
}

/** Definition grid for read-only detail views (appointment, service snapshot). */
export function DetailList({ columns = 3, className, children }) {
  const cols =
    columns === 4
      ? 'sm:grid-cols-4'
      : columns === 2
        ? 'grid-cols-2'
        : 'grid-cols-2 sm:grid-cols-3'
  return (
    <dl className={cn('grid gap-x-4 gap-y-3 text-sm', cols, className)}>{children}</dl>
  )
}

export function Detail({ label, value, className }) {
  return (
    <div className={className}>
      <dt className="label mb-0.5">{label}</dt>
      <dd className="text-[var(--color-ink)]">{value}</dd>
    </div>
  )
}

/* -- Dropdown (disclosure menu) ------------------------------------- */
/**
 * Header / toolbar disclosure menu: a trigger button that reveals a panel of
 * links or actions. Closes on outside pointer-down and on Escape (which
 * restores focus to the trigger). Follows the WAI disclosure pattern — the
 * panel is a plain group of links, so Tab walks through the items in order.
 *
 * `button` is a render prop; spread the supplied props onto a real <button>:
 *   button={({ ref, ...p }) => <button ref={ref} {...p}>…</button>}
 */
export function Dropdown({ button, children, align = 'end', width = 'w-56', panelClassName }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    const onPointer = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onPointer)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      {button({
        ref: triggerRef,
        onClick: () => setOpen((o) => !o),
        'aria-haspopup': true,
        'aria-expanded': open,
        'data-open': open || undefined,
      })}
      {open && (
        <div
          className={cn(
            'absolute z-[var(--z-dropdown)] mt-1.5 overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface-raised)] py-1 shadow-[var(--shadow-pop)]',
            width,
            align === 'end' ? 'right-0' : 'left-0',
            panelClassName,
          )}
          style={{ animation: 'menu-in 130ms var(--ease-standard)' }}
          onClick={close}
        >
          {children}
        </div>
      )}
    </div>
  )
}

/** A link (`to`) or action (`onClick`) row inside a <Dropdown>. */
export function DropdownItem({ to, end, icon: Icon, children, className, ...props }) {
  const base = 'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors'
  if (to) {
    return (
      <NavLink
        to={to}
        end={end}
        className={({ isActive }) =>
          cn(
            base,
            isActive
              ? 'bg-[var(--color-accent-soft)] font-medium text-[var(--color-ink)]'
              : 'text-[var(--color-ink-soft)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-ink)]',
            className,
          )
        }
        {...props}
      >
        {({ isActive }) => (
          <>
            {Icon && (
              <Icon
                size={15}
                className={isActive ? 'text-[var(--color-accent)]' : 'text-[var(--color-faint)]'}
              />
            )}
            {children}
          </>
        )}
      </NavLink>
    )
  }
  return (
    <button
      type="button"
      className={cn(
        base,
        'text-[var(--color-ink-soft)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-ink)]',
        className,
      )}
      {...props}
    >
      {Icon && <Icon size={15} className="text-[var(--color-faint)]" />}
      {children}
    </button>
  )
}
