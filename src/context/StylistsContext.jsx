import { createContext, useContext } from 'react'
import { useApiResource } from '../hooks/useApi'
import { resolveMediaUrl } from '../lib/env'

/**
 * Shares one `GET /api/stylists` fetch across the site — the booking form and
 * the homepage "Meet the team" section both read it. Never substitutes a
 * placeholder roster: a loading/failed/empty request just means `stylists` is
 * `[]`, and callers render their own loading/error/empty state (see
 * MeetTheTeam.jsx, Booking.jsx).
 */

const EMPTY = []

/** Only `image_url` needs normalising — every other field passes through as-is. */
function transform(rows) {
  return (rows ?? []).map((row) => ({ ...row, image_url: resolveMediaUrl(row.image_url) }))
}

const StylistsContext = createContext({ stylists: EMPTY, loading: true, error: null })

export function StylistsProvider({ children }) {
  const { data, loading, error } = useApiResource('/stylists', { transform })
  return (
    <StylistsContext.Provider value={{ stylists: data ?? EMPTY, loading, error }}>
      {children}
    </StylistsContext.Provider>
  )
}

/** { stylists, loading, error } — stylists is never null. */
export function useStylists() {
  return useContext(StylistsContext)
}
