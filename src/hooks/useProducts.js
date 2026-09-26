import { useApiResource } from './useApi'
import { resolveMediaUrl } from '../lib/env'
import { photosOf } from '../lib/photos'

/**
 * Retail range for the /products page, from `GET /api/products` (active
 * products only). Never substitutes mock/demo products when the API is
 * unavailable or empty — callers render their own loading/error/empty state
 * from `loading`/`error`/`items.length` (see Products.jsx, ProductShowcase.jsx).
 *
 * Normalised to:
 *   { id, slug, name, category?, size?, family?, description, blurb, info?,
 *     image, images, mrp, sellingPrice, taxPercent, price, stock, gstInclusive, range?, audience? }
 *
 * `image` is the cover; `images` is every photo (up to four) in the order the
 * detail page shows them.
 *
 * `stock` is the live `stock_quantity` from the API (units available).
 *
 * `sellingPrice` and `price` are the same amount: what the customer pays per
 * unit, matching checkout. The product's tax % (`taxPercent`) is the tax already
 * inside that price, not something added on top.
 *
 * `size` is parsed from a trailing "— 250 ml" in the name when present, and
 * `family` groups the size variants of one product; both degrade to
 * undefined otherwise. `category`/`range`/`audience` aren't exposed by the
 * API yet, so they stay undefined for live data.
 */

const SIZE_RE = /(\d+(?:\.\d+)?)\s*(ml|l|g|kg)\b/i

/** '…— 250 ml' → '250 ML'. */
export function parseSize(name) {
  const m = String(name || '').match(SIZE_RE)
  return m ? `${m[1]} ${m[2].toUpperCase()}` : undefined
}

/** A comparable magnitude for a size label, so '250 ml' sorts before '1 L'. */
export function sizeRank(size = '') {
  const m = String(size).match(SIZE_RE)
  if (!m) return Number.MAX_SAFE_INTEGER
  const n = parseFloat(m[1])
  const unit = m[2].toLowerCase()
  return unit === 'l' || unit === 'kg' ? n * 1000 : n
}

const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

/** Product name with any trailing size token removed, e.g. 'Hair Shampoo'. */
function baseName(name) {
  return String(name || '')
    .replace(/\s*[—–-]\s*\d+(?:\.\d+)?\s*(ml|l|g|kg)\b.*$/i, '')
    .trim()
}

function transform(rows) {
  return (rows ?? []).map((row) => {
    const size = parseSize(row.name)
    const base = baseName(row.name)
    return {
      id: String(row.id),
      slug: row.slug || slugify(row.name),
      name: row.name,
      category: undefined,
      size,
      // Only claim a shared family when the name actually differs from its base
      // (i.e. it carries a size) — otherwise every product is its own family.
      family: size && base ? slugify(base) : slugify(row.slug || row.name),
      description: row.description || '',
      blurb: row.description || '',
      info: row.description || '',
      image: resolveMediaUrl(row.image_url),
      images: photosOf(row),
      mrp: row.mrp ?? null,
      sellingPrice: row.selling_price ?? null,
      taxPercent: Number(row.tax_percent ?? 0),
      price: row.selling_price ?? null,
      gstInclusive: row.gst_inclusive ?? null,
      stock: row.stock_quantity == null ? null : Number(row.stock_quantity),
      featured: Boolean(row.is_featured),
      range: undefined,
      audience: undefined,
    }
  })
}

export function useProducts() {
  const { data, loading, error, reload } = useApiResource('/products', {
    transform,
  })

  return { items: data ?? [], loading, error, reload }
}
