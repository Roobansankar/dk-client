import { useApiResource } from './useApi'
import { resolveMediaUrl } from '../lib/env'

/**
 * Public service catalogue, from `GET /api/service-categories?with_services=1`.
 *
 * The backend keeps a separate category per gender (a "Hair" for women and a
 * "Hair" for men). The public site has always shown one unified menu with a
 * gender tag per service, so we merge the backend's gender-specific categories
 * by slug here — a data transform only, the UI is unchanged.
 *
 * Never substitutes a mock/sample menu when the API is unavailable or empty —
 * callers render their own loading/error/empty state from
 * `loading`/`error`/`categories.length` (see Services.jsx, Booking.jsx).
 *
 * Shape returned per category:
 *   { id, name, summary, image, genders: ['women'|'men'...], services: [Service] }
 * Shape per service:
 *   { id, categoryId, backendGender, genders, name, description,
 *     durationMin, priceInr, advancePercentage, advanceAmount }
 */

const BACKEND_GENDER_TO_PUBLIC = { male: 'men', female: 'women' }

function mergeApiCategories(apiCategories) {
  const bySlug = new Map()

  for (const cat of apiCategories ?? []) {
    const publicGender = BACKEND_GENDER_TO_PUBLIC[cat.gender] ?? 'unisex'

    let merged = bySlug.get(cat.slug)
    if (!merged) {
      merged = {
        id: cat.slug,
        name: cat.name,
        summary: cat.description || '',
        image: resolveMediaUrl(cat.image_url),
        type: cat.category_type || null,
        _genders: new Set(),
        services: [],
      }
      bySlug.set(cat.slug, merged)
    }
    if (!merged.summary && cat.description) merged.summary = cat.description
    if (!merged.image && cat.image_url) merged.image = resolveMediaUrl(cat.image_url)
    if (!merged.type && cat.category_type) merged.type = cat.category_type

    for (const svc of cat.services ?? []) {
      merged._genders.add(publicGender)
      merged.services.push({
        id: svc.id,
        categoryId: cat.id,
        backendGender: cat.gender,
        genders: [publicGender],
        name: svc.name,
        description: svc.description || '',
        durationMin: svc.duration_minutes ?? null,
        priceInr: svc.price ?? null,
        advancePercentage: svc.advance_percentage ?? 0,
        advanceAmount: svc.advance_amount ?? 0,
      })
    }
  }

  return [...bySlug.values()].map(({ _genders, ...rest }) => ({
    ...rest,
    genders: ['women', 'men', 'unisex'].filter((g) => _genders.has(g)),
  }))
}

export function useServiceCatalogue() {
  const { data, loading, error, reload } = useApiResource(
    '/service-categories?with_services=1',
    { transform: mergeApiCategories, revalidateOnFocus: true },
  )

  return {
    categories: data ?? [],
    loading,
    error,
    reload,
  }
}
