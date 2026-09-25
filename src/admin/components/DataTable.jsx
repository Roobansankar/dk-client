import { Fragment, useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
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
 * A leading S.No column is rendered by default (`showSerial`); pass
 * `serialFrom={meta?.from ?? 1}` so numbering continues across pages.
 *
 * Pass `renderExpanded={(row) => node}` to give every row a chevron that
 * reveals `node` in a full-width row beneath it (e.g. a combo's products).
 */
export function DataTable({
  columns,
  rows,
  rowKey = (r) => r.id,
  loading,
  empty,
  onRowClick,
  refetching,
  showSerial = true,
  serialFrom = 1,
  renderExpanded,
}) {
  const [openKeys, setOpenKeys] = useState(() => new Set())
  const expandable = typeof renderExpanded === 'function'
  const wrapRef = useRef(null)

  // The table can be wider than its scroll container (phones). Publish the
  // visible width so an expanded row's content can stay pinned inside it.
  useEffect(() => {
    const el = wrapRef.current
    if (!expandable || !el) return undefined
    const publish = () => el.style.setProperty('--dt-w', `${el.clientWidth}px`)
    publish()
    const ro = new ResizeObserver(publish)
    ro.observe(el)
    return () => ro.disconnect()
  }, [expandable, loading, rows?.length])

  if (loading)
    return <TableSkeleton columns={columns} showSerial={showSerial} expandable={expandable} />
  if (!rows?.length) return empty ?? null

  const toggle = (key) =>
    setOpenKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  const colSpan = columns.length + (showSerial ? 1 : 0) + (expandable ? 1 : 0)

  return (
    <div ref={wrapRef} className="relative overflow-x-auto">
      {refetching && (
        <span className="absolute inset-x-0 top-0 h-0.5 overflow-hidden">
          <span className="block h-full w-1/3 animate-[indeterminate_1.1s_ease-in-out_infinite] bg-[var(--color-accent)]" />
        </span>
      )}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--color-line)] text-left">
            {expandable && (
              <th className="w-10 px-2 py-3">
                <span className="sr-only">Show or hide details</span>
              </th>
            )}
            {showSerial && (
              <th
                className="w-14 whitespace-nowrap px-3 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-[var(--color-faint)] tabular-nums"
                aria-label="Serial number"
              >
                S.No
              </th>
            )}
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
          {rows.map((row, i) => {
            const key = rowKey(row)
            const isOpen = expandable && openKeys.has(key)
            return (
            <Fragment key={key}>
            <tr
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                'border-b border-[var(--color-line)] last:border-0 transition-colors',
                isOpen && 'border-b-0',
                onRowClick &&
                  'cursor-pointer hover:bg-[var(--color-surface-hover)] focus-within:bg-[var(--color-surface-hover)]',
              )}
            >
              {expandable && (
                <td className="w-10 px-2 py-3.5 align-middle">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-label={isOpen ? 'Hide details' : 'Show details'}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggle(key)
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-ink)]"
                  >
                    <ChevronDown
                      size={16}
                      aria-hidden="true"
                      className={cn('transition-transform duration-200', isOpen && 'rotate-180')}
                    />
                  </button>
                </td>
              )}
              {showSerial && (
                <td className="px-3 py-3.5 align-middle font-medium text-[var(--color-muted)] tabular-nums">
                  {serialFrom + i}
                </td>
              )}
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
            {isOpen && (
              <tr className="border-b border-[var(--color-line)] last:border-0">
                <td colSpan={colSpan} className="px-3 pb-4 pt-0">
                  <div
                    className="sticky"
                    style={{ left: '0.75rem', width: 'calc(var(--dt-w, 100%) - 1.5rem)' }}
                  >
                    {renderExpanded(row)}
                  </div>
                </td>
              </tr>
            )}
            </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function TableSkeleton({ columns, showSerial = true, expandable = false, rows = 6 }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--color-line)] text-left">
            {expandable && <th className="w-10 px-2 py-3" />}
            {showSerial && (
              <th className="w-14 whitespace-nowrap px-3 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-[var(--color-faint)] tabular-nums">
                S.No
              </th>
            )}
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
              {expandable && <td className="w-10 px-2 py-3.5" />}
              {showSerial && (
                <td className="px-3 py-3.5">
                  <span
                    className="block h-3 rounded-full bg-[var(--color-surface-sunken)]"
                    style={{
                      width: '1.5rem',
                      animation: 'skeleton 1.4s ease-in-out infinite',
                      animationDelay: `${r * 60}ms`,
                    }}
                  />
                </td>
              )}
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
