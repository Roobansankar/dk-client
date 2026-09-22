import { useApiResource } from './useApi'
import { resolveMediaUrl } from '../lib/env'

/**
 * Public gallery images, from `GET /api/gallery` (active images only, ordered).
 * Never substitutes placeholder images when the API is unavailable or
 * empty — callers render their own loading/error/empty state from
 * `loading`/`error`/`items.length` (see Gallery.jsx, GalleryPreview.jsx).
 *
 * Note: Gallery.jsx separately falls back to a bundled sample set in the
 * narrower case where the API DID return real rows but every one of their
 * image files fails to load (e.g. a missing storage symlink) — a different
 * failure mode from "backend unavailable", handled there, not here.
 *
 * Returns items shaped `{ id, src, alt }` — the shape the Gallery route expects.
 */

function transform(rows) {
  return (rows ?? []).map((row) => ({
    id: String(row.id),
    src: resolveMediaUrl(row.image_url),
    alt: row.alt_text || row.title || '',
  }))
}

export function useGallery() {
  const { data, loading, error } = useApiResource('/gallery', { transform })

  return { items: data ?? [], loading, error }
}
