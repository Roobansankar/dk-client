import { useApiResource } from './useApi'
import { resolveMediaUrl } from '../lib/env'
import { photosOf } from '../lib/photos'

/**
 * Active combo products from `GET /api/combos`, normalised to:
 *   { id, slug, name, description, bundlePrice, taxPercent, image, images,
 *     items: [{ productId, name, image, price, sellingPrice, available }] }
 *
 * `price` is the combo-specific price of that product inside the combo — the
 * only price that applies to a combo selection. `sellingPrice` is the
 * product's normal shelf price, for reference only.
 */
function transform(rows) {
  return (rows ?? []).map((row) => ({
    id: String(row.id),
    slug: row.slug,
    name: row.name,
    description: row.description || '',
    bundlePrice: row.bundle_price ?? null,
    taxPercent: Number(row.tax_percent ?? 0),
    image: resolveMediaUrl(row.image_url),
    images: photosOf(row),
    items: (row.items ?? []).map((item) => ({
      productId: String(item.product_id),
      name: item.name,
      image: resolveMediaUrl(item.image_url),
      price: item.price ?? 0,
      sellingPrice: item.selling_price ?? null,
      stock: item.stock_quantity == null ? null : Number(item.stock_quantity),
      available: Boolean(item.available),
    })),
  }))
}

export function useCombos() {
  const { data, loading, error, reload } = useApiResource('/combos', {
    transform,
  })

  return { combos: data ?? [], loading, error, reload }
}
