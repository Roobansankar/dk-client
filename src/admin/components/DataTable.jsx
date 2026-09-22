import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button, cn } from './ui'

const colVisibility = (col) =>
  cn(
    col.align === 'right' && 'text-right',
    col.align === 'center' && 'text-center',
    col.hideBelow === 'sm' && 'hidden sm:table-cell',
    col.hideBelow === 'md' && 'hidden md:table-cell',
    col.hideBelow === 'lg' && 'hidden lg:table-cell',
  )

/**
 * Presentational table. `columns` = [{ key, header, cell, align, width, hideBelow }].
 * `rowKey` maps a row to a stable key. Renders its own loading/empty slots.
 */
export function DataTable({
  columns,
  rows,
  rowKey = (r) => r.id,
  loading,
  empty,
  onRowClick,
  refetching,
}) {
  if (loading) return <TableSkeleton columns={columns} />
  if (!rows?.length) return empty ?? null

  return (
    <div className="relative overflow-x-auto">
      {refetching && (
        <span className="absolute inset-x-0 top-0 h-0.5 overflow-hidden">
          <span className="block h-full w-1/3 animate-[indeterminate_1.1s_ease-in-out_infinite] bg-[var(--color-accent)]" />
        </span>
      )}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--color-line)] text-left">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'whitespace-nowrap px-3 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-[var(--color-faint)]',
                  colVisibility(col),
                )}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                'border-b border-[var(--color-line)] last:border-0 transition-colors',
                onRowClick &&
                  'cursor-pointer hover:bg-[var(--color-surface-hover)] focus-within:bg-[var(--color-surface-hover)]',
              )}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    'px-3 py-3.5 align-middle text-[var(--color-ink-soft)]',
                    colVisibility(col),
                  )}
                >
                  {col.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TableSkeleton({ columns, rows = 6 }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--color-line)] text-left">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'whitespace-nowrap px-3 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-[var(--color-faint)]',
                  colVisibility(col),
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody aria-hidden="true">
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} className="border-b border-[var(--color-line)] last:border-0">
              {columns.map((col, c) => (
                <td key={col.key} className={cn('px-3 py-3.5', colVisibility(col))}>
                  <span
                    className="block h-3 rounded-full bg-[var(--color-surface-sunken)]"
                    style={{
                      width: c === 0 ? '58%' : `${34 + ((r + c) % 3) * 12}%`,
                      marginLeft: col.align === 'right' ? 'auto' : undefined,
                      animation: 'skeleton 1.4s ease-in-out infinite',
                      animationDelay: `${(r * columns.length + c) * 60}ms`,
                    }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Pagination({ meta, onPage }) {
  if (!meta || meta.last_page <= 1) return null
  const { current_page: page, last_page: last, from, to, total } = meta
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-line)] px-3 py-3 text-xs text-[var(--color-muted)]">
      <span>
        {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={15} />
        </Button>
        <span className="px-2 tabular-nums">
          {page} / {last}
        </span>
        <Button
          variant="ghost"
          size="sm"
          disabled={page >= last}
          onClick={() => onPage(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight size={15} />
        </Button>
      </div>
    </div>
  )
}
