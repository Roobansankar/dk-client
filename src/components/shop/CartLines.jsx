import { Link } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import ProductImage from '../ui/ProductImage'
import QuantityStepper from './QuantityStepper'
import { formatInr } from '../../data/services'

/**
 * Line list shared by the cart and checkout. `lines` come from
 * useCartPricing (display prices + availability). `errors` maps a line key
 * to a server validation message. Omit `onRemove` / `onQuantity` for a
 * read-only list.
 */
export default function CartLines({ lines, errors = {}, onQuantity, onRemove, disabled }) {
  return (
    <ul className="divide-y divide-line border-y border-line">
      {lines.map((line) => {
        const problem = errors[line.key] || line.unavailable
        return (
          <li key={line.key} className="flex gap-4 py-5">
            <ProductImage
              src={line.image}
              alt={line.name}
              ratio="aspect-square"
              className="w-20 shrink-0 rounded-xl sm:w-24"
            />

            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {line.type === 'combo' && (
                    <p className="text-[0.6rem] font-medium uppercase tracking-[0.18em] text-accent">
                      Combo
                    </p>
                  )}
                  {line.type === 'product' && line.slug ? (
                    <Link to={`/products/${line.slug}`} className="font-serif text-lg leading-snug text-ink no-underline hover:underline">
                      {line.name}
                    </Link>
                  ) : (
                    <p className="font-serif text-lg leading-snug text-ink">{line.name}</p>
                  )}
                </div>
                <p className="shrink-0 text-right text-sm font-medium tabular-nums text-ink">
                  {line.unitPrice != null ? formatInr(line.unitPrice * line.quantity) : '—'}
                </p>
              </div>

              {line.type === 'combo' && line.selected?.length > 0 && (
                <ul className="mt-2 space-y-1 text-sm text-ink-soft">
                  {line.selected.map((item) => (
                    <li key={item.productId} className="flex justify-between gap-3">
                      <span className="truncate">{item.name || 'Unavailable product'}</span>
                      {item.name && item.available && (
                        <span className="shrink-0 tabular-nums">{formatInr(item.price)}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {line.unitPrice != null && (line.quantity > 1 || line.unitTax > 0) && (
                <p className="mt-1 text-xs text-muted tabular-nums">
                  {[
                    line.quantity > 1 && `${formatInr(line.unitPrice)} each`,
                    line.unitTax > 0 &&
                      `incl. ${formatInr(line.unitTax * line.quantity)} tax`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              )}

              {problem && (
                <p role="alert" className="mt-2 border-l-2 border-ink pl-3 text-sm text-ink">
                  {problem}
                </p>
              )}

              <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                {onQuantity ? (
                  <QuantityStepper
                    value={line.quantity}
                    onChange={(n) => onQuantity(line.key, n)}
                    disabled={disabled}
                  />
                ) : (
                  <span className="text-sm text-ink-soft tabular-nums">Qty {line.quantity}</span>
                )}
                {onRemove && (
                  <button
                    type="button"
                    onClick={() => onRemove(line.key)}
                    disabled={disabled}
                    className="btn-ghost inline-flex items-center gap-1.5 rounded px-2 py-1 text-sm text-ink-soft hover:text-ink"
                  >
                    <Trash2 size={14} aria-hidden="true" />
                    Remove
                  </button>
                )}
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
