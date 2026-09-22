const SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js'

let loadPromise = null

/**
 * Lazily inject the Razorpay Checkout script (once) and resolve with the
 * `window.Razorpay` constructor. Safe to call repeatedly — later calls reuse
 * the same in-flight/finished load.
 */
export function loadRazorpayCheckout() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Razorpay Checkout is only available in the browser.'))
  }
  if (window.Razorpay) return Promise.resolve(window.Razorpay)

  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`)
      const script = existing || document.createElement('script')
      script.src = SCRIPT_SRC
      script.async = true
      script.addEventListener('load', () => resolve(window.Razorpay), { once: true })
      script.addEventListener(
        'error',
        () => {
          loadPromise = null
          reject(new Error('Could not load the payment window. Please try again.'))
        },
        { once: true },
      )
      if (!existing) document.body.appendChild(script)
    })
  }

  return loadPromise
}
