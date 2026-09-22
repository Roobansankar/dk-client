import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import clsx from 'clsx'
import Container from '../components/layout/Container'
import SegmentedFilter from '../components/ui/SegmentedFilter'
import FilterSelect from '../components/ui/FilterSelect'
import ProductCard from '../components/ui/ProductCard'
import ProductImage from '../components/ui/ProductImage'
import { Notice } from '../components/StateViews'
import { sizeRank } from '../hooks/useProducts'
import { useProductCatalogue } from '../context/ProductsContext'
import { formatInr } from '../data/services'
import {
  productRanges,
  productAudiences,
  rangeLabel,
} from '../data/products'
import quoteImage from '../assets/images/new-design/opt/studio-wide.jpg'
import closingImage from '../assets/images/new-design/opt/service-bridal.jpg'

const CONTACT = '/contact'

/** Shared hover-zoom for editorial imagery — disabled under reduced motion. */
const ZOOM =
  'transition-transform duration-[600ms] ease-[var(--ease-standard)] group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100'

/** Build an [All, …supported] option list from the values present in `items`. */
function buildOptions(items, key, catalogue) {
  const present = new Set(items.map((item) => item[key]))
  const supported = catalogue.filter((entry) => present.has(entry.value))
  return supported.length > 1
    ? [{ value: 'all', label: 'All' }, ...supported]
    : []
}

/** Whole-number saving, e.g. 950 → 855 ⇒ 10. */
function discountPct(mrp, sellingPrice) {
  if (!mrp || !sellingPrice || mrp <= sellingPrice) return 0
  return Math.round((1 - sellingPrice / mrp) * 100)
}

/**
 * Collapse size variants to one card per product family. The card shows the
 * size range and links to a representative variant, whose detail page carries
 * the full size selector. Products with no siblings pass through unchanged.
 */
function collapseFamilies(list) {
  const groups = new Map()
  for (const p of list) {
    const key = p.family || p.slug
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(p)
  }
  return [...groups.values()].map((variants) => {
    if (variants.length < 2) return variants[0]
    const ordered = [...variants].sort((a, b) => sizeRank(a.size) - sizeRank(b.size))
    const rep = ordered[Math.min(1, ordered.length - 1)] // 2nd smallest reads as the "default"
    const first = ordered[0].size
    const last = ordered[ordered.length - 1].size
    const prices = variants.map((v) => v.sellingPrice).filter((n) => n != null)
    return {
      ...rep,
      sizeLabel: first && last ? `${first} – ${last}` : rep.size,
      variantCount: variants.length,
      priceFrom: prices.length ? Math.min(...prices) : null,
    }
  })
}

/* -- Collection --------------------------------------------------------- */
/** Grid: 2 cards per row on mobile & tablet, exactly 3 from desktop — never 4. */
const CARD_GRID =
  'grid grid-cols-2 gap-x-4 gap-y-9 sm:gap-x-6 sm:gap-y-11 xl:grid-cols-3 xl:gap-x-7 xl:gap-y-12'

/** A titled run of product cards. */
function CollectionGroup({ label, count, products, className }) {
  return (
    <section className={className}>
      {label && (
        <div className="mb-8 flex items-baseline justify-between gap-4 border-t border-line pt-5 sm:mb-10">
          <p className="font-serif text-xl text-ink sm:text-2xl">{label}</p>
          <span className="text-[0.7rem] font-medium uppercase tracking-[0.14em] text-muted tabular-nums">
            {count} {count === 1 ? 'product' : 'products'}
          </span>
        </div>
      )}
      <ul className={CARD_GRID}>
        {products.map((product) => (
          <li key={product.id} className="flex">
            <ProductCard product={product} className="w-full" />
          </li>
        ))}
      </ul>
    </section>
  )
}

function CollectionSkeleton() {
  return (
    <ul aria-hidden="true" className={clsx('mt-12', CARD_GRID)}>
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i}>
          <div className="aspect-square animate-pulse rounded-2xl bg-surface-sunken" />
          <div className="mt-3.5 flex items-center justify-between">
            <div className="h-2.5 w-16 animate-pulse rounded-sm bg-surface-sunken" />
            <div className="h-2.5 w-9 animate-pulse rounded-sm bg-surface-sunken" />
          </div>
          <div className="mt-2.5 h-3.5 w-3/5 animate-pulse rounded-sm bg-surface-sunken" />
          <div className="mt-2.5 h-3 w-1/3 animate-pulse rounded-sm bg-surface-sunken" />
        </li>
      ))}
    </ul>
  )
}

/* -- Featured product moment ------------------------------------------- */
function FeaturedProduct({ product }) {
  const onSale =
    product.sellingPrice != null &&
    product.mrp != null &&
    product.mrp > product.sellingPrice
  const pct = onSale ? discountPct(product.mrp, product.sellingPrice) : 0
  const meta = [product.category, product.size].filter(Boolean).join(' · ')
  const title = product.size
    ? product.name.replace(/\s*[—–-]\s*[\d.].*$/, '').trim() || product.name
    : product.name

  return (
    <div className="texture-lines border-t border-line">
      <Container className="section-y">
        <div className="grid gap-x-10 gap-y-8 lg:grid-cols-12 lg:items-center">
          <figure className="group relative overflow-hidden lg:col-span-7 lg:col-start-1">
            <ProductImage
              src={product.image}
              alt={product.name}
              ratio="aspect-[4/5] sm:aspect-[5/4]"
              imgClassName={ZOOM}
            />
          </figure>

          <div className="lg:col-span-5 lg:col-start-8">
            <p className="text-[0.62rem] font-medium uppercase tracking-[0.24em] text-accent">
              Featured
            </p>
            {meta && (
              <p className="mt-4 text-[0.62rem] font-medium uppercase tracking-[0.16em] text-muted">
                {meta}
              </p>
            )}
            <h2 className="mt-2 font-serif leading-[1.03] text-ink text-[clamp(2rem,4.8vw,3.5rem)]">
              {title}
            </h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-ink-soft">
              {product.info || product.description}
            </p>

            {product.sellingPrice != null && (
              <p className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-base tabular-nums">
                <span className="font-medium text-ink">
                  {formatInr(product.sellingPrice)}
                </span>
                {onSale && (
                  <span className="text-sm text-muted line-through">
                    {formatInr(product.mrp)}
                  </span>
                )}
                {pct > 0 && (
                  <span className="text-[0.62rem] font-medium uppercase tracking-[0.12em] text-accent">
                    Save {pct}%
                  </span>
                )}
                {product.gstInclusive != null && (
                  <span className="text-[0.6rem] uppercase tracking-[0.14em] text-muted">
                    {product.gstInclusive ? 'incl. GST' : '+ GST'}
                  </span>
                )}
              </p>
            )}

            <Link
              to={`/products/${product.slug}`}
              className="btn mt-8 self-start rounded-full no-underline"
            >
              View this product
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </Container>
    </div>
  )
}

/**
 * Products route (/products): the studio's retail shelf as a beauty lookbook —
 * a campaign hero, a layered brand statement, a full-bleed line, the collection
 * as a 3-up card grid, a featured product moment, and a closing spread.
 *
 * DK StyleHub is a studio, not a shop: no cart, checkout or purchasing. Products
 * come from `useProducts()` — `GET /api/products` (real MRP / selling price /
 * GST), falling back to the curated demo range in src/data/products.js. Cards
 * link through to /products/:slug. The range / audience filters only appear for
 * values present in the data.
 */
export default function Products() {
  const { items, loading, error, reload } = useProductCatalogue()
  const [audience, setAudience] = useState('all')
  const [range, setRange] = useState('all')

  // The catalogue is fetched once at app scope and shared. Re-pull it whenever
  // the shelf is opened so a product just created in /admin/products shows up
  // straight away (the fetch is silent — current cards stay on screen).
  useEffect(() => {
    reload()
  }, [reload])

  const audienceOptions = useMemo(
    () => buildOptions(items, 'audience', productAudiences),
    [items],
  )
  const rangeOptions = useMemo(
    () => buildOptions(items, 'range', productRanges),
    [items],
  )
  const hasFilters = audienceOptions.length > 0 || rangeOptions.length > 0
  // Which filters are actually present decides styling, not just order: with
  // both present, "For" is the segmented pill and "Range" is a select (the
  // existing public-site dropdown look); if only one of them is present on a
  // given catalogue, it's the page's only filter and gets the pill either way.
  const activeFilterCount =
    (audienceOptions.length > 0 ? 1 : 0) + (rangeOptions.length > 0 ? 1 : 0)
  const isFiltered = audience !== 'all' || range !== 'all'

  const visible = useMemo(
    () =>
      items.filter(
        (item) =>
          (audience === 'all' || item.audience === audience) &&
          (range === 'all' || item.range === range),
      ),
    [items, audience, range],
  )

  // One card per product family, then group by editorial range when the data
  // carries it (demo set); the API shelf has no range, so it shows as one run.
  const groups = useMemo(() => {
    const cards = collapseFamilies(visible)
    const grouped = cards.some((p) => p.range)
    if (!grouped) {
      return cards.length ? [{ key: 'all', label: null, items: cards }] : []
    }
    return productRanges
      .map((r) => ({
        key: r.value,
        label: rangeLabel(r.value),
        items: cards.filter((p) => p.range === r.value),
      }))
      .filter((g) => g.items.length)
  }, [visible])

  // The "featured product moment" shows the one product an admin has flagged
  // `is_featured` (exactly one is enforced server-side). Nothing is featured →
  // the section is simply omitted. Prefer the flagged product that has a photo,
  // but still honour the flag if it has none.
  const featured = useMemo(
    () =>
      visible.find((p) => p.featured && p.image) ||
      visible.find((p) => p.featured) ||
      null,
    [visible],
  )

  const clearFilters = () => {
    setAudience('all')
    setRange('all')
  }

  return (
    <>
      <title>Products — DK StyleHub</title>
      <meta
        name="description"
        content="The DK StyleHub retail shelf — the care and styling products we use in the studio and recommend for home."
      />

      {/* 1 — Campaign hero: full-bleed photograph, oversized display type */}
      <section className="relative overflow-hidden bg-scrim text-white">
        <img
          src={quoteImage}
          alt="The DK StyleHub studio floor — styling stations in warm daylight"
          loading="eager"
          fetchPriority="high"
          className="h-[46svh] min-h-[20rem] w-full object-cover object-[50%_60%] lg:h-[52svh]"
        />
        <span aria-hidden="true" className="absolute inset-0 bg-[#3f4a5f]/12" />
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-scrim/45 via-scrim/10 to-scrim/75"
        />

        <Container className="pointer-events-none absolute inset-0">
          <div className="flex h-full flex-col justify-between pb-[clamp(4rem,14vh,9rem)] pt-8 sm:pt-10">
            <p className="text-[0.7rem] font-medium uppercase tracking-[0.28em] text-white/80 [text-shadow:0_1px_12px_rgb(0_0_0/0.5)]">
              Products
              <span aria-hidden="true" className="mx-3 text-white/40">
                /
              </span>
              The Shelf
            </p>

            <div>
              <h1 className="max-w-[16ch] font-serif leading-[1.03] text-white text-[clamp(2.25rem,6vw,4rem)] [text-shadow:0_2px_30px_rgb(0_0_0/0.45)]">
                Everything here has earned its place.
              </h1>
              <p className="mt-6 text-[0.7rem] font-medium uppercase tracking-[0.2em] text-white/75 [text-shadow:0_1px_12px_rgb(0_0_0/0.5)]">
                Hair care <span aria-hidden="true" className="text-white/40">·</span>{' '}
                Skin care <span aria-hidden="true" className="text-white/40">·</span>{' '}
                Styling
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* 4 — The collection: a 3-up card grid, grouped by range */}
      <div className="texture-lines">
        <Container className="pb-[var(--spacing-section)] pt-[var(--spacing-section)]">
          <header className="grid gap-x-10 gap-y-5 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-8">
              <p className="eyebrow">The collection</p>
              <h2 className="mt-4 font-serif leading-[1.0] text-ink text-[clamp(2.5rem,7vw,5rem)]">
                The full range.
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-ink-soft lg:col-span-4 lg:pb-3">
              Grouped the way we use it — wash and care first, then skin, then the
              pieces that finish a look. Tap a product for the full details.
            </p>
          </header>

          {!loading && error && (
            <Notice className="mt-8 max-w-2xl">
              We couldn’t load the product shelf just now. Please refresh, or
              ask your stylist in the studio for recommendations.
            </Notice>
          )}

          {!loading && hasFilters && (
            <div className="mt-10 flex flex-col gap-5 border-t border-line pt-6 sm:flex-row sm:flex-wrap sm:items-start sm:gap-x-10 sm:gap-y-4">
              {audienceOptions.length > 0 && (
                <SegmentedFilter
                  legend="For"
                  options={audienceOptions}
                  value={audience}
                  onChange={setAudience}
                  className="sm:w-auto"
                />
              )}
              {rangeOptions.length > 0 &&
                (activeFilterCount === 2 ? (
                  // Second filter alongside "For" — the existing public-site
                  // select styling, not a second pill.
                  <FilterSelect
                    legend="Range"
                    options={rangeOptions}
                    value={range}
                    onChange={setRange}
                  />
                ) : (
                  // The only filter this catalogue has — gets the pill too.
                  <SegmentedFilter
                    legend="Range"
                    options={rangeOptions}
                    value={range}
                    onChange={setRange}
                    className="sm:w-auto"
                  />
                ))}
            </div>
          )}

          {loading ? (
            <CollectionSkeleton />
          ) : groups.length === 0 ? (
            <div className="mt-16 max-w-md text-ink-soft">
              {isFiltered ? (
                <>
                  <p>Nothing on the shelf matches this filter.</p>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-3 text-sm text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink"
                  >
                    Clear filters
                  </button>
                </>
              ) : (
                <p>
                  The shelf is being refreshed. Ask your stylist for
                  recommendations in the studio, or{' '}
                  <Link
                    to={CONTACT}
                    className="text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink"
                  >
                    get in touch
                  </Link>
                  .
                </p>
              )}
            </div>
          ) : (
            <div className="mt-12 flex flex-col gap-16 sm:mt-14 sm:gap-20">
              {groups.map((group) => (
                <CollectionGroup
                  key={group.key}
                  label={group.label}
                  count={group.items.length}
                  products={group.items}
                />
              ))}
            </div>
          )}

          <p className="mt-20 border-t border-line pt-8 text-sm text-ink-soft">
            Prices and availability are confirmed in the studio.{' '}
            <Link
              to={CONTACT}
              className="text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink"
            >
              Ask about a product
            </Link>
            .
          </p>
        </Container>
      </div>

      {/* 5 — Featured product moment (only when a product has photography) */}
      {!loading && featured && <FeaturedProduct product={featured} />}

      {/* 6 — Closing spread: the last page of the lookbook */}
      <section className="relative overflow-hidden border-t border-line bg-scrim text-white">
        <img
          src={closingImage}
          alt="A finished look at DK StyleHub"
          loading="lazy"
          className="h-[78svh] min-h-[28rem] w-full object-cover object-[50%_35%] lg:h-[86svh]"
        />
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-scrim/80 via-scrim/25 to-scrim/45"
        />
        <Container className="absolute inset-0">
          <div className="flex h-full flex-col justify-end py-10 sm:py-14">
            <p className="text-[0.7rem] font-medium uppercase tracking-[0.28em] text-accent [text-shadow:0_1px_12px_rgb(0_0_0/0.5)]">
              In the studio
            </p>
            <p className="mt-4 max-w-[20ch] font-serif leading-[1.0] text-white text-[clamp(2.5rem,8vw,5.5rem)] [text-shadow:0_2px_36px_rgb(0_0_0/0.5)]">
              The right finish, long after you leave.
            </p>
            <Link
              to={CONTACT}
              className="mt-8 inline-flex w-fit items-center gap-2 border-b border-white/40 pb-1 text-[0.72rem] font-medium uppercase tracking-[0.18em] text-white no-underline transition-colors hover:border-white"
            >
              Talk to a stylist
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </Container>
      </section>
    </>
  )
}
