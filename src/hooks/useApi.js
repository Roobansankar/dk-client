import { useCallback, useEffect, useState } from 'react'
import { apiGet } from '../lib/api'

/** GET requests currently on the wire, by path. */
const inFlight = new Map()

/**
 * `apiGet`, but callers asking for the same path while it is still loading
 * share ONE request. React StrictMode (development) mounts every component
 * twice; without this each load was sent, cancelled and sent again — the red
 * "(canceled)" rows in the Network tab — and two components wanting the same
 * resource paid for it twice.
 */
function sharedGet(path) {
  let request = inFlight.get(path)

  if (!request) {
    request = apiGet(path).finally(() => {
      if (inFlight.get(path) === request) inFlight.delete(path)
    })
    inFlight.set(path, request)
  }

  return request
}

/**
 * Fetch a public GET resource once on mount.
 *
 * Never substitutes mock/static content for real API data: `data` is `null`
 * until a request actually succeeds, whether that's because it's still
 * loading or because it failed (network down, backend unavailable, etc.) —
 * callers must render a skeleton while `loading`, a real error/empty state
 * when `!loading && !data`, and only ever the returned `data` on success. A
 * successful-but-empty response (`transform` returning `[]`) is preserved
 * exactly as returned — that's a legitimate empty state, not an error.
 *
 * With `revalidateOnFocus` the resource also silently re-fetches when the tab
 * becomes visible again or is restored from the bfcache — so data an admin
 * changed in another tab/window shows up without a manual reload. This is
 * event-driven (SWR-style), not interval polling.
 *
 * @template T
 * @param {string} path                     API path, e.g. '/gallery'
 * @param {{ transform?: (raw: any) => T, revalidateOnFocus?: boolean }} options
 * @returns {{ data: T|null, loading: boolean, error: Error|null, reload: () => void }}
 */
export function useApiResource(path, { transform, revalidateOnFocus = false } = {}) {
  const [state, setState] = useState({
    data: null,
    loading: true,
    error: null,
  })
  // Re-run when the caller asks (reload) — bumped, never read during render.
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    // Not aborted on cleanup: a stale result is simply ignored (`alive`), and
    // the request may still be wanted by the remount or by another component.
    let alive = true

    sharedGet(path)
      .then((raw) => {
        if (!alive) return
        const data = transform ? transform(raw) : raw
        setState({ data, loading: false, error: null })
      })
      .catch((err) => {
        if (!alive || err.name === 'AbortError') return
        // Never mask a failure with stand-in content — the caller renders
        // its own error/empty state from `error`/`data === null`.
        setState({ data: null, loading: false, error: err })
      })

    return () => {
      alive = false
    }
    // `transform` is a stable module-level value by contract.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, nonce])

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  useEffect(() => {
    if (!revalidateOnFocus) return undefined
    const revalidate = () => {
      if (document.visibilityState === 'visible') reload()
    }
    const onPageShow = (event) => {
      if (event.persisted) reload()
    }
    document.addEventListener('visibilitychange', revalidate)
    window.addEventListener('focus', revalidate)
    window.addEventListener('pageshow', onPageShow)
    return () => {
      document.removeEventListener('visibilitychange', revalidate)
      window.removeEventListener('focus', revalidate)
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [revalidateOnFocus, reload])

  return { ...state, reload }
}
