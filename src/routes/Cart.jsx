import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import Container from '../components/layout/Container'
import CartLines from '../components/shop/CartLines'
import { useCart } from '../context/CartContext'
import { useCartPricing } from '../hooks/useCartPricing'
import CartTotals from '../components/shop/CartTotals'

/**
 * Cart (/cart): normal products and combo selections with quantities,
 * remove, a display subtotal and the way through to checkout. Prices are
 * the live catalogue prices for display; the backend prices the order.
 */
export default function Cart() {
  const navigate = useNavigate()
  const { lines, setQuantity, remove } = useCart()
  const pricing = useCartPricing(lines)

  return (
    <>
      <title>Your Cart — DK StyleHub</title>

      <div className="texture-lines">
        <Container className="section-y">
          <p className="eyebrow">Cart</p>
          <h1 className="mt-4 font-serif leading-[1.05] text-ink text-[clamp(2rem,5vw,3.25rem)]">
            Your cart
          </h1>

          {lines.length === 0 ? (
            <div className="mt-8 max-w-md text-ink-soft">
              <p>Your cart is empty.</p>
              <Link to="/products" className="btn mt-6 no-underline">
                Browse products
              </Link>
            </div>
          ) : (
            <div className="mt-10 grid gap-x-12 gap-y-10 lg:grid-cols-12">
              <div className="lg:col-span-8">
                <CartLines lines={pricing.lines} onQuantity={setQuantity} onRemove={remove} />
              </div>

              <aside className="lg:col-span-4">
                <div className="rounded-2xl border border-line bg-surface p-6 lg:sticky lg:top-28">
                  <CartTotals pricing={pricing} />
                  <p className="mt-2 text-xs leading-relaxed text-muted">
                    The final amount is confirmed at checkout.
                  </p>

                  {pricing.hasUnavailable && (
                    <p role="alert" className="mt-4 border-l-2 border-ink pl-3 text-sm text-ink">
                      Remove the unavailable items to continue.
                    </p>
                  )}

                  <button
                    type="button"
                    className="btn mt-6 w-full justify-center"
                    disabled={pricing.hasUnavailable}
                    onClick={() => navigate('/checkout')}
                  >
                    Checkout
                    <ArrowRight size={15} aria-hidden="true" />
                  </button>
                  <Link
                    to="/products"
                    className="mt-4 block text-center text-sm text-ink-soft underline underline-offset-4 hover:text-ink"
                  >
                    Continue shopping
                  </Link>
                </div>
              </aside>
            </div>
          )}
        </Container>
      </div>
    </>
  )
}
