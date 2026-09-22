import { useEffect, useRef, useState } from 'react'
import { apiGet } from '../lib/api'
import { resolveMediaUrl } from '../lib/env'

const DEBOUNCE_MS = 300
const EMPTY = { services: [], products: [] }

/**
 * Debounced, cancellable search against `GET /api/search`. Purely a thin
 * fetch layer — the backend is the single source of truth for what's
 * searchable (see App\Http\Controllers\Api\Public\SearchController), so a
 * newly created/edited/unpublished admin product is reflected here with no
 * frontend change.
 *
 * @param {string} query
 * @returns {{ results: {services: any[], products: any[]}, loading: boolean, error: Error|null }}
 */
export function useSearch(query) {
  const term = query.trim()
  const [state, setState] = useState({ results: EMPTY, loading: false, error: null })
  const debounceRef = useRef(0)

  useEffect(() => {
    // Nothing to fetch/clear via setState here — an empty term is handled by
    // the derived return below, without touching state at all.
    if (!term) return undefined

    const ctrl = new AbortController()

    debounceRef.current = window.setTimeout(() => {
      setState((prev) => ({ ...prev, loading: true, error: null }))
      apiGet('/search', { params: { q: term }, signal: ctrl.signal })
        .then((data) => {
          const products = (data?.products ?? []).map((p) => ({
            ...p,
            image_url: resolveMediaUrl(p.image_url),
          }))
          setState({ results: { services: data?.services ?? [], products }, loading: false, error: null })
        })
        .catch((err) => {
          if (err.name === 'AbortError') return
          setState({ results: EMPTY, loading: false, error: err })
        })
    }, DEBOUNCE_MS)

    return () => {
      clearTimeout(debounceRef.current)
      ctrl.abort()
    }
  }, [term])

  return term ? state : { results: EMPTY, loading: false, error: null }
}
