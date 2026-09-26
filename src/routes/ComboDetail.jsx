import { useId, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import clsx from 'clsx'
import Container from '../components/layout/Container'
import ImageGallery from '../components/ui/ImageGallery'
import ProductImage from '../components/ui/ProductImage'
import QuantityStepper from '../components/shop/QuantityStepper'
import { useCombos } from '../hooks/useCombos'
import { useCart } from '../context/CartContext'
import { clampQtyToStock, MAX_QUANTITY, comboLine } from '../lib/cart'
import { comboBasePrice, taxLabel, withTax } from '../lib/pricing'
import { formatInr } from '../data/services'
import Seo from '../components/Seo'
import { breadcrumbSchema } from '../lib/seo'

const PRODUCTS = '/products'
const CONTACT = '/contact'

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
      <Seo title="Combo not found — DK StyleHub" noindex={!loadFailed} />
      <div className="texture-lines">
        <Container className="section-y">
          <p className="eyebrow">Not found</p>
          <h1 className="mt-4 font-serif text-[clamp(2rem,5vw,3.25rem)] leading-[1.05] text-ink">
            We couldn’t find that combo.
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
 * Combo detail route (/combos/:slug). Same premium two-column composition as
 * the product page — large photography left, combo information right — with
 * a product picker (any non-empty subset may be bought), quantity, and
 * Add to Cart / Buy Now. Data comes from `useCombos()`, matched by slug.
 */
export default function ComboDetail() {
  const { slug } = useParams()
  const { combos, loading, error } = useCombos()
  const navigate = useNavigate()
  const { add, setBuyNow } = useCart()
  const uid = useId()
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)

  // Switching combos keeps this component mounted — start fresh.
  const [lastSlug, setLastSlug] = useState(slug)
  if (slug !== lastSlug) {
    setLastSlug(slug)
    setQuantity(1)
    setAdded(false)
  }

  const combo = useMemo(
    () => combos.find((c) => c.slug === slug) || null,
    [combos, slug],
  )

  const selectable = useMemo(
    () =>
      combo
        ? combo.items.filter((item) => item.available && !(item.stock != null && item.stock <= 0))
        : [],
    [combo],
  )

  const [selected, setSelected] = useState(null)
  // Default to the full available set once the combo loads.
  const [lastComboId, setLastComboId] = useState(null)
  if (combo && combo.id !== lastComboId) {
    setLastComboId(combo.id)
    setSelected(new Set(selectable.map((i) => i.productId)))
  }
  const selection = selected ?? new Set(selectable.map((i) => i.productId))

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

  if (!combo) return <NotFound loadFailed={Boolean(error)} />

  const chosen = selectable.filter((item) => selection.has(item.productId))
  const empty = chosen.length === 0
  const allSelected = chosen.length === combo.items.length && combo.items.length > 0
  const completeSet = allSelected && combo.bundlePrice != null

  const unit = withTax(comboBasePrice(combo, chosen), combo.taxPercent)
  const breakdown =
    combo.taxPercent > 0 ? withTax(comboBasePrice(combo, chosen), combo.taxPercent) : null
  const tax = taxLabel(combo.taxPercent)

  // Every chosen product consumes `quantity` units — the scarcest caps it.
  const chosenStocks = chosen.map((i) => i.stock).filter((s) => s != null)
  const maxQty =
    chosenStocks.length > 0 ? Math.min(MAX_QUANTITY, Math.min(...chosenStocks)) : MAX_QUANTITY
  const clampedQty = Math.min(Math.max(1, quantity), Math.max(1, maxQty))
  const outOfStock = selectable.length === 0

  const toggle = (productId) => {
    setAdded(false)
    const next = new Set(selection)
    if (next.has(productId)) next.delete(productId)
    else next.add(productId)
    setSelected(next)
  }

  const line = () => comboLine(combo, chosen.map((i) => i.productId), clampedQty)

  const info = [
    [`${combo.items.length} product${combo.items.length === 1 ? '' : 's'}`, `${chosen.length} selected`],
    tax && ['Taxes', `${tax} included in the price`],
    [
      'Availability',
      outOfStock
        ? 'Out of stock'
        : chosenStocks.length > 0
          ? `Only ${Math.min(...chosenStocks)} of this selection available`
          : 'Confirmed in the studio',
    ],
  ].filter(Boolean)

  return (
    <>
      <Seo
        title={`${combo.name} — DK StyleHub Combo`}
        description={
          (combo.description?.length ?? 0) >= 50
            ? combo.description
            : `${combo.name} — a DK StyleHub product combo, picked from the products we use in the studio.${combo.description ? ` ${combo.description}` : ''}`
        }
        path={`/combos/${combo.slug}`}
        {...(combo.image && { image: combo.image, imageAlt: combo.name })}
        jsonLd={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Products', path: '/products' },
          { name: combo.name, path: `/combos/${combo.slug}` },
        ])}
      />

      <div className="texture-lines">
        <Container className="section-y">
          <BackLink />

          <div className="mt-8 grid gap-x-12 gap-y-10 lg:mt-12 lg:grid-cols-2 xl:gap-x-16">
            {/* Left — photography */}
            <div className="lg:sticky lg:top-28 lg:self-start">
              <ImageGallery key={combo.id} images={combo.images} alt={combo.name} />
            </div>

            {/* Right — information */}
            <div className="lg:pt-4">
              <p className="text-[0.62rem] font-medium uppercase tracking-[0.18em] text-muted">
                <span className="text-accent">Combo</span>
                <span aria-hidden="true" className="mx-2 text-line-strong">
                  ·
                </span>
                {combo.items.length} product{combo.items.length === 1 ? '' : 's'}
              </p>

              <h1 className="mt-3 font-serif leading-[1.03] text-ink text-[clamp(2rem,4.6vw,3.25rem)]">
                {combo.name}
              </h1>

              {combo.description && (
                <p className="mt-6 max-w-prose text-base leading-relaxed text-ink-soft">
                  {combo.description}
                </p>
              )}

              {/* Price */}
              <div className="mt-8 border-t border-line pt-6">
                {!empty ? (
                  <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 tabular-nums">
                    <span className="text-2xl font-medium text-ink">
                      {formatInr(unit.total * clampedQty)}
                    </span>
                    <span className="text-[0.65rem] font-medium uppercase tracking-[0.12em] text-accent">
                      {completeSet ? 'Complete set price' : `${chosen.length} selected · Subtotal`}
                    </span>
                  </p>
                ) : (
                  <p className="text-sm uppercase tracking-[0.14em] text-muted">
                    Choose products to see the price
                  </p>
                )}
                {breakdown && !empty && (
                  <p className="mt-1.5 text-[0.68rem] uppercase tracking-[0.14em] tabular-nums text-muted">
                    {formatInr(breakdown.base * clampedQty)} + {tax} (
                    {formatInr(breakdown.tax * clampedQty)})
                  </p>
                )}
              </div>

              {/* Product picker */}
              <div className="mt-8">
                <p className="text-[0.62rem] font-medium uppercase tracking-[0.16em] text-muted">
                  Choose any products
                </p>
                <ul className="mt-3 divide-y divide-line border-y border-line">
                  {combo.items.map((item) => {
                    const id = `${uid}-${item.productId}`
                    const out = item.stock != null && item.stock <= 0
                    const ok = item.available && !out
                    const checked = ok && selection.has(item.productId)
                    return (
                      <li key={item.productId}>
                        <label
                          htmlFor={id}
                          className={clsx(
                            'flex items-center gap-3 py-3 text-sm',
                            ok ? 'cursor-pointer' : 'cursor-not-allowed opacity-55',
                          )}
                        >
                          <input
                            id={id}
                            type="checkbox"
                            className="peer sr-only"
                            checked={checked}
                            disabled={!ok}
                            onChange={() => toggle(item.productId)}
                          />
                          <span
                            aria-hidden="true"
                            className={clsx(
                              'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2',
                              checked
                                ? 'border-ink bg-ink text-paper'
                                : 'border-line-strong',
                            )}
                          >
                            {checked && <Check size={13} />}
                          </span>
                          <ProductImage
                            src={item.image}
                            alt=""
                            ratio="aspect-square"
                            className="w-10 shrink-0 rounded-lg"
                          />
                          <span className="min-w-0 flex-1 truncate text-ink">
                            {item.name || 'Unavailable product'}
                          </span>
                          {ok ? (
                            <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
                              {item.sellingPrice != null && item.sellingPrice > item.price && (
                                <span className="text-xs text-muted line-through">
                                  {formatInr(item.sellingPrice)}
                                </span>
                              )}
                              <span className="font-medium text-ink">
                                {formatInr(item.price)}
                              </span>
                            </span>
                          ) : (
                            <span className="shrink-0 text-[0.65rem] uppercase tracking-[0.12em] text-muted">
                              {out ? 'Out of stock' : 'Unavailable'}
                            </span>
                          )}
                        </label>
                      </li>
                    )
                  })}
                </ul>
              </div>

              {/* Combo information */}
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

              <div className="mt-9">
                {outOfStock ? (
                  <p role="alert" className="border-l-2 border-ink pl-3 text-sm text-ink">
                    Every product in this combo is out of stock right now. Ask the
                    studio and we’ll set one aside when it’s back.
                  </p>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-3">
                      <QuantityStepper
                        value={clampedQty}
                        max={Math.max(1, maxQty)}
                        onChange={(n) => {
                          setAdded(false)
                          setQuantity(clampQtyToStock(n, maxQty))
                        }}
                        disabled={empty}
                      />
                      <button
                        type="button"
                        className="btn btn-outline"
                        disabled={empty}
                        onClick={() => {
                          add(line())
                          setAdded(true)
                        }}
                      >
                        Add to cart
                      </button>
                      <button
                        type="button"
                        className="btn"
                        disabled={empty}
                        onClick={() => {
                          setBuyNow(line())
                          navigate('/checkout/now')
                        }}
                      >
                        Buy now
                        <ArrowRight size={15} aria-hidden="true" />
                      </button>
                    </div>
                    {empty ? (
                      <p role="status" className="mt-3 text-sm text-ink-soft">
                        Select at least one product to continue.
                      </p>
                    ) : (
                      chosenStocks.length > 0 && (
                        <p className="mt-3 text-sm text-ink-soft tabular-nums">
                          Only {Math.min(...chosenStocks)} of this selection available.
                        </p>
                      )
                    )}
                  </>
                )}
                {added && (
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <p role="status" className="text-sm text-ink-soft">
                      Added to your cart.{' '}
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
                <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
                  <Link
                    to={CONTACT}
                    state={{ product: combo.name }}
                    className="text-sm text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink"
                  >
                    Ask about this combo
                  </Link>
                  <BackLink />
                </div>
              </div>
            </div>
          </div>
        </Container>
      </div>
    </>
  )
}
