import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'

/**
 * Minimal data-fetching hook for GET endpoints.
 *
 * Returns { data, meta, error, loading, refetching, refetch } plus any extra
 * top-level keys the endpoint returns via ->additional() (e.g. `summary`).
 * `deps` re-run the request; `params` are serialised into the query string.
 * Not a cache — deliberately simple. Mutations call refetch().
 *
 * `revalidateOnFocus` opts a query into a silent re-fetch (current params kept)
 * when the tab becomes visible again, the window regains focus, or the page is
 * restored from the bfcache — so data another actor changed shows up without a
 * manual reload. It is event-driven, not interval polling.
 *
 * `pollIntervalMs` adds a light interval re-fetch on top of that, for the rare
 * view where the "other actor" is a customer paying on their own device right
 * now — refocus alone can't catch that, since the admin's tab was never
 * unfocused. Skips the tick while the tab is hidden; use sparingly (currently
 * just Admin → Payments & Completed, per that page's auto-update requirement).
 */
export function useQuery(
  path,
  { params, deps = [], enabled = true, revalidateOnFocus = false, pollIntervalMs = 0 } = {},
) {
  const [state, setState] = useState({
    data: null,
    meta: null,
    extra: {},
    error: null,
    loading: enabled,
    refetching: false,
  })
  const abortRef = useRef(null)
  const key = JSON.stringify({ path, params })

  const run = useCallback(
    async ({ silent } = {}) => {
      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl
      setState((s) => ({
        ...s,
        loading: silent ? s.loading : !s.data,
        refetching: silent || !!s.data,
        error: null,
      }))
      try {
        const res = await api.get(path, { params, signal: ctrl.signal })
        const { data, meta, links: _links, ...extra } = res
        void _links
        setState({ data, meta, extra, error: null, loading: false, refetching: false })
      } catch (err) {
        if (err.name === 'AbortError') return
        setState((s) => ({ ...s, error: err, loading: false, refetching: false }))
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  )

  useEffect(() => {
    if (!enabled) {
      setState((s) => ({ ...s, loading: false }))
      return undefined
    }
    run()
    return () => abortRef.current?.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, ...deps])

  useEffect(() => {
    if (!enabled || !revalidateOnFocus) return undefined
    const onVisible = () => {
      if (document.visibilityState === 'visible') run({ silent: true })
    }
    const onPageShow = (event) => {
      if (event.persisted) run({ silent: true })
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    window.addEventListener('pageshow', onPageShow)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [key, enabled, revalidateOnFocus, run])

  useEffect(() => {
    if (!enabled || !pollIntervalMs) return undefined
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') run({ silent: true })
    }, pollIntervalMs)
    return () => clearInterval(id)
  }, [key, enabled, pollIntervalMs, run])

  return { ...state, ...state.extra, refetch: () => run({ silent: true }) }
}
