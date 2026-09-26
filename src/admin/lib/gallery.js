import { resolveMediaUrl } from '../../lib/env'

/**
 * The list behind a product's / combo's photo manager (see ImageGalleryInput):
 *   { key, kind: 'existing', id, url }     a photo already saved on the server
 *   { key, kind: 'new', file, url }        a picked file, previewed locally, saved on submit
 * The first one is the cover; the order is the order the shop's detail page shows.
 */

/** Photos one product / combo can have — keep in step with App\Support\GalleryImages::MAX. */
export const MAX_IMAGES = 4

/** The starting list for a form, from the `images` a product / combo comes with. */
export function galleryFromServer(images) {
  return (images ?? []).map((image) => ({
    key: `e${image.id}`,
    kind: 'existing',
    id: image.id,
    url: resolveMediaUrl(image.url),
  }))
}

/**
 * Add the photo fields to a save request's FormData — none at all when the
 * photos weren't touched, so saving other changes can never disturb them.
 *   images[]       the new files
 *   image_order[]  the final line-up: "e:<id>" (keep) / "n:<index>" (the n-th new file)
 *   remove_image   when every photo was removed
 */
export function appendGalleryFields(formData, items, initialItems) {
  const unchanged =
    items.length === initialItems.length &&
    items.every((item, i) => item.kind === 'existing' && item.id === initialItems[i].id)

  if (unchanged) return

  if (items.length === 0) {
    formData.append('remove_image', '1')
    return
  }

  let newIndex = 0

  for (const item of items) {
    if (item.kind === 'new') {
      formData.append('images[]', item.file)
      formData.append('image_order[]', `n:${newIndex++}`)
    } else {
      formData.append('image_order[]', `e:${item.id}`)
    }
  }
}

/** The first validation message the API sent about the photos, if any. */
export function galleryError(fieldErrors) {
  const key = Object.keys(fieldErrors ?? {}).find(
    (k) => k === 'image' || k === 'images' || k.startsWith('images.') || k.startsWith('image_order'),
  )

  return key ? fieldErrors[key] : null
}
