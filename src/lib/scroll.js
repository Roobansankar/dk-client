import Lenis from 'lenis'

let lenis = null

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Start Lenis smooth scroll with its own rAF loop (no GSAP — nothing else
 * used it, and it cost ~120KB of initial JS). No-op on re-call and skipped
 * entirely for reduced-motion users (native instant scrolling instead).
 * Returns the instance.
 */
export function initSmoothScroll() {
  if (lenis || typeof window === 'undefined' || prefersReducedMotion()) return lenis

  lenis = new Lenis({
    // Snappy but smooth: shorter duration + expo easing. (1.1+ feels floaty
    // and "slow" on this content-heavy page; 0.9 keeps the butter feel
    // without the lag behind the wheel.)
    duration: 0.9,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    autoRaf: true,
  })

  return lenis
}

/** The active Lenis instance (null when reduced-motion or not initialised). */
export function getLenis() {
  return lenis
}

/**
 * Jump to the very top immediately — used on route changes and logo clicks.
 * Does BOTH the Lenis jump and a native jump: Lenis keeps its own virtual
 * scroll position, so calling only one of the two leaves the other one
 * behind and the page visibly lingers / sweeps from the old position.
 */
export function scrollTopInstant() {
  if (lenis) {
    lenis.scrollTo(0, { immediate: true, force: true })
  }
  window.scrollTo(0, 0)
  if (typeof document !== 'undefined') {
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }
}

/**
 * Smooth-scroll to an in-page hash target, offset for the fixed navbar.
 * Falls back to native smooth scroll when Lenis is off.
 */
export function scrollToHash(hash) {
  const target = document.getElementById(hash.slice(1))
  if (!target) {
    scrollTopInstant()
    return
  }
  if (lenis) {
    lenis.scrollTo(target, { offset: -80, duration: 0.9 })
  } else if (prefersReducedMotion()) {
    target.scrollIntoView({ block: 'start' })
  } else {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

/**
 * No scroll animations use ScrollTrigger anymore (kept as a no-op so
 * existing callers don't break).
 */
export const ScrollTrigger = { refresh: () => {} }
