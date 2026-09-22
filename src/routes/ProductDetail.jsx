import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import clsx from 'clsx'
import Container from '../components/layout/Container'
import ProductImage from '../components/ui/ProductImage'
import { sizeRank } from '../hooks/useProducts'
import { useProductCatalogue } from '../context/ProductsContext'
import { formatInr } from '../data/services'

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

function NotFound() {
  return (
    <>
      <title>Product not found — DK StyleHub</title>
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
 * large photography left, product information right — with no cart or checkout;
 * the only action is a studio enquiry. Data comes from `useProducts()` (API or
 * demo fallback), matched by slug. Size variants that share a `family` are
 * cross-linked as a subtle selector.
 */
export default function ProductDetail() {
  const { slug } = useParams()
  const { items, loading } = useProductCatalogue()

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

  if (!product) return <NotFound />

  const onSale =
    product.sellingPrice != null &&
    product.mrp != null &&
    product.mrp > product.sellingPrice
  const pct = onSale ? discountPct(product.mrp, product.sellingPrice) : 0
  const title = baseName(product)

  const info = [
    product.size && ['Size', product.size],
    product.category && ['Category', product.category],
    product.gstInclusive != null && [
      'GST',
      product.gstInclusive ? 'Included in the price' : 'Added at the studio',
    ],
    ['Availability', 'Confirmed in the studio'],
  ].filter(Boolean)

  return (
    <>
      <title>{`${product.name} — DK StyleHub`}</title>
      <meta
        name="description"
        content={product.description || `${product.name} — from the DK StyleHub shelf.`}
      />

      <div className="texture-lines">
        <Container className="section-y">
          <BackLink />

          <div className="mt-8 grid gap-x-12 gap-y-10 lg:mt-12 lg:grid-cols-2 xl:gap-x-16">
            {/* Left — photography */}
            <div className="lg:sticky lg:top-28 lg:self-start">
              <figure className="group overflow-hidden">
                <ProductImage
                  src={product.image}
                  alt={product.name}
                  ratio="aspect-[4/5]"
                  className="rounded-[var(--radius-md)]"
                  imgClassName="transition-transform duration-[600ms] ease-[var(--ease-standard)] group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                />
              </figure>
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
                {product.sellingPrice != null ? (
                  <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 tabular-nums">
                    <span className="text-2xl font-medium text-ink">
                      {formatInr(product.sellingPrice)}
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
                {product.gstInclusive != null && (
                  <p className="mt-1.5 text-[0.68rem] uppercase tracking-[0.14em] text-muted">
                    {product.gstInclusive
                      ? 'Price includes GST'
                      : 'GST added at the studio'}
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

              {/* Enquiry — no cart, no checkout */}
              <div className="mt-9 flex flex-wrap items-center gap-4">
                <Link
                  to={CONTACT}
                  className="btn no-underline"
                  state={{ product: product.name }}
                >
                  Ask about this product
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
                <BackLink />
              </div>
              <p className="mt-4 text-xs leading-relaxed text-muted">
                DK StyleHub is a studio, not a shop — products are bought in
                person. Message us and we’ll set one aside.
              </p>
            </div>
          </div>
        </Container>
      </div>
    </>
  )
}
