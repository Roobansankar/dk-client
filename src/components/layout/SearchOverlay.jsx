import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { useSearch } from '../../hooks/useSearch'

const GENDER_LABEL = { male: 'Men', female: 'Women', unisex: 'Unisex' }

/**
 * Global search — services + products, read live from the database via
 * GET /api/search (see useSearch.js / SearchController). No hardcoded
 * catalogue anywhere here: whatever the API returns is what renders, so a
 * brand-new admin product is searchable immediately with zero frontend change.
 *
 * Deliberately compact — a small anchored panel under the navbar (like a
 * command palette), not a full-screen takeover: a fixed-width card with its
 * own internal scroll region, so it never covers most of the page on desktop
 * or mobile. Opened from the search icon in the navbar (desktop bar or
 * mobile drawer — see Navbar.jsx).
 *
 * Two services can legitimately share a name (the catalogue models most
 * services once per gender-specific category — e.g. a men's and a women's
 * "Hair Spa" are two real, separately bookable rows). Rather than
 * deduplicating — which would hide one of two genuinely different bookable
 * services — each result shows its category and gender so the two are never
 * visually indistinguishable.
 */
export default function SearchOverlay({ open, onClose }) {
  const [query, setQuery] = useState('')
  const { results, loading, error } = useSearch(query)
  const inputRef = useRef(null)

  // Reset the query on the transition into "open", so reopening starts fresh
  // — the React-endorsed "adjust state during render" pattern (same one
  // useEditableCopy uses) rather than a setState-in-effect.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setQuery('')
  }

  useEffect(() => {
    if (!open) return undefined
    inputRef.current?.focus()
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  if (!open) return null

  const term = query.trim()
  const hasResults = results.services.length > 0 || results.products.length > 0
  const showNoResults = term && !loading && !error && !hasResults

  return (
    <div className="fixed inset-0 z-[60]">
      <button
        type="button"
        aria-label="Close search"
        tabIndex={-1}
        className="absolute inset-0 h-full w-full cursor-default border-0 bg-ink/30 p-0"
        onClick={onClose}
      />

      <div className="pointer-events-none absolute inset-x-0 top-16 flex justify-center px-4 sm:top-20">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Search"
          className="pointer-events-auto flex w-full max-w-md flex-col overflow-hidden rounded-[var(--radius-lg,0.75rem)] border border-line bg-surface shadow-xl"
        >
          <div className="flex shrink-0 items-center gap-2 border-b border-line px-3.5 py-2.5">
            <Search size={16} className="shrink-0 text-muted" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search services and products…"
              aria-label="Search services and products"
              className="w-full bg-transparent py-1 text-sm text-ink placeholder:text-muted focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="btn-ghost -m-1 shrink-0 rounded p-1.5 text-muted hover:text-ink"
              >
                <X size={14} aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close search"
              className="btn-ghost -m-1 shrink-0 rounded p-1.5 text-muted hover:text-ink sm:hidden"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          <div className="max-h-[60svh] overflow-y-auto overscroll-contain p-2">
            {!term && (
              <p className="px-2.5 py-3 text-sm text-muted">
                Start typing to search services and products.
              </p>
            )}

            {loading && <p className="px-2.5 py-3 text-sm text-muted">Searching…</p>}

            {error && !loading && (
              <p className="px-2.5 py-3 text-sm text-ink">
                We couldn’t reach the server. Please try again.
              </p>
            )}

            {showNoResults && (
              <p className="px-2.5 py-3 text-sm text-muted">
                No results for “{term}”. Try a different search.
              </p>
            )}

            {!loading && !error && results.services.length > 0 && (
              <div>
                <p className="px-2.5 pb-1 pt-2 text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-muted">
                  Services
                </p>
                <ul>
                  {results.services.map((service) => (
                    <li key={service.id}>
                      <Link
                        to="/services"
                        onClick={onClose}
                        className="flex min-h-11 items-center justify-between gap-3 rounded-[var(--radius-sm,0.25rem)] px-2.5 py-2 no-underline hover:bg-surface-sunken"
                      >
                        <span className="min-w-0 truncate text-sm text-ink">{service.name}</span>
                        <span className="shrink-0 text-xs text-muted">
                          {service.category?.name}
                          {GENDER_LABEL[service.gender] ? ` · ${GENDER_LABEL[service.gender]}` : ''}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!loading && !error && results.products.length > 0 && (
              <div>
                <p className="px-2.5 pb-1 pt-2 text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-muted">
                  Products
                </p>
                <ul>
                  {results.products.map((product) => (
                    <li key={product.id}>
                      <Link
                        to={`/products/${product.slug}`}
                        onClick={onClose}
                        className="flex min-h-11 items-center gap-3 rounded-[var(--radius-sm,0.25rem)] px-2.5 py-2 no-underline hover:bg-surface-sunken"
                      >
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt=""
                            className="h-8 w-8 shrink-0 rounded-sm border border-line object-cover"
                          />
                        ) : (
                          <span className="h-8 w-8 shrink-0 rounded-sm border border-line bg-surface-sunken" aria-hidden="true" />
                        )}
                        <span className="min-w-0 truncate text-sm text-ink">{product.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
