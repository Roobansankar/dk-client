/**
 * DK StyleHub retail range.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ⚠️ FRONTEND FALLBACK / DEMO RANGE ONLY
 * DK StyleHub is a studio, not a shop — there is no cart or checkout. Products
 * are served by `GET /api/products`; this file is the graceful fallback the
 * `/products` page renders when the API returns nothing (e.g. a clean database
 * during frontend development). These entries are NOT written to the database.
 * When real API products exist, they are shown instead. See src/hooks/useProducts.js.
 *
 * The shape here is a superset of the API resource: it adds `category`, `size`
 * and `family` (used to group size variants of the same product) which the API
 * does not currently expose. Real API products simply omit those and the UI
 * degrades gracefully.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * @typedef {Object} Product
 * @property {string} id
 * @property {string} slug              route segment for /products/:slug
 * @property {string} name
 * @property {string} [category]        e.g. 'Shampoo' — real product metadata
 * @property {string} [size]            e.g. '250 ml' — real product metadata
 * @property {string} [family]          shared key for size variants of one product
 * @property {string} blurb             one restrained line (maps to `description`)
 * @property {string} [info]            a longer paragraph for the detail page
 * @property {number|null} mrp          list price (₹), or null
 * @property {number|null} sellingPrice studio price (₹), or null
 * @property {boolean|null} gstInclusive
 * @property {boolean} [featured]       fallback-only flag for the featured moment
 * @property {'hair-care'|'skin-care'|'styling'} range
 * @property {'women'|'men'|'unisex'} audience
 * @property {string|null} image        real image URL when available, else null
 */

export const PRODUCTS_ARE_PLACEHOLDER = true

/** Retail ranges, in display order. Labels are shown verbatim in the filter. */
export const productRanges = [
  { value: 'hair-care', label: 'Hair Care' },
  { value: 'skin-care', label: 'Skin Care' },
  { value: 'styling', label: 'Styling' },
]

/** Who a product is grouped for. */
export const productAudiences = [
  { value: 'women', label: 'Women' },
  { value: 'men', label: 'Men' },
  { value: 'unisex', label: 'Unisex' },
]

/**
 * Generic, unbranded beauty/product photography for the demo range only
 * (Unsplash CDN — warm-toned amber glass and clean bottles that suit the
 * DK palette). These are placeholders: `ProductImage` falls back to the quiet
 * DK panel if a URL ever fails to load.
 */
const U = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1000&q=80`
const IMG = {
  bottles: U('1631729371254-42c2892f0e6e'), // clean white bottles
  dropperWood: U('1608571423902-eed4a5ad8108'), // amber dropper on a wooden stand
  dropperLeaf: U('1617897903246-719242758050'), // amber dropper with eucalyptus
  vials: U('1602928321679-560bb453f190'), // amber apothecary vials
  amberDark: U('1631730359585-38a4935cbec4'), // amber bottles, warm dark ground
}

/**
 * Build the four standard size variants of a wash/care product. Each variant is
 * its own record (mirroring how the backend models products) and shares a
 * `family` key so the detail page can cross-link the sizes.
 */
function sizeVariants({ family, base, category, blurb, info, range, audience, image, prices }) {
  const SIZES = [
    { size: '100 ml', key: '100ml' },
    { size: '250 ml', key: '250ml' },
    { size: '500 ml', key: '500ml' },
    { size: '1 L', key: '1l' },
  ]
  return SIZES.filter((s) => prices[s.key]).map((s) => {
    const p = prices[s.key]
    return {
      id: `${family}-${s.key}`,
      slug: `${family}-${s.key}`,
      name: `${base} — ${s.size}`,
      category,
      size: s.size,
      family,
      blurb,
      info,
      mrp: p.mrp ?? null,
      sellingPrice: p.price,
      gstInclusive: true,
      range,
      audience,
      image,
    }
  })
}

/** @type {Product[]} */
export const products = [
  ...sizeVariants({
    family: 'hair-shampoo',
    base: 'Hair Shampoo',
    category: 'Shampoo',
    blurb: 'A low-lather daily wash that respects colour and scalp.',
    info: 'A gentle sulphate-light cleanser for everyday use. Lifts product and oil without stripping colour, and rinses clean so styling sits the way it should. Suits most hair types; follow with the matching conditioner.',
    range: 'hair-care',
    audience: 'unisex',
    image: IMG.bottles,
    prices: {
      '100ml': { price: 420 },
      '250ml': { price: 720, mrp: 800 },
      '500ml': { price: 1150 },
      '1l': { price: 1980, mrp: 2200 },
    },
  }),
  ...sizeVariants({
    family: 'daily-conditioner',
    base: 'Daily Conditioner',
    category: 'Conditioner',
    blurb: 'Lightweight slip and shine without weighing hair down.',
    info: 'A daily conditioner that detangles and softens mid-lengths to ends while keeping roots light. Leave for a minute in the shower, then rinse. Pairs with Hair Shampoo for a complete wash routine.',
    range: 'hair-care',
    audience: 'unisex',
    image: IMG.bottles,
    prices: {
      '100ml': { price: 440 },
      '250ml': { price: 760 },
      '500ml': { price: 1220, mrp: 1350 },
      '1l': { price: 2100 },
    },
  }),
  {
    id: 'nourishing-hair-serum-100ml',
    slug: 'nourishing-hair-serum-100ml',
    name: 'Nourishing Hair Serum — 100 ml',
    category: 'Serum',
    size: '100 ml',
    family: 'nourishing-hair-serum',
    blurb: 'A few drops through damp lengths for softness and slip.',
    info: 'A weightless leave-in serum for dry or coarse lengths. Smooths the cuticle, tames flyaway and adds a soft shine without residue. Warm two or three drops between the palms and work through towel-dried hair.',
    mrp: 1450,
    sellingPrice: 1250,
    gstInclusive: false,
    // The fallback range keeps one item flagged so the "featured product moment"
    // still renders when the API is unavailable. Real API products drive this
    // from their `is_featured` column.
    featured: true,
    range: 'hair-care',
    audience: 'women',
    image: IMG.dropperWood,
  }, /* nourishing hair serum */
  {
    id: 'repair-hair-mask-250ml',
    slug: 'repair-hair-mask-250ml',
    name: 'Repair Hair Mask — 250 ml',
    category: 'Treatment',
    size: '250 ml',
    family: 'repair-hair-mask',
    blurb: 'A weekly treatment for lengths that feel dry or over-worked.',
    info: 'A rich weekly mask for hair that feels rough, porous or heat-tired. Leave for five to ten minutes on clean, damp hair, then rinse. Use in place of conditioner once or twice a week.',
    mrp: null,
    sellingPrice: 1180,
    gstInclusive: true,
    range: 'hair-care',
    audience: 'women',
    image: IMG.dropperLeaf,
  },
  {
    id: 'scalp-treatment-100ml',
    slug: 'scalp-treatment-100ml',
    name: 'Scalp Treatment — 100 ml',
    category: 'Treatment',
    size: '100 ml',
    family: 'scalp-treatment',
    blurb: 'A leave-in tonic to settle a tight, flaky or oily scalp.',
    info: 'A lightweight leave-in tonic that balances the scalp between washes. Section dry or damp hair, apply along the parting and massage in. Non-greasy, so it can be used daily.',
    mrp: null,
    sellingPrice: 1350,
    gstInclusive: true,
    range: 'hair-care',
    audience: 'unisex',
    image: IMG.vials,
  },
  {
    id: 'professional-styling-cream-250ml',
    slug: 'professional-styling-cream-250ml',
    name: 'Professional Styling Cream — 250 ml',
    category: 'Styling',
    size: '250 ml',
    family: 'professional-styling-cream',
    blurb: 'Pliable, medium hold with a natural, low-shine finish.',
    info: 'A salon styling cream for blow-dries and natural texture. Medium hold that stays workable, with a matte-to-soft finish. Emulsify a small amount and apply to damp or dry hair.',
    mrp: null,
    sellingPrice: 980,
    gstInclusive: true,
    range: 'styling',
    audience: 'unisex',
    image: IMG.vials,
  },
  {
    id: 'sea-salt-texture-spray-150ml',
    slug: 'sea-salt-texture-spray-150ml',
    name: 'Sea Salt Texture Spray — 150 ml',
    category: 'Styling',
    size: '150 ml',
    family: 'sea-salt-texture-spray',
    blurb: 'Effortless body and separation on air-dried hair.',
    info: 'A fine mist that adds grit and undone volume to fine or flat hair. Spray onto damp hair and scrunch, or onto dry hair for a quick refresh. Brushes out cleanly.',
    mrp: null,
    sellingPrice: 850,
    gstInclusive: true,
    range: 'styling',
    audience: 'unisex',
    image: IMG.dropperWood,
  },
  {
    id: 'smoothing-finishing-serum-100ml',
    slug: 'smoothing-finishing-serum-100ml',
    name: 'Smoothing Finishing Serum — 100 ml',
    category: 'Serum',
    size: '100 ml',
    family: 'smoothing-finishing-serum',
    blurb: 'A drop or two to calm frizz and add a clean, glassy shine.',
    info: 'A silicone-light finishing serum for the last step of a style. Controls frizz and halo, and adds a polished shine without weight. A little goes a long way on the surface of dry hair.',
    mrp: 1300,
    sellingPrice: 1150,
    gstInclusive: true,
    range: 'styling',
    audience: 'women',
    image: IMG.dropperLeaf,
  },
  {
    id: 'daily-facial-cleanser-150ml',
    slug: 'daily-facial-cleanser-150ml',
    name: 'Daily Facial Cleanser — 150 ml',
    category: 'Cleanser',
    size: '150 ml',
    family: 'daily-facial-cleanser',
    blurb: 'A soft gel wash that leaves skin comfortable, never tight.',
    info: 'A low-foam gel cleanser for morning and night. Removes sunscreen, sweat and light makeup while keeping the skin barrier comfortable. Suits normal to combination skin.',
    mrp: null,
    sellingPrice: 690,
    gstInclusive: true,
    range: 'skin-care',
    audience: 'unisex',
    image: IMG.dropperWood,
  },
  {
    id: 'hydrating-moisturiser-100ml',
    slug: 'hydrating-moisturiser-100ml',
    name: 'Hydrating Moisturiser — 100 ml',
    category: 'Moisturiser',
    size: '100 ml',
    family: 'hydrating-moisturiser',
    blurb: 'Everyday lightweight hydration for face and neck.',
    info: 'A daily gel-cream that hydrates without shine, so it sits well under sunscreen and makeup. Apply to clean skin morning and night.',
    mrp: null,
    sellingPrice: 1120,
    gstInclusive: true,
    range: 'skin-care',
    audience: 'unisex',
    image: IMG.vials,
  },
  {
    id: 'facial-sunscreen-spf-50-75ml',
    slug: 'facial-sunscreen-spf-50-75ml',
    name: 'Facial Sunscreen SPF 50 — 75 ml',
    category: 'Sun Care',
    size: '75 ml',
    family: 'facial-sunscreen-spf-50',
    blurb: 'A non-greasy finish that sits well under styling and makeup.',
    info: 'A broad-spectrum SPF 50 with a soft matte finish and no white cast. The daily last step of a skin routine — reapply through the day when you can.',
    mrp: 990,
    sellingPrice: 890,
    gstInclusive: false,
    range: 'skin-care',
    audience: 'unisex',
    image: IMG.dropperLeaf,
  },
]

/** Range label lookup, e.g. 'hair-care' -> 'Hair Care'. */
export const rangeLabel = (value) =>
  productRanges.find((r) => r.value === value)?.label ?? value

/** Audience label lookup, e.g. 'men' -> 'Men'. */
export const audienceLabel = (value) =>
  productAudiences.find((a) => a.value === value)?.label ?? value
