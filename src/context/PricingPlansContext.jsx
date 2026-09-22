import { createContext, useContext } from 'react'
import { usePricingPlans } from '../hooks/usePricingPlans'

/**
 * Shares one `GET /api/pricing-plans` fetch across the whole site — currently
 * the homepage "Combo Offers" section, but any future packages/pricing view
 * reads the same list instead of each fetching it (and re-fetching on every
 * navigation). Mirrors ProductsContext / GalleryContext / CatalogueContext.
 *
 * The fetch lifecycle, focus revalidation and error handling all live in the
 * usePricingPlans hook — this only lifts the single call to app scope.
 */

const PricingPlansContext = createContext(null)

export function PricingPlansProvider({ children }) {
  const value = usePricingPlans()
  return (
    <PricingPlansContext.Provider value={value}>{children}</PricingPlansContext.Provider>
  )
}

/** { plans, loading, error, reload } — plans is never null. */
export function usePricingPlanList() {
  const ctx = useContext(PricingPlansContext)
  if (!ctx) throw new Error('usePricingPlanList must be used within PricingPlansProvider')
  return ctx
}
