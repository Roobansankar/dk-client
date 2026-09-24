import { useId, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Check } from 'lucide-react'
import clsx from 'clsx'
import ProductImage from '../ui/ProductImage'
import QuantityStepper from './QuantityStepper'
import { useCart } from '../../context/CartContext'
import { comboLine } from '../../lib/cart'
import { formatInr } from '../../data/services'
import { comboBasePrice, taxLabel, withTax } from '../../lib/pricing'

/**
 * One combo product: its included products with their combo-specific
 * prices, a checkbox per product (any non-empty subset may be bought),
 * a quantity, the display subtotal, and Add to Cart / Buy Now.
 *
 * Pricing display (combo tax % is added on top, as at checkout):
 * - Complete set selected + bundle price configured → bundle price + tax.
 * - Proper subset selected → sum of selected combo-specific prices + tax.
 *
 * The displayed amount is informational only. The backend recalculates
 * the authoritative price at checkout.
 */
export default function ComboCard({ combo }) {
  const uid = useId()
  const navigate = useNavigate()
  const { add, setBuyNow } = useCart()

  const available = combo.items.filter((item) => item.available)

  const [selected, setSelected] = useState(
    () => new Set(available.map((i) => i.productId)),
  )

  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)

  const chosen = available.filter((item) =>
    selected.has(item.productId),
  )

  const allProductsSelected =
    chosen.length === combo.items.length && combo.items.length > 0
  const unit = withTax(comboBasePrice(combo, chosen), combo.taxPercent)
  const tax = taxLabel(combo.taxPercent)

  const empty = chosen.length === 0

  const toggle = (productId) => {
    setAdded(false)

    setSelected((prev) => {
      const next = new Set(prev)

      if (next.has(productId)) {
        next.delete(productId)
      } else {
        next.add(productId)
      }

      return next
    })
  }

  const line = () =>
    comboLine(
      combo,
      chosen.map((i) => i.productId),
      quantity,
    )

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

  return (
    <article className="flex h-full flex-col rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <div className="flex gap-4">
        <ProductImage
          src={combo.image}
          alt={combo.name}
          ratio="aspect-square"
          className="w-20 shrink-0 rounded-xl sm:w-24"
        />

        <div className="min-w-0">
          <p className="text-[0.62rem] font-medium uppercase tracking-[0.18em] text-accent">
            Combo
          </p>

          <h3 className="mt-1 font-serif text-xl leading-snug text-ink">
            {combo.name}
          </h3>

          {combo.description && (
            <p className="mt-1.5 line-clamp-3 text-sm text-ink-soft">
              {combo.description}
            </p>
          )}
        </div>
      </div>

      <fieldset className="mt-5 border-t border-line pt-4">
        <legend className="sr-only">
          Choose products from {combo.name}
        </legend>

        <p className="text-[0.62rem] font-medium uppercase tracking-[0.16em] text-muted">
          Choose any products
        </p>

        <ul className="mt-2 divide-y divide-line">
          {combo.items.map((item) => {
            const id = `${uid}-${item.productId}`
            const checked =
              item.available && selected.has(item.productId)

            return (
              <li key={item.productId}>
                <label
                  htmlFor={id}
                  className={clsx(
                    'flex items-center gap-3 py-2.5 text-sm',
                    item.available
                      ? 'cursor-pointer'
                      : 'cursor-not-allowed opacity-55',
                  )}
                >
                  <input
                    id={id}
                    type="checkbox"
                    className="peer sr-only"
                    checked={checked}
                    disabled={!item.available}
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

                  <span className="min-w-0 flex-1 truncate text-ink">
                    {item.name}
                  </span>

                  {item.available ? (
                    <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
                      {item.sellingPrice != null &&
                        item.sellingPrice > item.price && (
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
                      Unavailable
                    </span>
                  )}
                </label>
              </li>
            )
          })}
        </ul>
      </fieldset>

      <div className="mt-auto pt-5">
        <div className="flex items-center justify-between gap-4 border-t border-line pt-4">
          <QuantityStepper
            value={quantity}
            onChange={(n) => {
              setAdded(false)
              setQuantity(Math.max(1, n))
            }}
            disabled={empty}
          />

          <div className="text-right">
            <p className="text-[0.62rem] uppercase tracking-[0.14em] text-muted">
              {chosen.length} selected ·{' '}
              {allProductsSelected && combo.bundlePrice != null
                ? 'Complete set'
                : 'Subtotal'}
            </p>

            <p className="text-lg font-medium tabular-nums text-ink">
              {formatInr(unit.total * quantity)}
            </p>

            {tax && !empty && (
              <p className="mt-0.5 text-xs tabular-nums text-muted">
                {formatInr(unit.base * quantity)} + {tax}{' '}
                ({formatInr(unit.tax * quantity)})
              </p>
            )}

            {allProductsSelected && combo.bundlePrice != null && (
              <p className="mt-0.5 text-xs text-muted">
                Complete set price
              </p>
            )}
          </div>
        </div>

        {empty && (
          <p role="status" className="mt-3 text-sm text-ink-soft">
            Select at least one product to continue.
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            className="btn btn-outline flex-1"
            onClick={addToCart}
            disabled={empty}
          >
            Add to cart
          </button>

          <button
            type="button"
            className="btn flex-1"
            onClick={buyNow}
            disabled={empty}
          >
            Buy now
            <ArrowRight size={15} aria-hidden="true" />
          </button>
        </div>

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
    </article>
  )
}
