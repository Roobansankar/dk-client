import { useMemo } from 'react'
import { useProductCatalogue } from '../context/ProductsContext'
import { useCombos } from './useCombos'
import { comboBasePrice, withTax } from '../lib/pricing'

/**
 * Resolve cart/buy-now lines against the live public catalogue for DISPLAY:
 * current unit price, and whether the line can still be bought (product
 * inactive/removed, combo withdrawn, a selected combo product unavailable).
 *
 * Unit prices include tax, exactly as POST /api/checkout charges them:
 * - Product → selling price + product tax %.
 * - Combo, complete set + bundle price configured → bundle price + combo tax %.
 * - Combo, proper subset → sum of selected combo-specific prices + combo tax %.
 *
 * Each priced line also carries `unitBase` / `unitTax` (pre-tax and tax per
 * unit) so the summary can show subtotal, taxes and total separately.
 *
 * Nothing here is sent to the backend — POST /api/checkout prices every line
 * itself and rejects anything unavailable.
 *
 * While the catalogue is still loading, or couldn't be loaded, lines are
 * shown without a price and are NOT flagged unavailable; the server decides.
 */
export function useCartPricing(lines) {
  const products = useProductCatalogue()
  const { combos, loading: combosLoading, error: combosError } = useCombos()

  const loading = products.loading || combosLoading
  const productsKnown = !products.loading && !products.error
  const combosKnown = !combosLoading && !combosError

  return useMemo(() => {
    const priced = lines.map((line) => {
      if (line.type === 'product') {
        if (!productsKnown) {
          return {
            ...line,
            unitPrice: null,
            unavailable: null,
          }
        }

        const product = products.items.find(
          (p) => p.id === line.productId,
        )

        if (!product || product.sellingPrice == null) {
          return {
            ...line,
            unitPrice: null,
            unavailable: 'This product is no longer available.',
          }
        }

        const unit = withTax(product.sellingPrice, product.taxPercent)

        return {
          ...line,
          name: product.name,
          image: product.image ?? line.image,
          unitPrice: unit.total,
          unitBase: unit.base,
          unitTax: unit.tax,
          unavailable: null,
        }
      }

      if (!combosKnown) {
        return {
          ...line,
          unitPrice: null,
          selected: [],
          unavailable: null,
        }
      }

      const combo = combos.find((c) => c.id === line.comboId)

      if (!combo) {
        return {
          ...line,
          unitPrice: null,
          selected: [],
          unavailable: 'This combo is no longer available.',
        }
      }

      const selected = line.productIds.map(
        (id) =>
          combo.items.find((item) => item.productId === id) || {
            productId: id,
            name: null,
          },
      )

      const broken = selected.some(
        (item) => !item.name || !item.available,
      )

      if (line.productIds.length === 0) {
        return {
          ...line,
          unitPrice: null,
          selected,
          unavailable:
            'Select at least one product from the combo.',
        }
      }

      const unit = withTax(comboBasePrice(combo, selected), combo.taxPercent)

      return {
        ...line,
        name: combo.name,
        image: combo.image ?? line.image,
        selected,
        unitPrice: broken ? null : unit.total,
        unitBase: broken ? null : unit.base,
        unitTax: broken ? null : unit.tax,
        unavailable: broken
          ? 'One or more selected products are no longer available.'
          : null,
      }
    })

    const allPriced = priced.every((l) => l.unitPrice != null)

    const sum = (key) =>
      allPriced
        ? Math.round(
            priced.reduce((acc, l) => acc + l[key] * 100 * l.quantity, 0),
          ) / 100
        : null

    // `subtotal` is the tax-inclusive amount charged at checkout (kept under
    // this name for existing callers); `baseSubtotal` + `taxTotal` break it down.
    const subtotal = sum('unitPrice')

    return {
      lines: priced,
      subtotal,
      baseSubtotal: sum('unitBase'),
      taxTotal: sum('unitTax'),
      loading,
      hasUnavailable: priced.some((l) => l.unavailable),
    }
  }, [
    lines,
    products.items,
    productsKnown,
    combos,
    combosKnown,
    loading,
  ])
}