import { resolveMediaUrl } from './env'

/**
 * A product's / combo's photos as ready-to-use URLs, in the order the detail
 * page shows them (the first is the cover). `row` is an API record with
 * `images: [{ id, url }]`; an older reply with only `image_url` still yields
 * that one photo, and no photo at all yields [].
 */
export function photosOf(row) {
  const photos = (row?.images ?? []).map((image) => resolveMediaUrl(image.url)).filter(Boolean)
  const cover = resolveMediaUrl(row?.image_url)

  return photos.length > 0 ? photos : cover ? [cover] : []
}
