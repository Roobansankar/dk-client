import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import ProductImage from '../ui/ProductImage'
import { useCart } from '../../context/CartContext'
import { comboLine } from '../../lib/cart'
import { formatInr } from '../../data/services'
import { comboBasePrice, taxIncluded, taxLabel } from '../../lib/pricing'

/**
 * One combo product as a summary card: image, title, description, a read-only
 * list of what it includes, the price, and Add to Cart / Buy Now.
 *
 * The card never lets the customer pick individual products — it always buys
 * every currently available product in the combo, one unit. Choosing a subset
 * or a quantity happens on the combo detail page (/combos/:slug).
 *
 * Pricing display (the combo's tax % is already inside the price, as at checkout):
 * - Every product available + bundle price configured → the bundle price.
 * - Some products unavailable → the sum of the available combo-specific prices.
 *
 * The displayed amount is informational only. The backend recalculates
 * the authoritative price at checkout.
 */
export default function ComboCard({ combo }) {
  const navigate = useNavigate()
  const { add, setBuyNow } = useCart()
  const [added, setAdded] = useState(false)

  const isAvailable = (item) => item.available && !(item.stock != null && item.stock <= 0)
  const chosen = combo.items.filter(isAvailable)

  const completeSet =
    chosen.length === combo.items.length && combo.items.length > 0 && combo.bundlePrice != null
  const unit = taxIncluded(comboBasePrice(combo, chosen), combo.taxPercent)
  const tax = taxLabel(combo.taxPercent)

  const empty = chosen.length === 0

  const line = () => comboLine(combo, chosen.map((i) => i.productId), 1)

  const addToCart = () => {
    if (empty) return

    add(line())
    setAdded(true)
  }

  const buyNow = () => {
    if (empty) return

    setBuyNow(line())
    navigate('/checkout/now')
  }

  const image = (
    <ProductImage
      src={combo.image}
      alt={combo.name}
      ratio="aspect-[16/10]"
      className="rounded-[1.25rem] border-0"
      imgClassName="transition-transform duration-500 ease-out group-hover:scale-[1.03]"
    />
  )

  // Reference layout: a soft rounded card with the photo inset in its own
  // rounded frame and a frosted badge, then title → short description → what
  // it includes, and a price + Buy now + Add to cart footer row.
  return (
    <article className="group flex h-full w-full flex-col rounded-[1.75rem] border border-line bg-surface p-3 shadow-[0_18px_40px_-24px_rgb(0_0_0/0.28)] transition-shadow duration-300 hover:shadow-[0_24px_48px_-22px_rgb(0_0_0/0.34)]">
      <div className="relative">
        {combo.slug ? (
          <Link to={`/combos/${combo.slug}`} className="block no-underline" aria-label={`View ${combo.name}`}>
            {image}
          </Link>
        ) : (
          image
        )}

        <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-white/75 px-3 py-1 text-[0.6rem] font-medium uppercase tracking-[0.18em] text-[#201e1b] backdrop-blur-sm">
          Combo
        </span>
      </div>

      <div className="flex flex-1 flex-col px-2 pb-1 pt-3">
        <h3 className="font-serif text-xl leading-snug text-ink">
          {combo.slug ? (
            <Link
              to={`/combos/${combo.slug}`}
              className="no-underline transition-colors hover:text-accent"
            >
              {combo.name}
            </Link>
          ) : (
            combo.name
          )}
        </h3>

        {combo.description && (
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-soft">
            {combo.description}
          </p>
        )}

        {combo.items.length > 0 && (
          <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-xl bg-surface-sunken/60 px-3 py-2">
            <p className="text-[0.62rem] font-medium uppercase tracking-[0.16em] text-muted">
              Includes
            </p>
            <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-ink">
              {combo.items.map((item) => (
                <li key={item.productId} className={isAvailable(item) ? undefined : 'text-muted line-through'}>
                  {item.name}
                  {!isAvailable(item) && <span className="sr-only"> (currently unavailable)</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-auto pt-4">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-3 border-t border-line pt-3">
            <div className="mr-auto min-w-0">
              <p className="text-[0.62rem] uppercase tracking-[0.14em] text-muted">
                {completeSet ? 'Complete set' : 'Combo price'}
              </p>
              <p className="text-xl font-medium leading-tight tabular-nums text-ink">
                {empty ? '—' : formatInr(unit.total)}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn min-h-10 gap-1.5 rounded-full px-3.5"
                onClick={buyNow}
                disabled={empty}
              >
                Buy now
                <ArrowRight size={14} aria-hidden="true" />
              </button>

              <button
                type="button"
                className="btn btn-outline min-h-10 rounded-full px-3.5"
                onClick={addToCart}
                disabled={empty}
              >
                Add to cart
              </button>
            </div>
          </div>

          {((tax && !empty) || combo.slug) && (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              {tax && !empty ? (
                <p className="text-xs tabular-nums text-muted">
                  Incl. {tax} ({formatInr(unit.tax)})
                </p>
              ) : (
                <span />
              )}

              {combo.slug && (
                <Link
                  to={`/combos/${combo.slug}`}
                  className="inline-flex items-center gap-1 text-sm text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink"
                >
                  View combo details
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>
              )}
            </div>
          )}

          {empty && (
            <p role="status" className="mt-3 text-sm text-ink-soft">
              This combo is currently unavailable.
            </p>
          )}

          {added && (
            <p role="status" className="mt-3 text-sm text-ink-soft">
              Added to your cart.{' '}
              <Link
                to="/cart"
                className="text-ink underline underline-offset-4"
              >
                View cart
              </Link>
            </p>
          )}

        </div>
      </div>
    </article>
  )
}
