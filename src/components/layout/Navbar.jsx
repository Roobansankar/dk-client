import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ArrowRight, ChevronDown, Handbag, Menu, Search, X } from 'lucide-react'
import clsx from 'clsx'
import Container from './Container'
import ThemeToggle from '../ThemeToggle'
import AccountMenu from './AccountMenu'
import SearchOverlay from './SearchOverlay'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { scrollTopInstant } from '../../lib/scroll'
import logoDark from '../../assets/images/Black-logo-384.webp'
import logoLight from '../../assets/images/White-logo-384.webp'

/**
 * Primary navigation.
 *
 * Services is a dropdown containing Men/Women routes.
 * Products, Gallery, About and Contact are dedicated routes.
 */
const NAV_ITEMS = [
  { label: 'Services', kind: 'dropdown' },
  { label: 'Products', kind: 'route', to: '/products' },
  { label: 'Gallery', kind: 'route', to: '/gallery' },
  { label: 'About', kind: 'route', to: '/about' },
  { label: 'Contact', kind: 'route', to: '/contact' },
]

const SERVICE_GENDER_ITEMS = [
  { label: 'Men', to: '/services/men' },
  { label: 'Women', to: '/services/women' },
]

const BOOKING = '/booking'

export default function Navbar() {
  const location = useLocation()

  const { status: authStatus, user } = useAuth()
  const { count: cartCount } = useCart()
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [servicesOpen, setServicesOpen] = useState(false)
  const toggleRef = useRef(null)
  const panelRef = useRef(null)

  const openSearch = () => {
    setMenuOpen(false)
    setServicesOpen(false)
    setSearchOpen(true)
  }

  // Logo → home must feel instant from a scrolled page like /products.
  // Cross-route: jump now (synchronously on click) so the old scrolled
  // position never lingers; RootLayout re-asserts top after render.
  // Same-route (already on /): the router renders nothing, so this manual
  // jump is the ONLY scroll-to-top — without it the click looks dead.
  const handleLogoClick = () => {
    setMenuOpen(false)
    setServicesOpen(false)
    scrollTopInstant()
  }

  // Close the drawer and Services dropdown on navigation.
  const [lastLocationKey, setLastLocationKey] = useState(location.key)

  if (location.key !== lastLocationKey) {
    setLastLocationKey(location.key)

    if (menuOpen) setMenuOpen(false)
    if (servicesOpen) setServicesOpen(false)
  }

  // Drawer: focus management, focus trap, Escape, scroll lock.
  useEffect(() => {
    if (!menuOpen) return

    const panel = panelRef.current
    const toggle = toggleRef.current
    const previouslyFocused = document.activeElement

    const getFocusable = () =>
      Array.from(
        panel.querySelectorAll(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      )

    getFocusable()[0]?.focus()

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setServicesOpen(false)
        setMenuOpen(false)
        return
      }

      if (event.key !== 'Tab') return

      const items = getFocusable()

      if (items.length === 0) return

      const first = items[0]
      const last = items[items.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow

      const target =
        previouslyFocused instanceof HTMLElement ? previouslyFocused : toggle

      target?.focus()
    }
  }, [menuOpen])

  const linkBase =
    'text-eyebrow font-semibold uppercase tracking-[0.14em] no-underline transition-colors'

  const linkTone = 'text-ink-soft hover:text-ink'

  const activeTone = 'font-bold text-ink'

  return (
    // Solid theme surface below `lg` (mobile + tablet). From `lg` up (where the
    // nav links replace the hamburger) it's ~50% transparent with a soft glass
    // blur, falling back to solid where backdrop-filter is unsupported.
    <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-surface transition-colors duration-200 lg:supports-[backdrop-filter]:bg-surface/50 lg:supports-[backdrop-filter]:backdrop-blur-md">
      <Container className="flex h-14 items-center justify-between gap-4 md:h-20">
<Link
  to="/"
  aria-label="DK StyleHub"
  onClick={handleLogoClick}
  // Hidden behind the open mobile drawer, which shows its own logo.
  className={clsx('flex shrink-0 items-center', menuOpen && 'max-lg:invisible')}
>
  {/* Black logo on the light theme, white on the dark theme. */}
  <img
    src={logoDark}
    alt="DK StyleHub"
    width={384}
    height={256}
    className="h-8 w-auto object-contain md:h-10 dark:hidden"
  />
  <img
    src={logoLight}
    alt="DK StyleHub"
    width={384}
    height={256}
    className="hidden h-8 w-auto object-contain md:h-10 dark:block"
  />
</Link>

        {/* Desktop navigation */}
        <nav
          aria-label="Primary"
          className="hidden items-center gap-6 lg:flex xl:gap-9"
        >
          {NAV_ITEMS.map((item) =>
            item.kind === 'dropdown' ? (
              <div
                key={item.label}
                className="relative"
                onMouseEnter={() => setServicesOpen(true)}
                onMouseLeave={() => setServicesOpen(false)}
              >
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={servicesOpen}
                  onClick={() => setServicesOpen((open) => !open)}
                  className={clsx(
                    linkBase,
                    linkTone,
                    'inline-flex items-center gap-1',
                  )}
                >
                  {item.label}

                  <ChevronDown
                    size={14}
                    aria-hidden="true"
                    className={clsx(
                      'transition-transform duration-200',
                      servicesOpen && 'rotate-180',
                    )}
                  />
                </button>

                {servicesOpen && (
                  <div
                    role="menu"
                    aria-label="Services"
                    className="absolute left-1/2 top-full z-50 w-48 -translate-x-1/2 pt-2"
                  >
                    <div className="rounded-lg border border-line bg-surface p-1.5 shadow-[0_12px_35px_rgb(0_0_0/0.12)]">
                    {SERVICE_GENDER_ITEMS.map((serviceItem) => (
                      <NavLink
                        key={serviceItem.to}
                        to={serviceItem.to}
                        role="menuitem"
                        onClick={() => setServicesOpen(false)}
                        className="block rounded-md px-4 py-3 text-sm no-underline text-ink-soft transition-colors hover:bg-surface-sunken hover:text-ink"
                      >
                        {serviceItem.label}
                      </NavLink>
                    ))}
                    </div>
                  </div>
                )}
              </div>
            ) : item.kind === 'route' ? (
              <NavLink
                key={item.label}
                to={item.to}
                className={({ isActive }) =>
                  clsx(linkBase, isActive ? activeTone : linkTone)
                }
              >
                {item.label}
              </NavLink>
            ) : (
              <Link
                key={item.label}
                to={{ pathname: '/', hash: item.hash }}
                className={clsx(linkBase, linkTone)}
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openSearch}
            aria-label="Search"
            title="Search"
            className="-mx-1 inline-flex h-10 w-10 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-surface-sunken hover:text-ink"
          >
            <Search size={18} aria-hidden="true" />
          </button>

          <Link
            to="/cart"
            aria-label={cartCount > 0 ? `Cart, ${cartCount} ${cartCount === 1 ? 'item' : 'items'}` : 'Cart'}
            title="Cart"
            className="relative -mx-1 inline-flex h-10 w-10 items-center justify-center rounded-full text-ink-soft no-underline transition-colors hover:bg-surface-sunken hover:text-ink"
          >
            <Handbag size={18} aria-hidden="true" />
            {cartCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute right-0.5 top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[0.6rem] font-semibold tabular-nums text-white [text-shadow:none]"
              >
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </Link>

          <ThemeToggle />

          <span className="hidden lg:inline-flex">
            <AccountMenu />
          </span>

          <Link
            to={BOOKING}
            className="btn hidden rounded-full btn-outline sm:inline-flex"
          >
            Book Appointment
            <ArrowRight size={16} aria-hidden="true" />
          </Link>

          <button
            ref={toggleRef}
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-inverse-surface text-inverse shadow-[0_2px_10px_rgb(0_0_0/0.25)] transition-opacity hover:opacity-90 lg:hidden"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={18} aria-hidden="true" />
          </button>
        </div>
      </Container>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            tabIndex={-1}
            className="drawer-backdrop absolute inset-0 h-full w-full cursor-default border-0 bg-ink/40 p-0"
            onClick={() => setMenuOpen(false)}
          />

          <div
            ref={panelRef}
            id="site-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            className="drawer-panel absolute inset-y-0 right-0 flex w-full max-w-xs flex-col bg-surface shadow-xl"
          >
            <div className="flex h-14 items-center justify-between px-6">
<Link
  to="/"
  aria-label="DK StyleHub"
  className="flex items-center"
  onClick={handleLogoClick}
>
  <img
    src={logoDark}
    alt="DK StyleHub"
    width={384}
    height={256}
    className="h-8 w-auto object-contain dark:hidden"
  />
  <img
    src={logoLight}
    alt="DK StyleHub"
    width={384}
    height={256}
    className="hidden h-8 w-auto object-contain dark:block"
  />
</Link>

              <button
                type="button"
                className="btn btn-ghost -mr-3"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <nav
              aria-label="Mobile"
              className="flex flex-col px-6 py-2"
            >
              {NAV_ITEMS.map((item) =>
                item.kind === 'dropdown' ? (
                  <div
                    key={item.label}
                    className="border-b border-line"
                  >
                    <button
                      type="button"
                      aria-haspopup="menu"
                      aria-expanded={servicesOpen}
                      onClick={() =>
                        setServicesOpen((open) => !open)
                      }
                      className="flex w-full items-center justify-between py-4 text-left text-sm uppercase tracking-[0.14em] text-ink"
                    >
                      <span>{item.label}</span>

                      <ChevronDown
                        size={16}
                        aria-hidden="true"
                        className={clsx(
                          'transition-transform duration-200',
                          servicesOpen && 'rotate-180',
                        )}
                      />
                    </button>

                    {servicesOpen && (
                      <div
                        role="menu"
                        aria-label="Services"
                        className="mb-3 rounded-lg border border-line bg-surface-sunken p-1"
                      >
                        {SERVICE_GENDER_ITEMS.map((serviceItem) => (
                          <NavLink
                            key={serviceItem.to}
                            to={serviceItem.to}
                            role="menuitem"
                            onClick={() => {
                              setServicesOpen(false)
                              setMenuOpen(false)
                            }}
                            className="block rounded-md px-4 py-3 text-sm no-underline text-ink transition-colors hover:bg-surface hover:text-ink"
                          >
                            {serviceItem.label}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                ) : item.kind === 'route' ? (
                  <NavLink
                    key={item.label}
                    to={item.to}
                    onClick={() => setMenuOpen(false)}
                    className="border-b border-line py-4 text-sm uppercase tracking-[0.14em] no-underline text-ink"
                  >
                    {item.label}
                  </NavLink>
                ) : (
                  <Link
                    key={item.label}
                    to={{ pathname: '/', hash: item.hash }}
                    onClick={() => setMenuOpen(false)}
                    className="border-b border-line py-4 text-sm uppercase tracking-[0.14em] no-underline text-ink"
                  >
                    {item.label}
                  </Link>
                ),
              )}
            </nav>

            <div className="mt-auto px-6 pb-8 pt-4">
              <div className="mb-3 flex items-center justify-between border-t border-line pt-4">
                <span className="text-sm text-ink-soft">Account</span>

                {authStatus === 'authed' ? (
                  <span className="flex items-center gap-2">
                    <Link
                      to="/account"
                      className="text-sm text-ink underline underline-offset-2"
                    >
                      {user?.name || 'My account'}
                    </Link>
                  </span>
                ) : (
                  <Link
                    to="/login"
                    className="btn btn-outline rounded-full no-underline"
                  >
                    Sign in
                  </Link>
                )}
              </div>

              <div className="mb-3 flex items-center justify-between border-t border-line pt-4">
                <span className="text-sm text-ink-soft">Theme</span>
                <ThemeToggle />
              </div>

              <Link
                to={BOOKING}
                className="btn w-full rounded-full"
              >
                Book Appointment
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      )}

      <SearchOverlay
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </header>
  )
}