import { createContext, useContext } from 'react'
import { useProducts } from '../hooks/useProducts'

/**
 * Shares one `GET /api/products` fetch across the whole site — the homepage
 * product showcase, the /products shelf and the /products/:slug detail page all
 * read the same list instead of each fetching it (and re-fetching it on every
 * navigation). Mirrors CatalogueContext / StylistsContext.
 *
 * The fetch lifecycle and error handling all still live in the useProducts
 * hook — this only lifts the single call to app scope.
 */

const ProductsContext = createContext(null)

export function ProductsProvider({ children }) {
  const value = useProducts()
  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>
}

/** { items, loading, error, reload } — items is never null. */
export function useProductCatalogue() {
  const ctx = useContext(ProductsContext)
  if (!ctx) throw new Error('useProductCatalogue must be used within ProductsProvider')
  return ctx
}
