import { cn } from './ui'

/**
 * All charts here are hand-drawn inline SVG — no chart library. They render
 * real API series only; when a series is all-zero the parent shows an empty
 * state instead of calling these.
 */

export function TrendChart({ series }) {
  // series: [{ date, count }] — day columns; sparse data stays legible as bars.
  const max = Math.max(1, ...series.map((d) => d.count))
  const peak = series.reduce((a, b) => (b.count > a.count ? b : a), series[0])

  return (
    <div className="w-full">
      <div
        className="flex h-40 items-end gap-px border-b border-[var(--color-line)]"
        role="img"
        aria-label={`Appointment requests per day over the last ${series.length} days; peak ${peak?.count ?? 0} on ${fmtShort(peak?.date)}`}
      >
        {series.map((d, i) => (
          <div
            key={i}
            title={`${fmtShort(d.date)}: ${d.count}`}
            className="flex-1 rounded-t-[1px] transition-colors"
            style={{
              height: d.count === 0 ? '2px' : `${Math.max(4, (d.count / max) * 100)}%`,
              backgroundColor:
                d === peak && d.count > 0
                  ? 'var(--color-accent)'
                  : d.count > 0
                    ? 'var(--color-line-strong)'
                    : 'var(--color-line)',
            }}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[0.6875rem] text-[var(--color-faint)]">
        <span>{fmtShort(series[0]?.date)}</span>
        <span>{fmtShort(series.at(-1)?.date)}</span>
      </div>
    </div>
  )
}

function fmtShort(iso) {
  if (!iso) return ''
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(
    new Date(iso),
  )
}

const BAR_TONES = {
  accent: 'var(--color-accent)',
  ok: 'var(--color-ok)',
  info: 'var(--color-info)',
  warn: 'var(--color-warn)',
  danger: 'var(--color-danger)',
  neutral: 'var(--color-neutral)',
}

/** Labeled horizontal bars for ranked lists (popular services, categories). */
export function RankedBars({ items, tone = 'accent', emptyLabel = 'No data yet' }) {
  if (!items?.length) {
    return <p className="py-6 text-center text-sm text-[var(--color-faint)]">{emptyLabel}</p>
  }
  const max = Math.max(1, ...items.map((i) => i.count))
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item) => (
        <li key={item.name} className="grid grid-cols-[1fr_auto] items-center gap-x-3">
          <div className="min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-sm text-[var(--color-ink-soft)]">{item.name}</span>
              <span className="shrink-0 text-xs tabular-nums text-[var(--color-muted)]">
                {item.count}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-sunken)]">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(item.count / max) * 100}%`,
                  backgroundColor: BAR_TONES[tone],
                }}
              />
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

/** A single proportion bar split into labeled segments. */
export function SplitBar({ segments }) {
  // segments: [{ label, value, tone }]
  const total = segments.reduce((s, x) => s + x.value, 0)
  if (!total) {
    return <p className="py-6 text-center text-sm text-[var(--color-faint)]">No data yet</p>
  }
  return (
    <div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-[var(--color-surface-sunken)]">
        {segments.map(
          (s) =>
            s.value > 0 && (
              <div
                key={s.label}
                style={{
                  width: `${(s.value / total) * 100}%`,
                  backgroundColor: BAR_TONES[s.tone] ?? BAR_TONES.neutral,
                }}
              />
            ),
        )}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: BAR_TONES[s.tone] ?? BAR_TONES.neutral }}
            />
            <span className="text-[var(--color-ink-soft)]">{s.label}</span>
            <span className="tabular-nums">
              {s.value} · {Math.round((s.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function StatTile({ label, value, sub, className }) {
  return (
    <div className={cn('flex flex-col gap-1 p-4', className)}>
      <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-faint)]">
        {label}
      </span>
      <span className="text-xl font-semibold tracking-[-0.02em] text-[var(--color-ink)] tabular-nums">{value}</span>
      {sub && <span className="text-xs text-[var(--color-muted)]">{sub}</span>}
    </div>
  )
}
