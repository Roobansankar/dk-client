import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import clsx from 'clsx'
import Container from '../components/layout/Container'
import ImageGallery from '../components/ui/ImageGallery'
import ProductCard from '../components/ui/ProductCard'
import { sizeRank } from '../hooks/useProducts'
import { useProductCatalogue } from '../context/ProductsContext'
import { formatInr } from '../data/services'
import QuantityStepper from '../components/shop/QuantityStepper'
import { useCart } from '../context/CartContext'
import { clampQtyToStock, MAX_QUANTITY, productLine } from '../lib/cart'
import { taxIncluded, taxLabel } from '../lib/pricing'
import Seo from '../components/Seo'
import { absoluteUrl, breadcrumbSchema } from '../lib/seo'

const PRODUCTS = '/products'
const CONTACT = '/contact'

/** Whole-number saving, e.g. 950 → 855 ⇒ 10. */
function discountPct(mrp, sellingPrice) {
  if (!mrp || !sellingPrice || mrp <= sellingPrice) return 0
  return Math.round((1 - sellingPrice / mrp) * 100)
}

/** Base product name with any trailing "— 250 ml" removed. */
function baseName(product) {
  if (!product.size) return product.name
  return product.name.replace(/\s*[—–-]\s*[\d.].*$/, '').trim() || product.name
}

function BackLink({ className }) {
  return (
    <Link
      to={PRODUCTS}
      className={clsx(
        'inline-flex items-center gap-2 text-eyebrow font-medium uppercase tracking-[0.14em] text-ink-soft no-underline transition-colors hover:text-ink',
        className,
      )}
    >
      <ArrowLeft size={14} aria-hidden="true" />
      Back to Products
    </Link>
  )
}

function DetailSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-x-12 gap-y-10 lg:grid-cols-2 xl:gap-x-16">
      <div className="aspect-[4/5] animate-pulse rounded-[var(--radius-md)] border border-line bg-surface-sunken" />
      <div className="lg:pt-6">
        <div className="h-2.5 w-24 animate-pulse rounded-sm bg-surface-sunken" />
        <div className="mt-4 h-10 w-3/4 animate-pulse rounded-sm bg-surface-sunken" />
        <div className="mt-6 h-3 w-full animate-pulse rounded-sm bg-surface-sunken" />
        <div className="mt-2 h-3 w-5/6 animate-pulse rounded-sm bg-surface-sunken" />
        <div className="mt-8 h-6 w-32 animate-pulse rounded-sm bg-surface-sunken" />
      </div>
    </div>
  )
}

function NotFound({ loadFailed = false }) {
  return (
    <>
      {/* noindex only a genuine miss — never a page the API failed to load. */}
      <Seo title="Product not found — DK StyleHub" noindex={!loadFailed} />
      <div className="texture-lines">
        <Container className="section-y">
          <p className="eyebrow">Not found</p>
          <h1 className="mt-4 font-serif text-[clamp(2rem,5vw,3.25rem)] leading-[1.05] text-ink">
            We couldn’t find that product.
          </h1>
          <p className="mt-5 max-w-md text-ink-soft">
            It may have been renamed or is no longer part of the range. Browse the
            full shelf, or ask the studio.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link to={PRODUCTS} className="btn no-underline">
              View all products
            </Link>
            <Link to={CONTACT} className="btn btn-outline no-underline">
              Ask the studio
            </Link>
          </div>
        </Container>
      </div>
    </>
  )
}

/**
 * Product detail route (/products/:slug). A premium two-column composition —
 * large photography left, product information right — with Add to Cart /
 * Buy Now for priced products, plus a studio enquiry. Data comes from
 * `useProducts()`, matched by slug. Size variants that share a `family` are
 * cross-linked as a subtle selector.
 */
export default function ProductDetail() {
  const { slug } = useParams()
  const { items, loading, error } = useProductCatalogue()
  const navigate = useNavigate()
  const { add, setBuyNow, lines } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)

  // Switching size variant keeps this component mounted — start fresh.
  const [lastSlug, setLastSlug] = useState(slug)
  if (slug !== lastSlug) {
    setLastSlug(slug)
    setQuantity(1)
    setAdded(false)
  }

  const product = useMemo(
    () => items.find((p) => p.slug === slug) || null,
    [items, slug],
  )

  const sizes = useMemo(() => {
    if (!product?.family) return []
    const family = items
      .filter((p) => p.family === product.family)
      .sort((a, b) => sizeRank(a.size) - sizeRank(b.size))
    return family.length > 1 ? family : []
  }, [items, product])

  // Related shelf — same category first, then the rest of the catalogue.
  // Size variants of this product are excluded (they already have their own
  // selector above). Capped at four.
  const related = useMemo(() => {
    if (!product) return []
    const pool = items.filter(
      (p) => p.slug !== slug && (!product.family || p.family !== product.family),
    )
    const sameCategory = pool.filter(
      (p) => product.category && p.category === product.category,
    )
    const rest = pool.filter(
      (p) => !(product.category && p.category === product.category),
    )
    return [...sameCategory, ...rest].slice(0, 4)
  }, [items, product, slug])

  if (loading) {
    return (
      <div className="texture-lines">
        <Container className="section-y">
          <BackLink />
          <div className="mt-10">
            <DetailSkeleton />
          </div>
        </Container>
      </div>
    )
  }

  if (!product) return <NotFound loadFailed={Boolean(error)} />

  const onSale =
    product.price != null &&
    product.mrp != null &&
    product.mrp > product.price
  const pct = onSale ? discountPct(product.mrp, product.price) : 0
  const tax = taxLabel(product.taxPercent)
  const breakdown =
    tax && product.sellingPrice != null
      ? taxIncluded(product.sellingPrice, product.taxPercent)
      : null
  const title = baseName(product)

  // Live stock from GET /api/products (null = unknown, e.g. catalogue error).
  const stock = product.stock
  const outOfStock = stock != null && stock <= 0
  const maxQty = stock != null ? Math.min(MAX_QUANTITY, Math.max(0, stock)) : MAX_QUANTITY
  // Quantity already sitting in the cart counts against the same stock.
  const inCart = lines.find((l) => l.key === `p-${product.id}`)?.quantity ?? 0
  const remaining = stock != null ? Math.max(0, stock - inCart) : null
  const effectiveMax = remaining != null ? Math.min(MAX_QUANTITY, remaining) : MAX_QUANTITY
  const clampedQty = Math.min(Math.max(1, quantity), Math.max(1, effectiveMax))
  const overStock = remaining != null && quantity > remaining
  const canBuy = product.sellingPrice != null && !outOfStock && remaining !== 0

  const availability =
    outOfStock
      ? 'Out of stock'
      : remaining === 0
        ? `All ${stock} in your cart`
        : stock != null
          ? `Only ${stock} available${inCart > 0 ? ` (${remaining} left after your cart)` : ''}`
          : 'Confirmed in the studio'

  const info = [
    product.size && ['Size', product.size],
    product.category && ['Category', product.category],
    tax && ['Taxes', `${tax} included in the price`],
    ['Availability', availability],
  ].filter(Boolean)

  return (
    <>
      <Seo
        title={`${product.name} — DK StyleHub`}
        // Very short admin descriptions make poor snippets — lead with the
        // name and studio context instead.
        description={
          (product.description?.length ?? 0) >= 50
            ? product.description
            : `${product.name} — from the DK StyleHub shelf, the products we use in the studio in Coimbatore.${product.description ? ` ${product.description}` : ''}`
        }
        path={`/products/${product.slug}`}
        type="product"
        {...(product.image && { image: product.image, imageAlt: product.name })}
        jsonLd={[
          {
            '@type': 'Product',
            name: product.name,
            url: absoluteUrl(`/products/${product.slug}`),
            ...(product.description && { description: product.description }),
            ...(product.images?.length > 0 && { image: product.images }),
            ...(product.price != null && {
              offers: {
                '@type': 'Offer',
                url: absoluteUrl(`/products/${product.slug}`),
                price: product.price,
                priceCurrency: 'INR',
                ...(stock != null && {
                  availability: outOfStock
                    ? 'https://schema.org/OutOfStock'
                    : 'https://schema.org/InStock',
                }),
              },
            }),
          },
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Products', path: '/products' },
            { name: product.name, path: `/products/${product.slug}` },
          ]),
        ]}
      />

      <div className="texture-lines">
        <Container className="section-y">
          <BackLink />

          <div className="mt-8 grid gap-x-12 gap-y-10 lg:mt-12 lg:grid-cols-2 xl:gap-x-16">
            {/* Left — photography */}
            <div className="lg:sticky lg:top-28 lg:self-start">
              <ImageGallery key={product.id} images={product.images} alt={product.name} />
            </div>

            {/* Right — information */}
            <div className="lg:pt-4">
              <p className="text-[0.62rem] font-medium uppercase tracking-[0.18em] text-muted">
                {product.category || 'Product'}
                {product.size && (
                  <>
                    <span aria-hidden="true" className="mx-2 text-line-strong">
                      ·
                    </span>
                    {product.size}
                  </>
                )}
              </p>

              <h1 className="mt-3 font-serif leading-[1.03] text-ink text-[clamp(2rem,4.6vw,3.25rem)]">
                {title}
              </h1>

              {(product.info || product.description) && (
                <p className="mt-6 max-w-prose text-base leading-relaxed text-ink-soft">
                  {product.info || product.description}
                </p>
              )}

              {/* Price */}
              <div className="mt-8 border-t border-line pt-6">
                {product.price != null ? (
                  <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 tabular-nums">
                    <span className="text-2xl font-medium text-ink">
                      {formatInr(product.price)}
                    </span>
                    {onSale && (
                      <span className="text-base text-muted line-through">
                        {formatInr(product.mrp)}
                      </span>
                    )}
                    {pct > 0 && (
                      <span className="text-[0.65rem] font-medium uppercase tracking-[0.12em] text-accent">
                        Save {pct}%
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="text-sm uppercase tracking-[0.14em] text-muted">
                    Priced in the studio
                  </p>
                )}
                {breakdown && (
                  <p className="mt-1.5 text-[0.68rem] uppercase tracking-[0.14em] tabular-nums text-muted">
                    Incl. {tax} ({formatInr(breakdown.tax)})
                  </p>
                )}
              </div>

              {/* Size selector — only real, separate size records of one product */}
              {sizes.length > 1 && (
                <div className="mt-8">
                  <p className="text-[0.62rem] font-medium uppercase tracking-[0.16em] text-muted">
                    Size
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {sizes.map((s) => {
                      const active = s.slug === product.slug
                      return (
                        <Link
                          key={s.slug}
                          to={`/products/${s.slug}`}
                          aria-current={active ? 'page' : undefined}
                          className={clsx(
                            'inline-flex min-h-[2.25rem] items-center rounded-[var(--radius-sm)] border px-3 text-sm no-underline transition-colors',
                            active
                              ? 'border-ink bg-ink text-paper'
                              : 'border-line-strong text-ink-soft hover:border-ink hover:text-ink',
                          )}
                        >
                          {s.size}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Product information */}
              <dl className="mt-8 border-t border-line text-sm">
                {info.map(([label, value]) => (
                  <div
                    key={label}
                    className="flex flex-wrap justify-between gap-x-6 gap-y-1 border-b border-line py-3.5"
                  >
                    <dt className="text-muted">{label}</dt>
                    <dd className="text-ink">{value}</dd>
                  </div>
                ))}
              </dl>

              {product.sellingPrice != null ? (
                <div className="mt-9">
                  {outOfStock ? (
                    <p role="alert" className="border-l-2 border-ink pl-3 text-sm text-ink">
                      This product is out of stock right now. Ask the studio and
                      we’ll set one aside when it’s back.
                    </p>
                  ) : remaining === 0 ? (
                    <>
                      <p role="status" className="border-l-2 border-ink pl-3 text-sm text-ink">
                        You’ve added all {stock} to your cart.
                      </p>
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <Link to="/cart" className="btn no-underline">
                          View cart
                          <ArrowRight size={15} aria-hidden="true" />
                        </Link>
                      </div>
                      <p className="mt-3 text-sm text-ink-soft">
                        Adjust the quantity in your cart if you need fewer.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center gap-3">
                        <QuantityStepper
                          value={clampedQty}
                          max={Math.max(1, effectiveMax)}
                          onChange={(n) => {
                            setAdded(false)
                            setQuantity(clampQtyToStock(n, effectiveMax))
                          }}
                        />
                        <button
                          type="button"
                          className="btn btn-outline"
                          disabled={!canBuy}
                          onClick={() => {
                            add(productLine(product, clampedQty))
                            setAdded(true)
                          }}
                        >
                          Add to cart
                        </button>
                        <button
                          type="button"
                          className="btn"
                          disabled={!canBuy}
                          onClick={() => {
                            setBuyNow(productLine(product, clampQtyToStock(clampedQty, maxQty)))
                            navigate('/checkout/now')
                          }}
                        >
                          Buy now
                          <ArrowRight size={15} aria-hidden="true" />
                        </button>
                      </div>
                      {overStock ? (
                        <p role="alert" className="mt-3 text-sm text-ink">
                          Only {remaining} more can be added
                          {inCart > 0 ? ` (you already have ${inCart} in your cart)` : ''} —{' '}
                          {stock} in stock.
                        </p>
                      ) : (
                        stock != null && (
                          <p className="mt-3 text-sm text-ink-soft tabular-nums">
                            {stock} in stock
                            {clampedQty >= effectiveMax && effectiveMax < MAX_QUANTITY
                              ? ' — that’s all of it'
                              : ''}
                            .
                          </p>
                        )
                      )}
                    </>
                  )}
                  {(added || inCart > 0) && remaining !== 0 && (
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <p role="status" className="text-sm text-ink-soft">
                        {added ? 'Added to your cart.' : `${inCart} in your cart.`}{' '}
                        <Link to="/cart" className="text-ink underline underline-offset-4">
                          View cart
                        </Link>
                      </p>
                      <Link to="/cart" className="btn btn-outline no-underline">
                        View cart
                        <ArrowRight size={15} aria-hidden="true" />
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Unpriced — enquiry only */}
                  <div className="mt-9 flex flex-wrap items-center gap-4">
                    <Link
                      to={CONTACT}
                      className="btn no-underline"
                      state={{ product: product.name }}
                    >
                      Ask about this product
                      <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                  </div>
                  <p className="mt-4 text-xs leading-relaxed text-muted">
                    Message us and we’ll set one aside.
                  </p>
                </>
              )}
            </div>
          </div>
        </Container>
      </div>

      {related.length > 0 && (
        <section className="border-t border-line bg-surface">
          <Container className="section-y">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Keep looking</p>
                <h2 className="mt-3">Related products</h2>
              </div>
              <Link
                to={PRODUCTS}
                className="inline-flex items-center gap-2 text-eyebrow font-medium uppercase tracking-[0.14em] text-ink-soft no-underline transition-colors hover:text-ink"
              >
                View all products
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
            <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-9 sm:gap-x-6 lg:grid-cols-4">
              {related.map((item) => (
                <li key={item.id || item.slug}>
                  <ProductCard product={item} className="w-full" />
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}
    </>
  )
}
