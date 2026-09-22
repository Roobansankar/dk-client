import { createContext, useContext } from 'react'
import { useVideos } from '../hooks/useVideos'

/**
 * Shares one `GET /api/videos` fetch across the whole site. Mirrors
 * GalleryContext / CatalogueContext / StylistsContext exactly.
 */

const VideoContext = createContext(null)

export function VideoProvider({ children }) {
  const value = useVideos()
  return <VideoContext.Provider value={value}>{children}</VideoContext.Provider>
}

/** { items, loading, error } — items is never null. */
export function useHomepageVideos() {
  const ctx = useContext(VideoContext)
  if (!ctx) throw new Error('useHomepageVideos must be used within VideoProvider')
  return ctx
}
