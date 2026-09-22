import { createContext, useContext } from 'react'
import { useServiceCatalogue } from '../hooks/useServiceCatalogue'

/**
 * Shares one `/service-categories` fetch across the whole site — the footer,
 * the homepage services preview, the /services menu and the booking form all
 * read the same catalogue instead of each fetching it.
 */

const CatalogueContext = createContext(null)

export function CatalogueProvider({ children }) {
  const value = useServiceCatalogue()
  return <CatalogueContext.Provider value={value}>{children}</CatalogueContext.Provider>
}

/** { categories, loading, error, reload } */
export function useCatalogue() {
  const ctx = useContext(CatalogueContext)
  if (!ctx) throw new Error('useCatalogue must be used within CatalogueProvider')
  return ctx
}
