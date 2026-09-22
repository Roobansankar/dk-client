import { createContext, useContext } from 'react'
import { useGallery } from '../hooks/useGallery'

/**
 * Shares one `GET /api/gallery` fetch across the whole site — the homepage
 * gallery preview and the /gallery page read the same set instead of each
 * fetching it (and re-fetching it on every navigation). Mirrors
 * CatalogueContext / StylistsContext.
 *
 * The fetch lifecycle and error handling all still live in the useGallery
 * hook — this only lifts the single call to app scope.
 */

const GalleryContext = createContext(null)

export function GalleryProvider({ children }) {
  const value = useGallery()
  return <GalleryContext.Provider value={value}>{children}</GalleryContext.Provider>
}

/** { items, loading, error } — items is never null. */
export function useGalleryImages() {
  const ctx = useContext(GalleryContext)
  if (!ctx) throw new Error('useGalleryImages must be used within GalleryProvider')
  return ctx
}
