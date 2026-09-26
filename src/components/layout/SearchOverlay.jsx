import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import Container from './Container'
import { useSearch } from '../../hooks/useSearch'

const GENDER_LABEL = { male: 'Men', female: 'Women', unisex: 'Unisex' }

/**
 * Global search — services + products, read live from the database via
 * GET /api/search (see useSearch.js / SearchController). No hardcoded
 * catalogue anywhere here: whatever the API returns is what renders, so a
 * brand-new admin product is searchable immediately with zero frontend change.
 *
 * Full-page takeover, kept simple: a plain input bar on top and grouped
 * result lists below. Opened from the search icon in the navbar (desktop
 * bar or mobile drawer — see Navbar.jsx).
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
    <div className="fixed inset-0 z-[60] flex flex-col bg-surface">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="shrink-0 border-b border-line">
          <Container className="flex h-16 items-center gap-2">
            <Search size={18} className="shrink-0 text-muted" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search services and products…"
              aria-label="Search services and products"
              className="w-full bg-transparent text-base text-ink placeholder:text-muted focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="shrink-0 rounded p-2 text-muted transition-colors hover:text-ink"
              >
                <X size={16} aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close search"
              className="shrink-0 rounded p-2 text-muted transition-colors hover:text-ink"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </Container>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <Container className="max-w-2xl py-6">
            {!term && (
              <p className="py-4 text-center text-sm text-muted">
                Start typing to search services and products.
              </p>
            )}

            {loading && (
              <p className="py-4 text-center text-sm text-muted">Searching…</p>
            )}

            {error && !loading && (
              <p className="py-4 text-center text-sm text-ink">
                We couldn’t reach the server. Please try again.
              </p>
            )}

            {showNoResults && (
              <p className="py-4 text-center text-sm text-muted">
                No results for “{term}”. Try a different search.
              </p>
            )}

            {!loading && !error && results.services.length > 0 && (
              <div>
                <p className="px-1 pb-1 pt-2 text-xs font-medium uppercase tracking-[0.14em] text-muted">
                  Services
                </p>
                <ul className="divide-y divide-line border-y border-line">
                  {results.services.map((service) => (
                    <li key={service.id}>
                      <Link
                        to="/services"
                        onClick={onClose}
                        className="flex items-center justify-between gap-3 px-1 py-3 no-underline transition-colors hover:bg-surface-sunken"
                      >
                        <span className="min-w-0 truncate text-sm text-ink">
                          {service.name}
                        </span>
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
              <div className="mt-6">
                <p className="px-1 pb-1 pt-2 text-xs font-medium uppercase tracking-[0.14em] text-muted">
                  Products
                </p>
                <ul className="divide-y divide-line border-y border-line">
                  {results.products.map((product) => (
                    <li key={product.id}>
                      <Link
                        to={`/products/${product.slug}`}
                        onClick={onClose}
                        className="flex items-center gap-3 px-1 py-3 no-underline transition-colors hover:bg-surface-sunken"
                      >
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt=""
                            className="h-9 w-9 shrink-0 rounded border border-line object-cover"
                          />
                        ) : (
                          <span
                            className="h-9 w-9 shrink-0 rounded border border-line bg-surface-sunken"
                            aria-hidden="true"
                          />
                        )}
                        <span className="min-w-0 truncate text-sm text-ink">
                          {product.name}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Container>
        </div>
      </div>
    </div>
  )
}
