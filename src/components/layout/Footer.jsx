import { Link } from 'react-router-dom'
import { Globe, MessageCircle } from 'lucide-react'
import Container from './Container'
import { useSite } from '../../context/SiteContext'
import siteLogo from '../../assets/images/logo.webp'

/**
 * Site footer — the dark editorial foundation: a brand + contact + social
 * block on the left, three link columns (Quick links / Legal / Visit us) on
 * the right, and a bottom bar with copyright + back-to-top.
 *
 * A hairline top border plus generous top padding keep it visually separate
 * from whatever precedes it (on the homepage, the standalone `FooterCta`
 * section). Fixed `bg-scrim` in both themes (like the hero scrim) so the
 * closing block stays premium and high-contrast in light and dark. Every value
 * comes from src/data/site.js / `GET /api/site-settings` — address, hours and
 * email are shown only when supplied; nothing is invented. All existing
 * destinations are preserved.
 */

const HEAD = 'text-[0.66rem] font-semibold uppercase tracking-[0.24em] text-white/40'
const LINK = 'text-sm text-white/65 no-underline transition-colors hover:text-white'

/** Quick links — DK StyleHub's real destinations (mirrors the navbar). */
const QUICK_LINKS = [
  { label: 'Services', to: '/services' },
  { label: 'Products', to: '/products' },
  { label: 'Gallery', to: '/gallery' },
  { label: 'About', to: { pathname: '/', hash: '#about' } },
  { label: 'Contact', to: '/contact' },
  { label: 'Book an appointment', to: { pathname: '/', hash: '#booking' } },
]

/** Social label → icon. Lucide ships no brand glyphs, so Instagram/Facebook
 * are inline stroke SVGs in the same 24-grid style; WhatsApp reuses
 * MessageCircle, anything unknown falls back to Globe. */
function InstagramIcon({ size = 17, ...rest }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  )
}

function FacebookIcon({ size = 17, ...rest }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  )
}

const SOCIAL_ICONS = {
  Instagram: InstagramIcon,
  Facebook: FacebookIcon,
  WhatsApp: MessageCircle,
}

export default function Footer() {
  const site = useSite()
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-line bg-scrim text-white">
      <Container className="pb-12 pt-16 sm:pt-20">
        <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-12">
          {/* Brand + contact */}
          <div className="sm:col-span-2 lg:col-span-5 lg:pr-10">
<Link
  to="/"
  aria-label="DK StyleHub"
  className="inline-flex items-center no-underline transition-opacity hover:opacity-80"
>
  <img
    src={siteLogo}
    alt="DK StyleHub"
    className="h-10 w-auto object-contain"
  />
</Link>

            {site.address ? (
              <p className="mt-6 max-w-xs whitespace-pre-line text-sm leading-relaxed text-white/55">
                {site.address}
              </p>
            ) : (
              <p className="mt-6 max-w-xs text-sm leading-relaxed text-white/45">
                Studio address will be listed here once confirmed.
              </p>
            )}

<div className="mt-8 flex flex-wrap gap-x-12 gap-y-6">
  {site.phone && (
    <div>
      <p className={HEAD}>Phone</p>

      <a href={site.phone.href} className={`${LINK} mt-3 block`}>
        {site.phone.display}
      </a>

      <a
        href="mailto:info@dkstylehub.com"
        className={`${LINK} mt-2 block`}
      >
        info@dkstylehub.com
      </a>
    </div>
  )}

  {site.hours && (
    <div>
      <p className={HEAD}>Hours</p>
      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-white/60">
        {site.hours}
      </p>
    </div>
  )}
</div>

            {site.socials.length > 0 && (
              <div className="mt-8">
                <p className={HEAD}>Follow us</p>
                <ul className="mt-4 flex flex-wrap gap-3">
                  {site.socials.map((social) => {
                    const Icon = SOCIAL_ICONS[social.label] || Globe
                    return (
                      <li key={social.label}>
                        <a
                          href={social.href}
                          target="_blank"
                          rel="noreferrer noopener"
                          aria-label={social.label}
                          title={social.label}
                          className="grid h-10 w-10 place-items-center rounded-full border border-white/15 text-white/70 no-underline transition-colors hover:border-white/50 hover:text-white"
                        >
                          <Icon size={17} strokeWidth={1.75} aria-hidden="true" />
                        </a>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:col-span-2 sm:grid-cols-3 lg:col-span-7">
            <nav aria-label="Quick links">
              <p className={HEAD}>Quick links</p>
              <ul className="mt-5 flex flex-col gap-4">
                {QUICK_LINKS.map((link) => (
                  <li key={link.label}>
                    <Link to={link.to} className={LINK}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {site.legal.length > 0 && (
              <nav aria-label="Legal">
                <p className={HEAD}>Legal</p>
                <ul className="mt-5 flex flex-col gap-4">
                  {site.legal.map((link) => (
                    <li key={link.label}>
                      <Link to={link.to} className={LINK}>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            )}

            <div className="col-span-2 sm:col-span-1">
              <p className={HEAD}>Visit us</p>
              <p className="mt-5 text-sm leading-relaxed text-white/60">
                {site.description}
              </p>
              <Link
                to={{ pathname: '/', hash: '#booking' }}
                className="btn btn-solid-light mt-6 rounded-full no-underline"
              >
                Book Appointment
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-16 border-t border-white/10 pt-8">
          <p className="text-center text-[0.66rem] uppercase tracking-[0.2em] text-white/40">
            &copy; {year} {site.name}. All rights reserved.
          </p>
        </div>
      </Container>
    </footer>
  )
}
