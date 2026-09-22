import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import { initSmoothScroll, scrollToHash, scrollTopInstant } from '../lib/scroll'

/**
 * Application shell: fixed Navbar, routed page content, Footer.
 *
 * The Navbar is `fixed` (so the homepage hero can run full-bleed behind it),
 * therefore non-home routes get top padding to clear it. Also owns scroll
 * behaviour on navigation — a hash target smooth-scrolls into view, otherwise
 * the page jumps to the top INSTANTLY (no slow bottom-to-top sweep).
 * Wheel smoothness comes from Lenis (see lib/scroll.js), driven by GSAP.
 */
export default function RootLayout() {
  const { pathname, hash } = useLocation()
  const isHome = pathname === '/'

  useEffect(() => {
    initSmoothScroll()
  }, [])

  useEffect(() => {
    if (hash) {
      // Let the new page paint before measuring the target.
      requestAnimationFrame(() => scrollToHash(hash))
      return
    }
    scrollTopInstant()
  }, [pathname, hash])

  return (
    <div className="flex min-h-svh flex-col bg-paper">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:text-ink focus:shadow"
      >
        Skip to content
      </a>

      <Navbar />

      <main id="main" className={clsx('flex-1', !isHome && 'pt-16 md:pt-24')}>
        <Outlet />
      </main>

      <Footer />
    </div>
  )
}
