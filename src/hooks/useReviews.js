import { useApiResource } from './useApi'
import { resolveMediaUrl } from '../lib/env'

/**
 * Homepage reviews, from `GET /api/reviews` (published, manually admin-entered
 * Google reviews — no scraping/sync). Never substitutes sample/placeholder
 * reviews when the API is unavailable or nothing is published yet — callers
 * render their own loading/error/empty state (see CustomerReviews.jsx).
 *
 * Normalised to: { id, quote, name, context, rating, avatarUrl }
 */

function formatMonthYear(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function transform(rows) {
  return (rows ?? []).map((row) => ({
    id: String(row.id),
    quote: row.review_text,
    name: row.reviewer_name,
    context: formatMonthYear(row.review_date),
    rating: row.rating,
    avatarUrl: resolveMediaUrl(row.reviewer_avatar_url),
  }))
}

export function useReviews() {
  const { data, loading, error, reload } = useApiResource('/reviews', {
    transform,
    revalidateOnFocus: true,
  })

  return { items: data ?? [], loading, error, reload }
}
