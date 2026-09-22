import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'

/**
 * The signed-in customer's own appointment history, from
 * `GET /account/appointments` — shared by Account.jsx's history list and its
 * profile summary stats, so both read from one fetch instead of two.
 */
export function useAccountAppointments() {
  const [state, setState] = useState({ loading: true, error: null, items: [] })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const ctrl = new AbortController()
    let alive = true
    api
      .get('/account/appointments', { params: { per_page: 50 }, signal: ctrl.signal })
      .then(({ data }) => {
        if (!alive) return
        setState({ loading: false, error: null, items: data || [] })
      })
      .catch((err) => {
        if (!alive || err.name === 'AbortError') return
        setState((s) => ({ ...s, loading: false, error: err }))
      })
    return () => {
      alive = false
      ctrl.abort()
    }
  }, [reloadKey])

  const refetch = useCallback(() => setReloadKey((k) => k + 1), [])

  return { ...state, refetch }
}
