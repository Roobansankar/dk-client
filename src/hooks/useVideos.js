import { useApiResource } from './useApi'
import { resolveMediaUrl } from '../lib/env'

/**
 * Public homepage videos, from `GET /api/videos` (active videos only,
 * ordered). Mirrors useGallery exactly — never substitutes placeholder
 * videos; callers render their own loading/error/empty state from
 * `loading`/`error`/`items.length` (see VideoMarquee.jsx).
 *
 * Returns items shaped `{ id, src, poster, title }`.
 */

function transform(rows) {
  return (rows ?? []).map((row) => ({
    id: String(row.id),
    src: resolveMediaUrl(row.video_url),
    poster: resolveMediaUrl(row.thumbnail_url),
    title: row.title || '',
  }))
}

export function useVideos() {
  const { data, loading, error } = useApiResource('/videos', {
    transform,
  })

  return { items: data ?? [], loading, error }
}
