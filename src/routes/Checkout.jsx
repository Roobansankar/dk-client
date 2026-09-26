import { useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check } from 'lucide-react'
import clsx from 'clsx'
import Container from '../components/layout/Container'
import CartLines from '../components/shop/CartLines'
import CartTotals from '../components/shop/CartTotals'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useCartPricing } from '../hooks/useCartPricing'
import { api, ApiError } from '../lib/api'
import { loadRazorpayCheckout } from '../lib/razorpay'
import { formatInr } from '../data/services'
import Seo from '../components/Seo'

const FIELD =
  'mt-2 w-full rounded-sm border border-line-strong bg-paper px-3.5 py-2.5 text-ink transition-colors focus-visible:border-ink disabled:cursor-not-allowed disabled:text-muted'
const FIELD_ERROR = 'border-ink!'
const LABEL = 'eyebrow block'

/** The backend payload — ids, selections and quantities only, never prices. */
function toCheckoutItem(line) {
  return line.type === 'combo'
    ? {
        type: 'combo',
        combo_id: Number(line.comboId),
        product_ids: line.productIds.map(Number),
        quantity: line.quantity,
      }
    : { type: 'product', product_id: Number(line.productId), quantity: line.quantity }
}

/** Split Laravel's `items.N.field` errors onto the matching line keys. */
function splitErrors(err, lines) {
  const fields = err.fieldErrors()
  const byLine = {}
  const rest = {}
  for (const [key, message] of Object.entries(fields)) {
    const m = key.match(/^items\.(\d+)\./)
    if (m && lines[Number(m[1])]) byLine[lines[Number(m[1])].key] = message
    else rest[key] = message
  }
  return { byLine, rest }
}

/** Message for a failed POST /api/checkout (422s are handled by the caller). */
function checkoutErrorMessage(err) {
  if (!(err instanceof ApiError)) return err?.message || 'Something went wrong. Please try again.'
  if (err.status === 401) return 'Your session has expired. Please sign in again.'
  if (err.status === 403) return 'Orders can only be placed from a customer account.'
  if (err.status === 429) return 'Too many attempts. Please wait a minute and try again.'
  return err.message || 'We couldn’t start the payment. Please try again.'
}

/**
 * Checkout (/checkout for the cart, /checkout/now for a Buy Now selection).
 * Wrapped in RequireCustomer, so a guest is sent to sign in and returned here.
 *
 * 1. POST /api/checkout prices the lines server-side and opens a Razorpay
 *    order. Its response alone supplies the key, order id, amount, currency
 *    and prefill for Razorpay Checkout — the browser never sets the amount.
 * 2. On a successful payment, POST /api/checkout/{id}/verify checks the
 *    signature server-side and only then creates the order, which is shown
 *    as the confirmation. The cart / Buy Now selection is cleared only then.
 *
 * A dismissed or failed payment leaves everything in place to retry. An
 * unchanged retry reuses the checkout already opened (same Razorpay order);
 * a verification that fails for a network reason can be retried with the
 * same payment, so a customer is never asked to pay twice.
 */
export default function Checkout({ buyNowMode = false }) {
  const uid = useId()
  const { user } = useAuth()
  const cart = useCart()

  const source = buyNowMode ? (cart.buyNow ? [cart.buyNow] : []) : cart.lines
  const pricing = useCartPricing(source)
  const onQuantity = buyNowMode ? cart.setBuyNowQuantity : cart.setQuantity
  const onRemove = buyNowMode ? cart.clearBuyNow : cart.remove

  const [form, setForm] = useState(() => ({ name: user?.name || '', phone: user?.phone || '' }))
  const [fieldErrors, setFieldErrors] = useState({})
  const [lineErrors, setLineErrors] = useState({})
  const [formError, setFormError] = useState(null)
  // idle → starting (POST /checkout + script load) → paying (Razorpay open)
  // → verifying (POST /verify) → done
  const [phase, setPhase] = useState('idle')
  const [order, setOrder] = useState(null)
  // A successful payment whose verification couldn't be completed — retried
  // as-is, never by paying again.
  const [unverified, setUnverified] = useState(null)
  // The last server checkout and the exact payload it was opened for.
  const lastCheckout = useRef(null)

  const submitting = phase !== 'idle'

  const update = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }))
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev))
  }

  const changeQuantity = (key, n) => {
    setLineErrors((prev) => ({ ...prev, [key]: undefined }))
    onQuantity(key, n)
  }

  const verify = async (checkoutId, response) => {
    setPhase('verifying')
    setFormError(null)
    try {
      const { data } = await api.post(`/checkout/${checkoutId}/verify`, {
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
      })
      // Verified (201) or already verified earlier (200) — either way this
      // is the server's order. Only now is the selection cleared.
      setOrder(data)
      setUnverified(null)
      lastCheckout.current = null
      setPhase('done')
      if (buyNowMode) cart.clearBuyNow()
      else cart.clear()
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        // The server rejected this payment (signature / order mismatch):
        // no order exists. Start over with a fresh checkout.
        const f = err.fieldErrors()
        setFormError(
          f.razorpay_signature || f.razorpay_order_id || f.razorpay_payment_id || err.message,
        )
        setUnverified(null)
        lastCheckout.current = null
      } else {
        // Network / server trouble after a successful payment — keep the
        // payment details so it can be verified again without paying twice.
        setUnverified({ checkoutId, response })
        setFormError(
          err instanceof ApiError && err.status === 401
            ? 'Your session has expired. Sign in again, then retry the confirmation — you won’t be charged twice.'
            : 'Your payment went through, but we couldn’t confirm it just now. Please retry — you won’t be charged twice.',
        )
      }
      setPhase('idle')
    }
  }

  const openPayment = (Razorpay, checkout) => {
    setPhase('paying')
    const rzp = new Razorpay({
      key: checkout.key,
      order_id: checkout.order_id,
      amount: checkout.amount,
      currency: checkout.currency,
      name: checkout.name,
      description: checkout.description,
      prefill: checkout.prefill,
      theme: { color: '#1a1a1a' },
      modal: {
        ondismiss: () => {
          setFormError('Payment was cancelled. Your items are still here — you can try again.')
          setPhase('idle')
        },
      },
      handler: (response) => verify(checkout.checkout_id, response),
    })
    rzp.on('payment.failed', () => {
      setFormError('Payment failed. Your items are still here — you can try again.')
    })
    rzp.open()
  }

  const submit = async (event) => {
    event.preventDefault()
    if (submitting) return
    setFormError(null)
    setFieldErrors({})
    setLineErrors({})

    const errors = {}
    if (!form.name.trim()) errors.name = 'Please enter your name.'
    if (!form.phone.trim()) errors.phone = 'Please enter a phone number we can reach you on.'
    if (Object.keys(errors).length) {
      setFieldErrors(errors)
      return
    }

    const payload = {
      customer_name: form.name.trim(),
      phone: form.phone.trim(),
      items: source.map(toCheckoutItem),
    }
    const payloadKey = JSON.stringify(payload)

    setPhase('starting')
    let Razorpay
    let checkout
    try {
      Razorpay = await loadRazorpayCheckout()
      if (lastCheckout.current?.payloadKey === payloadKey) {
        checkout = lastCheckout.current.data
      } else {
        checkout = (await api.post('/checkout', payload)).data
        lastCheckout.current = { payloadKey, data: checkout }
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        const { byLine, rest } = splitErrors(err, source)
        setLineErrors(byLine)
        setFieldErrors({ name: rest.customer_name, phone: rest.phone })
        const other = rest.items || (Object.keys(byLine).length ? 'Please review the highlighted items.' : null)
        setFormError(other || (rest.customer_name || rest.phone ? null : err.message))
      } else {
        setFormError(checkoutErrorMessage(err))
      }
      setPhase('idle')
      return
    }

    openPayment(Razorpay, checkout)
  }

  const backTo = buyNowMode ? '/products' : '/cart'

  return (
    <>
      <Seo title="Checkout — DK StyleHub" noindex />

      <div className="texture-lines">
        <Container className="section-y">
          <Link
            to={backTo}
            className="text-eyebrow font-medium uppercase tracking-[0.14em] text-ink-soft no-underline hover:text-ink"
          >
            ← {buyNowMode ? 'Back to products' : 'Back to cart'}
          </Link>
          <h1 className="mt-6 font-serif leading-[1.05] text-ink text-[clamp(2rem,5vw,3.25rem)]">
            Checkout
          </h1>

          {order ? (
            <OrderConfirmation order={order} />
          ) : source.length === 0 ? (
            <div className="mt-8 max-w-md text-ink-soft">
              <p>{buyNowMode ? 'There’s nothing selected to buy.' : 'Your cart is empty.'}</p>
              <Link to="/products" className="btn mt-6 no-underline">
                Browse products
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="mt-10 grid gap-x-12 gap-y-10 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <h2 className="eyebrow">Your items</h2>
                <div className="mt-4">
                  <CartLines
                    lines={pricing.lines}
                    errors={lineErrors}
                    onQuantity={changeQuantity}
                    onRemove={onRemove}
                    disabled={submitting || Boolean(unverified)}
                  />
                </div>
              </div>

              <div className="lg:col-span-5">
                <div className="rounded-2xl border border-line bg-surface p-6 lg:sticky lg:top-28">
                  <h2 className="eyebrow">Your details</h2>
                  <div className="mt-5 grid gap-5">
                    <div>
                      <label htmlFor={`${uid}-name`} className={LABEL}>
                        Name
                      </label>
                      <input
                        id={`${uid}-name`}
                        className={clsx(FIELD, fieldErrors.name && FIELD_ERROR)}
                        value={form.name}
                        onChange={update('name')}
                        autoComplete="name"
                        aria-invalid={Boolean(fieldErrors.name)}
                        disabled={submitting || Boolean(unverified)}
                        required
                      />
                      {fieldErrors.name && <p className="mt-1.5 text-sm text-ink">{fieldErrors.name}</p>}
                    </div>
                    <div>
                      <label htmlFor={`${uid}-phone`} className={LABEL}>
                        Phone
                      </label>
                      <input
                        id={`${uid}-phone`}
                        type="tel"
                        inputMode="tel"
                        className={clsx(FIELD, fieldErrors.phone && FIELD_ERROR)}
                        value={form.phone}
                        onChange={update('phone')}
                        autoComplete="tel"
                        aria-invalid={Boolean(fieldErrors.phone)}
                        disabled={submitting || Boolean(unverified)}
                        required
                      />
                      {fieldErrors.phone ? (
                        <p className="mt-1.5 text-sm text-ink">{fieldErrors.phone}</p>
                      ) : (
                        <p className="mt-1.5 text-xs text-muted">
                          The studio calls this number to confirm your order.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 border-t border-line pt-5">
                    <CartTotals pricing={pricing} />
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted">
                    The amount you pay is calculated by the studio’s system and shown in
                    Razorpay’s secure checkout (Test Mode.
                  </p>

                  {pricing.hasUnavailable && (
                    <p role="alert" className="mt-4 border-l-2 border-ink pl-3 text-sm text-ink">
                      Remove the unavailable items to continue.
                    </p>
                  )}
                  {formError && (
                    <p role="alert" className="mt-4 border-l-2 border-ink pl-3 text-sm text-ink">
                      {formError}
                    </p>
                  )}

                  {unverified ? (
                    <button
                      type="button"
                      className="btn mt-6 w-full justify-center"
                      onClick={() => verify(unverified.checkoutId, unverified.response)}
                    >
                      Retry payment confirmation
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="btn mt-6 w-full justify-center"
                      disabled={submitting || pricing.hasUnavailable}
                      aria-busy={submitting}
                    >
                      {phase === 'starting'
                        ? 'Opening secure payment…'
                        : phase === 'paying'
                          ? 'Waiting for payment…'
                          : phase === 'verifying'
                            ? 'Confirming your payment…'
                            : 'Pay securely'}
                      {!submitting && <ArrowRight size={15} aria-hidden="true" />}
                    </button>
                  )}
                </div>
              </div>
            </form>
          )}
        </Container>
      </div>
    </>
  )
}

/** The verified order returned by POST /api/checkout/{id}/verify. */
function OrderConfirmation({ order }) {
  return (
    <div className="mt-10 max-w-2xl">
      <p className="eyebrow inline-flex items-center gap-2">
        <Check size={14} aria-hidden="true" /> Payment received
      </p>
      <h2 className="mt-3 font-serif text-2xl text-ink">Thank you — your order is placed.</h2>
      <p className="mt-2 text-sm text-ink-soft">
        Order <span className="font-medium text-ink">{order.order_number}</span>. The studio will
        call {order.phone} to confirm it.
      </p>

      <ul className="mt-6 divide-y divide-line border-y border-line">
        {order.items.map((item) => (
          <li key={item.id} className="py-4">
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-ink">
                {item.name}
                {item.quantity > 1 && <span className="text-ink-soft"> × {item.quantity}</span>}
              </p>
              <p className="shrink-0 tabular-nums text-ink">{formatInr(item.line_total)}</p>
            </div>
            {item.selected_products?.length > 0 && (
              <ul className="mt-1.5 space-y-0.5 text-sm text-ink-soft">
                {item.selected_products.map((p) => (
                  <li key={p.product_id ?? p.name} className="flex justify-between gap-3">
                    <span>{p.name}</span>
                    <span className="tabular-nums">{formatInr(p.price)}</span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-baseline justify-between gap-4">
        <span className="text-sm text-ink-soft">Amount paid</span>
        <span className="text-2xl font-medium tabular-nums text-ink">
          {formatInr(order.amount_paid ?? order.total)}
        </span>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link to={`/account/orders/${order.id}`} className="btn no-underline">
          View your order
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
        <Link to="/products" className="btn btn-outline no-underline">
          Continue shopping
        </Link>
      </div>
    </div>
  )
}
