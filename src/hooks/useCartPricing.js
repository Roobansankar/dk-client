import { useMemo } from 'react'
import { useProductCatalogue } from '../context/ProductsContext'
import { useCombos } from './useCombos'
import { comboBasePrice, taxIncluded } from '../lib/pricing'

/**
 * Resolve cart/buy-now lines against the live public catalogue for DISPLAY:
 * current unit price, and whether the line can still be bought (product
 * inactive/removed, combo withdrawn, a selected combo product unavailable).
 *
 * Unit prices include tax, exactly as POST /api/checkout charges them:
 * - Product → the selling price; its tax % is already inside it (nothing added).
 * - Combo, complete set + bundle price configured → the bundle price.
 * - Combo, proper subset → the sum of the selected combo-specific prices.
 *   (A combo's tax % is likewise already inside those prices.)
 *
 * Each priced line also carries `unitBase` / `unitTax` (the tax-free part and
 * the tax part of the unit price) so the summary can say how much tax the
 * total includes.
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

        // Stock enforcement (display-level; the server re-checks at checkout
        // and again atomically after payment).
        const stock = product.stock
        if (stock != null && stock <= 0) {
          return {
            ...line,
            name: product.name,
            image: product.image ?? line.image,
            unitPrice: null,
            stock: 0,
            unavailable: 'This product is out of stock.',
          }
        }
        if (stock != null && line.quantity > stock) {
          const unitOver = taxIncluded(product.sellingPrice, product.taxPercent)
          return {
            ...line,
            name: product.name,
            image: product.image ?? line.image,
            unitPrice: unitOver.total,
            unitBase: unitOver.base,
            unitTax: unitOver.tax,
            stock,
            unavailable: `Only ${stock} available — lower the quantity to continue.`,
          }
        }

        const unit = taxIncluded(product.sellingPrice, product.taxPercent)

        return {
          ...line,
          name: product.name,
          image: product.image ?? line.image,
          unitPrice: unit.total,
          unitBase: unit.base,
          unitTax: unit.tax,
          stock: stock ?? null,
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

      const unit = taxIncluded(comboBasePrice(combo, selected), combo.taxPercent)

      // Every selected product consumes `quantity` units — the scarcest one caps it.
      const knownStocks = selected
        .map((item) => item.stock)
        .filter((s) => s != null)
      const minStock = knownStocks.length ? Math.min(...knownStocks) : null
      const outOfStockItem = selected.find((item) => item.stock != null && item.stock <= 0)
      if (outOfStockItem) {
        return {
          ...line,
          name: combo.name,
          image: combo.image ?? line.image,
          selected,
          unitPrice: null,
          stock: 0,
          unavailable: `“${outOfStockItem.name || 'A selected product'}” is out of stock.`,
        }
      }
      if (minStock != null && line.quantity > minStock) {
        return {
          ...line,
          name: combo.name,
          image: combo.image ?? line.image,
          selected,
          unitPrice: unit.total,
          unitBase: unit.base,
          unitTax: unit.tax,
          stock: minStock,
          unavailable: `Only ${minStock} available — lower the quantity to continue.`,
        }
      }

      return {
        ...line,
        name: combo.name,
        image: combo.image ?? line.image,
        selected,
        unitPrice: broken ? null : unit.total,
        unitBase: broken ? null : unit.base,
        unitTax: broken ? null : unit.tax,
        stock: minStock,
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
    // this name for existing callers); `baseSubtotal` + `taxTotal` split it
    // into its tax-free part and the tax it includes.
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