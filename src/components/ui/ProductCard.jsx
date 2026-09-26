import { Link } from 'react-router-dom'
import clsx from 'clsx'
import ProductImage from './ProductImage'
import { formatInr } from '../../data/services'
import { taxLabel } from '../../lib/pricing'

/** Whole-number saving, e.g. 800 → 720 ⇒ 10. */
function discountPct(mrp, price) {
  if (!mrp || !price || mrp <= price) return 0
  return Math.round((1 - price / mrp) * 100)
}

// The photo zoom + parallax + light sweep are defined once in index.css under
// `.product-media` (shared with the homepage product showcase). Here we only
// wire up the card-level lift and the frame's elevation / hairline response.
const CARD_LIFT =
  'transition-transform duration-[550ms] ease-[var(--ease-standard)] will-change-transform hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0'

const IMAGE_FRAME =
  'rounded-2xl product-media shadow-[0_14px_30px_-20px_rgb(31_26_18/0.32)] transition-[box-shadow,border-color] duration-[550ms] ease-[var(--ease-standard)] group-hover:border-line-strong group-hover:shadow-[0_28px_52px_-24px_rgb(31_26_18/0.42)]'

const INFO_SHIFT =
  'transition-transform duration-[550ms] ease-[var(--ease-standard)] group-hover:translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0'

/**
 * One product in the /products collection grid — a compact, photographic card
 * modelled on design-references/product-page- card.png: a rounded product photo
 * with a discount pill, then category + rating, the name, and the selling price
 * against a struck-through MRP. The whole card is a single link to the detail
 * page — no cart, no nested interactives.
 *
 * Works with either data shape. Size variants are collapsed upstream
 * (`collapseFamilies`) into one card that shows a "From" price and the size
 * range; single products show their own price and any active discount.
 *
 * @param {{ product: object, className?: string }} props
 */
export default function ProductCard({ product, className }) {
  const { slug, name, category, image } = product
  const size = product.sizeLabel || product.size
  const family = product.variantCount > 1
  // The size lives in its own line / the range label, so keep it out of the name.
  const displayName = size
    ? name.replace(/\s*[—–-]\s*[\d.].*$/, '').trim() || name
    : name

  const price = family ? (product.priceFrom ?? product.price) : product.price
  const hasPrice = price != null
  const mrp = family ? null : product.mrp
  const onSale = hasPrice && mrp != null && mrp > price
  const pct = onSale ? discountPct(mrp, price) : 0

  return (
    <Link
      to={`/products/${slug}`}
      className={clsx('group flex h-full flex-col no-underline', CARD_LIFT, className)}
    >
      <div className="relative">
        <ProductImage
          src={image}
          alt={displayName}
          ratio="aspect-square"
          className={IMAGE_FRAME}
          imgClassName="will-change-transform"
        />
        {pct > 0 && (
          <span className="absolute left-3 top-3 rounded-full bg-[#23503a] px-2.5 py-1 text-[0.62rem] font-semibold tracking-wide text-white shadow-[0_2px_10px_rgb(0_0_0/0.25)]">
            {pct}% off
          </span>
        )}
      </div>

      <div className={clsx('flex flex-1 flex-col pt-3.5', INFO_SHIFT)}>
        <p className="truncate text-[0.8rem] text-muted">
          {category || ' '}
        </p>

        <h3 className="mt-1.5 line-clamp-2 font-serif text-[0.98rem] leading-snug text-ink transition-colors duration-200 group-hover:text-ink-soft">
          {displayName}
        </h3>

        {hasPrice ? (
          <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm tabular-nums">
            {family && (
              <span className="text-[0.6rem] uppercase tracking-[0.12em] text-muted">
                From
              </span>
            )}
            <span className="font-semibold text-accent">{formatInr(price)}</span>
            {onSale && (
              <span className="text-xs text-muted line-through">
                {formatInr(mrp)}
              </span>
            )}
          </p>
        ) : (
          <p className="mt-1.5 text-[0.7rem] uppercase tracking-[0.14em] text-muted">
            Priced in studio
          </p>
        )}

        {(family && size) || (hasPrice && taxLabel(product.taxPercent)) ? (
          <p className="mt-1 text-[0.64rem] uppercase tracking-[0.1em] text-muted">
            {[
              family && size ? size : null,
              hasPrice && taxLabel(product.taxPercent)
                ? `incl. ${taxLabel(product.taxPercent)}`
                : null,
            ]
              .filter(Boolean)
              .join('  ·  ')}
          </p>
        ) : null}
      </div>
    </Link>
  )
}
