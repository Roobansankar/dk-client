import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

let lenis = null

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Start Lenis smooth scroll, driven by GSAP's ticker so ScrollTrigger stays
 * in sync. No-op on re-call and skipped entirely for reduced-motion users
 * (native instant scrolling is used instead). Returns the instance.
 */
export function initSmoothScroll() {
  if (lenis || typeof window === 'undefined' || prefersReducedMotion()) return lenis

  lenis = new Lenis({
    duration: 1.1,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  })

  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((time) => lenis.raf(time * 1000))
  gsap.ticker.lagSmoothing(0)

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
    lenis.scrollTo(target, { offset: -96, duration: 1.1 })
  } else if (prefersReducedMotion()) {
    target.scrollIntoView({ block: 'start' })
  } else {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

export { gsap, ScrollTrigger }
