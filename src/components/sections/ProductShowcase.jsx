import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import clsx from 'clsx'
import Container from '../layout/Container'
import ProductImage from '../ui/ProductImage'
import { useProductCatalogue } from '../../context/ProductsContext'
import { formatInr } from '../../data/services'
import { Skeleton } from '../StateViews'

/**
 * Homepage "Our products" — a small editorial showcase that sits directly below
 * "Meet the Team". Three products on one row (desktop), two per row (tablet),
 * one per row (mobile), floating over soft sage / warm-gold organic shapes.
 *
 * Data comes entirely from `useProducts()` (API `GET /api/products`) — no
 * demo/mock products are ever substituted. Loading shows card-shaped
 * skeletons; a thin catalogue (API reachable but fewer than 3 distinct
 * products) shows however many real ones exist rather than padding out with
 * invented ones; a failed/empty catalogue hides the section entirely (like
 * the sibling GalleryPreview/ComboOffers sections do). No cart — each card is
 * a single link to the existing `/products/:slug` route. Nothing is priced or
 * invented here; the card shows the product's own category, description and
 * selling price verbatim.
 *
 * The decorative shapes are theme-aware (`.product-deco` in src/index.css):
 * muted and warm in light mode, deeply dialled back in dark mode. The section
 * clips its own overflow so the shapes can never cause a horizontal scrollbar.
 */

/** Product name with any trailing "— 250 ml" size token removed. */
function cleanName(name) {
  return String(name || '').replace(/\s*[—–-]\s*[\d.].*$/, '').trim() || name
}

/**
 * First three products, de-duplicated by size-variant family AND by photo — so
 * the row is always three visibly different products, never the same bottle
 * shot twice.
 */
function pickThree(items) {
  const families = new Set()
  const images = new Set()
  const out = []
  for (const p of items) {
    const family = p.family || p.slug
    if (families.has(family)) continue
    if (p.image && images.has(p.image)) continue
    families.add(family)
    if (p.image) images.add(p.image)
    out.push(p)
    if (out.length === 3) break
  }
  return out
}

// The photo zoom + parallax + light sweep are defined once in index.css under
// `.product-media` (shared with the /products collection grid's ProductCard)
// so both cards speak one hover language. Here we add the whole-card lift.
const CARD_LIFT =
  'transition-transform duration-[550ms] ease-[var(--ease-standard)] will-change-transform hover:-translate-y-1.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0'

const IMAGE_FRAME =
  'rounded-lg product-media shadow-[0_18px_38px_-26px_rgb(32_30_27/0.35)] transition-[box-shadow,border-color] duration-[550ms] ease-[var(--ease-standard)] group-hover:border-line-strong group-hover:shadow-[0_32px_58px_-26px_rgb(32_30_27/0.45)]'

/**
 * Card hover — one continuous, cinematic gesture rather than a flat colour
 * swap: the whole card lifts a couple of pixels, the photo takes the shared
 * `.product-media` zoom + light sweep (same language as the /products grid,
 * just its own dimensions/copy here), the frame's hairline firms up into a
 * deeper elevation, and a small round arrow affordance fades/scales into the
 * photo's corner. Everything is transform/opacity + shadow, so
 * `motion-reduce:` can zero it cleanly; on touch, tapping the card navigates
 * immediately, so there's no hover state left to get stuck.
 */
function ProductShowcaseCard({ product }) {
  const { slug, name, description, blurb, image } = product
  const label = product.category || 'The collection'
  const copy = description || blurb || ''
  const hasPrice = product.price != null
  const displayName = cleanName(name)

  return (
    <li className="min-w-0">
      <Link
        to={`/products/${slug}`}
        className={clsx('group flex h-full flex-col no-underline', CARD_LIFT)}
      >
        <p className="text-[0.62rem] font-medium uppercase tracking-[0.2em] text-muted">
          {label}
        </p>

        <div className="relative my-4 sm:my-5">
          <ProductImage
            src={image}
            alt={displayName}
            ratio="aspect-square"
            className={IMAGE_FRAME}
            imgClassName="will-change-transform"
          />
          {/* Round "view" affordance — fades/scales into the photo's corner
              on hover, replacing a full banner reveal with a quieter cue. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-4 right-4 flex h-10 w-10 scale-75 items-center justify-center rounded-full border border-line-strong bg-surface text-ink opacity-0 shadow-[0_10px_24px_-12px_rgb(32_30_27/0.35)] transition-[opacity,transform] duration-500 ease-[var(--ease-standard)] group-hover:scale-100 group-hover:opacity-100 motion-reduce:transition-none motion-reduce:group-hover:opacity-0"
          >
            <ArrowRight size={15} aria-hidden="true" />
          </span>
        </div>

        <div className="mt-auto flex items-baseline justify-between gap-4">
          <h3 className="font-serif text-xl leading-snug text-ink">
            {displayName}
          </h3>
          {hasPrice ? (
            <span className="shrink-0 text-sm font-medium tabular-nums text-ink">
              {formatInr(product.price)}
            </span>
          ) : (
            <span className="shrink-0 text-[0.62rem] uppercase tracking-[0.14em] text-muted">
              In studio
            </span>
          )}
        </div>

        {copy && (
          <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-ink-soft">
            {copy}
          </p>
        )}
      </Link>
    </li>
  )
}

function ShowcaseSkeleton() {
  return (
    <ul
      aria-hidden="true"
      className="mt-12 grid grid-cols-1 gap-x-6 gap-y-10 sm:mt-16 sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-3 lg:gap-x-8"
    >
      {Array.from({ length: 3 }).map((_, i) => (
        <li key={i}>
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="my-4 aspect-square w-full rounded-lg sm:my-5" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="mt-2.5 h-3 w-full" />
        </li>
      ))}
    </ul>
  )
}

export default function ProductShowcase() {
  const { items, loading, error } = useProductCatalogue()

  const products = pickThree(items)

  if (!loading && !error && products.length === 0) return null

  return (
    <section
      id="products-showcase"
      className="relative isolate scroll-mt-20 overflow-hidden border-t border-line bg-surface"
    >
      {/* Decorative organic shapes — behind the cards, never inside them. */}
      <div
        aria-hidden="true"
        className="product-deco pointer-events-none absolute inset-0"
      >
        <span
          className="deco deco-sage"
          style={{
            width: 'clamp(18rem, 42vw, 34rem)',
            height: 'clamp(18rem, 42vw, 34rem)',
            left: '-11%',
            top: '18%',
          }}
        />
        <span
          className="deco deco-gold"
          style={{
            width: 'clamp(16rem, 36vw, 30rem)',
            height: 'clamp(16rem, 36vw, 30rem)',
            right: '-14%',
            top: '34%',
          }}
        />
        <span
          className="deco deco-sage"
          style={{
            width: 'clamp(13rem, 30vw, 24rem)',
            height: 'clamp(13rem, 30vw, 24rem)',
            left: '32%',
            bottom: '-8%',
          }}
        />
      </div>

      <Container className="relative section-y">
        <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div className="measure">
            <p className="eyebrow">Our products</p>
            <h2 className="mt-4">Considered care, chosen well.</h2>
            <p className="mt-4 text-ink-soft">
              A short shelf of what we use at the stations — taken home by the
              people who sit in our chairs.
            </p>
          </div>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 text-eyebrow uppercase tracking-[0.14em] text-ink no-underline transition-colors hover:text-muted"
          >
            View all products
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </header>

        {loading ? (
          <ShowcaseSkeleton />
        ) : error ? (
          <p className="mt-12 text-ink-soft sm:mt-16">
            We couldn’t load our products just now. Please check back shortly.
          </p>
        ) : (
          <ul className="mt-12 grid grid-cols-1 gap-x-6 gap-y-10 sm:mt-16 sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-3 lg:gap-x-8">
            {products.map((product) => (
              <ProductShowcaseCard key={product.id} product={product} />
            ))}
          </ul>
        )}
      </Container>
    </section>
  )
}
