import { createContext, useContext } from 'react'
import { useReviews } from '../hooks/useReviews'

/**
 * Shares one `GET /api/reviews` fetch across the site (currently just the
 * homepage's CustomerReviews section). Mirrors ProductsContext/useProducts.
 */

const ReviewsContext = createContext(null)

export function ReviewsProvider({ children }) {
  const value = useReviews()
  return <ReviewsContext.Provider value={value}>{children}</ReviewsContext.Provider>
}

/** { items, loading, error, reload } — items is never null. */
export function useReviewsContext() {
  const ctx = useContext(ReviewsContext)
  if (!ctx) throw new Error('useReviewsContext must be used within ReviewsProvider')
  return ctx
}
